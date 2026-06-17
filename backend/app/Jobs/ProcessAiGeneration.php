<?php

namespace App\Jobs;

use App\Models\Chat;
use App\Models\Conversation;
use App\Models\AiCache;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProcessAiGeneration implements ShouldQueue
{
    use Queueable;

    public int $timeout = 120;
    public int $tries   = 1;

    public function __construct(
        private readonly string $jobId,
        private readonly string $userId,
        private readonly string $conversationId,
        private readonly string $userInput,
        private readonly string $enrichedPrompt,
        private readonly string $systemPrompt,
        private readonly int    $maxTokens,
        private readonly string $requestedModel,
        private readonly bool   $isExplanation,
        private readonly ?string $boneName,
    ) {}

    public function handle(): void
    {
        try {
            // ── ÉTAPE 1 : Cloud HuggingFace ──────────────────────────────
            $cloudModels = $this->resolveCloudModels($this->requestedModel);

            if (!empty($cloudModels)) {
                $result = $this->callCloudApi($cloudModels);
                if ($result) {
                    $this->persist($result['output'], $result['model'], 'cloud_api', $result['token_index'] ?? null);
                    return;
                }
            }

            // ── ÉTAPE 2 : Ollama local ────────────────────────────────────
            $result = $this->callOllama();
            if ($result) {
                $this->persist($result['output'], $result['model'], 'local_ollama');
                return;
            }

            // ── ÉTAPE 3 : Fallback base de données ───────────────────────
            $fallback = $this->databaseFallback();
            if ($fallback) {
                $this->persist($fallback['output'], 'database_cache', 'emergency');
                return;
            }

            // Aucune source disponible
            $this->storeResult(['status' => 'error', 'message' => 'Toutes les sources IA sont indisponibles.']);

        } catch (\Throwable $e) {
            Log::error("[ProcessAiGeneration] Erreur job {$this->jobId}: " . $e->getMessage());
            $this->storeResult(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    // ── Persistance du résultat ────────────────────────────────────────────────

    private function persist(string $output, string $model, string $source, ?int $hfTokenIndex = null): void
    {
        $chat = Chat::create([
            'conversation_id' => $this->conversationId,
            'input'           => $this->userInput,
            'output'          => $output,
            'created_at'      => now(),
        ]);

        // Sauvegarde dans le cache IA
        try {
            $lang = str_contains($this->enrichedPrompt, 'Agis comme') ? 'fr' : 'en';
            AiCache::create([
                'question'   => mb_substr($this->enrichedPrompt, 0, 2000),
                'response'   => $output,
                'language'   => $lang,
                'use_count'  => 0,
                'ai_model'   => $model,
                'expires_at' => null,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning("[ProcessAiGeneration] Cache IA non sauvegardé: " . $e->getMessage());
        }

        $this->storeResult([
            'status'          => 'done',
            'chat_id'         => $chat->id,
            'conversation_id' => $this->conversationId,
            'model'           => $model,
            'source'          => $source,
            'response'        => $output,
            'hf_token_index'  => $hfTokenIndex,
        ]);

        Log::info("[ProcessAiGeneration] ✅ Job {$this->jobId} terminé — source={$source}, model={$model}");
    }

    private function storeResult(array $data): void
    {
        Cache::put("ai_job:{$this->jobId}", $data, now()->addHour());
    }

    // ── Appels IA (copiés de AiController) ────────────────────────────────────

    private function resolveCloudModels(string $requestedModel): array
    {
        $defaults = config('services.huggingface.cloud_models', []);
        $isOllama = str_contains($requestedModel, ':') || !str_contains($requestedModel, '/');
        $models   = $isOllama ? [] : [$requestedModel];
        return array_values(array_unique(array_merge($models, $defaults)));
    }

    private function callCloudApi(array $apiModels): ?array
    {
        $tokens  = config('services.huggingface.tokens', []);
        if (empty($tokens)) return null;

        $apiBase = config('services.huggingface.api_base');
        $timeout = $this->isExplanation ? 30 : 12;

        foreach ($apiModels as $apiModel) {
            foreach ($tokens as $idx => $token) {
                try {
                    $response = Http::withToken($token)
                        ->timeout($timeout)
                        ->post(rtrim($apiBase, '/') . '/chat/completions', [
                            'model'      => $apiModel,
                            'messages'   => [
                                ['role' => 'system', 'content' => $this->systemPrompt],
                                ['role' => 'user',   'content' => $this->enrichedPrompt],
                            ],
                            'max_tokens' => $this->maxTokens,
                        ]);

                    if (!$response->successful()) continue;

                    $output = $response->json('choices.0.message.content');
                    if (!$output) continue;

                    $output = trim(preg_replace('/^```json\s*|```$/m', '', $output));
                    return ['output' => $output, 'model' => $apiModel, 'token_index' => $idx + 1];
                } catch (\Throwable $e) {
                    Log::warning("[ProcessAiGeneration] Cloud API error ({$apiModel}): " . $e->getMessage());
                }
            }
        }
        return null;
    }

    private function callOllama(): ?array
    {
        $binary   = config('services.ollama.binary');
        $home     = config('services.ollama.home');
        $timeout  = $this->isExplanation ? 60 : 30;
        $fallbacks = config('services.ollama.fallback_models', ['phi3:latest', 'tinyllama:latest']);
        $isOllama  = str_contains($this->requestedModel, ':') || !str_contains($this->requestedModel, '/');
        $models    = $isOllama
            ? array_values(array_unique(array_merge([$this->requestedModel], $fallbacks)))
            : $fallbacks;

        $max   = config('services.ollama.max_prompt_chars', 2800);
        $body  = "Instructions système:\n{$this->systemPrompt}\n\n---\n\n{$this->enrichedPrompt}";
        $prompt = mb_strlen($body) <= $max ? $body : mb_substr($body, 0, $max) . "\n\n[tronqué]";

        foreach ($models as $model) {
            try {
                $process = new \Symfony\Component\Process\Process(
                    [$binary, 'run', $model, $prompt],
                    null,
                    ['HOME' => $home, 'PATH' => '/usr/bin:/bin:/usr/local/bin', 'TERM' => 'dumb', 'NO_COLOR' => '1']
                );
                $process->setTimeout($timeout);
                $process->run();
                if (!$process->isSuccessful()) continue;
                $output = trim(preg_replace('/\x1b(\[|\(|\))[;?0-9]*[0-9A-Za-z]/', '', $process->getOutput()));
                if ($output === '') continue;
                return ['output' => $output, 'model' => $model];
            } catch (\Throwable $e) {
                Log::warning("[ProcessAiGeneration] Ollama error ({$model}): " . $e->getMessage());
            }
        }
        return null;
    }

    private function databaseFallback(): ?array
    {
        try {
            $obj = $this->boneName
                ? \App\Models\AnatomicalObject::where(function($q) {
                    $q->where('name->fr', 'LIKE', '%' . $this->boneName . '%')
                      ->orWhere('name->en', 'LIKE', '%' . $this->boneName . '%');
                })->whereNotNull('description')->first()
                : null;

            if (!$obj) {
                $obj = \App\Models\AnatomicalObject::whereNotNull('description')
                    ->where('description', '!=', '')->inRandomOrder()->first();
            }

            if (!$obj) return null;

            $locale  = app()->getLocale();
            $name    = $obj->getName($locale);
            $desc    = mb_substr(strip_tags($obj->getDescription($locale)), 0, 900);
            $output  = $this->isExplanation
                ? "## {$name}\n\n{$desc}"
                : json_encode([[
                    'text'          => "Identifiez : {$name}",
                    'options'       => ['Vrai', 'Faux', 'N/A', 'Inutile'],
                    'correctAnswer' => 0,
                    'explanation'   => mb_substr($desc, 0, 200) . '...',
                ]]);

            return ['output' => $output];
        } catch (\Throwable $e) {
            return null;
        }
    }
}

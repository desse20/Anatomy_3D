<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\StoreChatRequest;
use App\Models\Chat;
use App\Models\Conversation;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiController extends Controller
{
    private const HF_PREFERRED_TOKEN_CACHE_KEY = 'hf_preferred_token_index';

    /** @return string[] */
    private function getHfTokens(): array
    {
        return config('services.huggingface.tokens', []);
    }

    /**
     * Ordre de tentative : dernier token OK en premier, puis les autres.
     * @return int[] indices dans le tableau de tokens
     */
    private function getHfTokenTryOrder(int $count): array
    {
        $order = range(0, max(0, $count - 1));
        if ($count === 0) {
            return [];
        }

        $preferred = Cache::get(self::HF_PREFERRED_TOKEN_CACHE_KEY);
        if ($preferred !== null) {
            $preferred = (int) $preferred;
        }
        if ($preferred === null || $preferred < 0 || $preferred >= $count) {
            return $order;
        }

        return array_merge(
            array_slice($order, $preferred),
            array_slice($order, 0, $preferred)
        );
    }

    private function rememberPreferredToken(int $index): void
    {
        $ttl = config('services.huggingface.token_cache_ttl', 300);
        Cache::put(self::HF_PREFERRED_TOKEN_CACHE_KEY, $index, $ttl);
    }

    private function forgetPreferredToken(): void
    {
        Cache::forget(self::HF_PREFERRED_TOKEN_CACHE_KEY);
    }

    /** Modèle local Ollama (ex. phi3:latest) — incompatible API Hugging Face */
    private function isOllamaModel(string $model): bool
    {
        if (str_contains($model, ':')) {
            return true;
        }
        // Les modèles HF router utilisent toujours org/nom
        return !str_contains($model, '/');
    }

    /** @return string[] */
    private function resolveCloudModels(string $requestedModel): array
    {
        $defaults = config('services.huggingface.cloud_models', []);
        $models = $this->isOllamaModel($requestedModel) ? [] : [$requestedModel];

        return array_values(array_unique(array_merge($models, $defaults)));
    }

    /** @return string[] */
    private function resolveOllamaModels(string $requestedModel): array
    {
        $fallbacks = config('services.ollama.fallback_models', ['phi3:latest', 'tinyllama:latest', 'llama3:latest']);
        if ($this->isOllamaModel($requestedModel)) {
            return array_values(array_unique(array_merge([$requestedModel], $fallbacks)));
        }

        return $fallbacks;
    }

    private function buildOllamaPrompt(string $systemPrompt, string $enrichedPrompt): string
    {
        $max = config('services.ollama.max_prompt_chars', 2800);
        $body = "Instructions système:\n{$systemPrompt}\n\n---\n\n{$enrichedPrompt}";
        if (mb_strlen($body) <= $max) {
            return $body;
        }

        return mb_substr($body, 0, $max) . "\n\n" . __('messages.ai.truncated_context');
    }

    /**
     * @return array{output: string, model: string}|null
     */
    private function callOllama(string $requestedModel, string $systemPrompt, string $enrichedPrompt, bool $isExplanation): ?array
    {
        $binary = config('services.ollama.binary');
        $home = config('services.ollama.home');
        $timeout = $isExplanation
            ? config('services.ollama.timeout_explain', 90)
            : config('services.ollama.timeout_quiz', 60);
        $prompt = $this->buildOllamaPrompt($systemPrompt, $enrichedPrompt);

        foreach ($this->resolveOllamaModels($requestedModel) as $localModel) {
            try {
                Log::info("🐢 OLLAMA — modèle {$localModel} (timeout {$timeout}s)");

                $process = new \Symfony\Component\Process\Process(
                    [$binary, 'run', $localModel, $prompt],
                    null,
                    [
                        'HOME' => $home,
                        'PATH' => '/usr/bin:/bin:/usr/local/bin',
                        'TERM' => 'dumb',
                        'NO_COLOR' => '1',
                    ]
                );
                $process->setTimeout($timeout);
                $process->run();

                if (!$process->isSuccessful()) {
                    Log::warning('❌ OLLAMA échec — modèle ' . $localModel . ': ' . trim($process->getErrorOutput() ?: $process->getOutput()));
                    continue;
                }

                $output = preg_replace('/\x1b(\[|\(|\))[;?0-9]*[0-9A-Za-z]/', '', $process->getOutput());
                $output = trim($output);
                if ($output === '') {
                    Log::warning("❌ OLLAMA réponse vide — modèle {$localModel}");
                    continue;
                }

                Log::info("✅ OLLAMA SUCCESS — modèle {$localModel}");

                return ['output' => $output, 'model' => $localModel];
            } catch (\Throwable $e) {
                Log::error("❌ OLLAMA ERROR — modèle {$localModel}: " . $e->getMessage());
            }
        }

        return null;
    }

    private function persistAndRespond(
        Conversation $conversation,
        string $userInput,
        string $output,
        string $model,
        string $source,
        ?int $hfTokenIndex = null
    ) {
        $chat = Chat::create([
            'conversation_id' => $conversation->id,
            'input'           => $userInput,
            'output'          => $output,
            'created_at'      => now(),
        ]);

        $payload = [
            'chat_id'         => $chat->id,
            'conversation_id' => $conversation->id,
            'model'           => $model,
            'source'          => $source,
            'response'        => $output,
        ];
        if ($hfTokenIndex !== null) {
            $payload['hf_token_index'] = $hfTokenIndex;
        }

        return response()->json($payload);
    }

    /**
     * Appelle l'API Hugging Face avec bascule automatique entre les tokens.
     * @return array{output: string, model: string, token_index: int}|null
     */
    private function callCloudApi(
        array $apiModels,
        string $systemPrompt,
        string $enrichedPrompt,
        int $maxTokens,
        bool $isExplanation
    ): ?array {
        $tokens = $this->getHfTokens();
        if (empty($tokens)) {
            Log::warning('⚠️ Aucun HF_TOKEN configuré (config/services.php → huggingface.tokens)');
            return null;
        }

        $apiBase = config('services.huggingface.api_base');
        $tryOrder = $this->getHfTokenTryOrder(count($tokens));
        $hadPreferred = Cache::has(self::HF_PREFERRED_TOKEN_CACHE_KEY);
        $timeout = $isExplanation ? 30 : 12;
        $saw402 = false;

        foreach ($apiModels as $apiModel) {
            foreach ($tryOrder as $tokenIndex) {
                $token = $tokens[$tokenIndex];
                try {
                    $label = ($tokenIndex + 1) . '/' . count($tokens);
                    if ($tryOrder[0] === $tokenIndex && $hadPreferred) {
                        $label .= ' (préféré en cache)';
                    }
                    Log::info("📡 CLOUD API — modèle {$apiModel}, token #{$label}");

                    $response = Http::withToken($token)
                        ->timeout($timeout)
                        ->post(rtrim($apiBase, '/') . '/chat/completions', [
                            'model' => $apiModel,
                            'messages' => [
                                ['role' => 'system', 'content' => $systemPrompt],
                                ['role' => 'user', 'content' => $enrichedPrompt],
                            ],
                            'max_tokens' => $maxTokens,
                        ]);

                    if (!$response->successful()) {
                        if ($response->status() === 402) {
                            $saw402 = true;
                        }
                        $body = mb_substr($response->body(), 0, 200);
                        Log::warning("❌ CLOUD API HTTP {$response->status()} — modèle {$apiModel}, token #" . ($tokenIndex + 1) . " — {$body}");
                        continue;
                    }

                    $output = $response->json('choices.0.message.content');
                    if (!$output) {
                        Log::warning("❌ CLOUD API réponse vide — modèle {$apiModel}, token #" . ($tokenIndex + 1));
                        continue;
                    }

                    $output = preg_replace('/^```json\s*|```$/m', '', $output);
                    $output = trim($output);

                    $this->rememberPreferredToken($tokenIndex);
                    Log::info("✅ CLOUD API SUCCESS — modèle {$apiModel}, token #" . ($tokenIndex + 1));

                    return [
                        'output'      => $output,
                        'model'       => $apiModel,
                        'token_index' => $tokenIndex + 1,
                    ];
                } catch (\Throwable $e) {
                    Log::error("❌ CLOUD API ERROR — modèle {$apiModel}, token #" . ($tokenIndex + 1) . ': ' . $e->getMessage());
                }
            }
        }

        if ($hadPreferred) {
            $this->forgetPreferredToken();
            Log::warning('⚠️ Token HF préféré invalidé — cache effacé');
        }

        if ($saw402) {
            Log::error('💳 Hugging Face : crédits mensuels épuisés sur au moins un compte (HTTP 402). Rechargez des crédits HF ou passez en PRO — bascule Ollama/DB.');
        }

        return null;
    }

    public function generate(StoreChatRequest $request)
    {
        $validated      = $request->validated();
        $requestedModel = $validated['model'] ?? 'deepseek-ai/DeepSeek-V4-Flash';
        $boneName       = $validated['bone'] ?? null;
        $isExplanation  = ($validated['type'] ?? '') === 'explain';
        $userInput      = $validated['input'];
        $conversationId = $validated['conversation_id'] ?? null;
        $studentId      = auth()->id();

        // --- Résoudre la conversation ---
        if ($conversationId) {
            $conversation = Conversation::where('id', $conversationId)
                ->where('user_id', $studentId)
                ->first();
        }
        // Si pas trouvée ou pas fournie, en créer une nouvelle
        if (empty($conversation)) {
            $conversation = Conversation::create([
                'user_id' => $studentId,
                'name'       => $boneName 
                    ? __('messages.conversation.bone_discussion', ['name' => $boneName]) 
                    : __('messages.conversation.default_name'),
            ]);
        }

        $context = $this->getAnatomyChunk($boneName);

        // --- Historique de la session depuis la DB ---
        $sessionHistory = '';
        if ($isExplanation) {
            $prevChats = Chat::where('conversation_id', $conversation->id)
                             ->orderBy('created_at', 'asc')
                             ->limit(10)
                             ->get(['input', 'output']);

            if ($prevChats->isNotEmpty()) {
                $lines = [];
                foreach ($prevChats as $c) {
                    $lines[] = "Étudiant: " . $c->input;
                    $lines[] = "Professeur: " . $c->output;
                }
                $sessionHistory = implode("\n\n", $lines);
            }
        }

        if ($isExplanation) {
            $historyBlock   = $sessionHistory ? "\n\nHistorique de la conversation:\n$sessionHistory" : '';
            $enrichedPrompt = "CONTEXTE ANATOMIQUE DE LA BASE DE DONNÉES:\n$context\n\nRequête de l'utilisateur: " . $userInput . $historyBlock;
            $systemPrompt   = __('messages.ai.system_prompt_expert');
            $maxTokens = 2000;
        } else {
            $history     = $this->getHistory();
            $historyList = count($history) > 0 ? implode('|', array_slice(array_reverse($history), 0, 5)) : 'None';

            $enrichedPrompt = "ANATOMY CONTEXT:\n$context\n" .
                              "AVOID REPEATING: $historyList\n\n" .
                              $userInput;
            $systemPrompt   = __('messages.ai.system_prompt_quiz');
            $maxTokens = 600;
        }

        Log::info("=== AI GENERATION REQUEST === type=" . ($isExplanation ? 'explain' : 'quiz') . " model={$requestedModel}");

        $cloudModels = $this->resolveCloudModels($requestedModel);

        // --- ÉTAPE 1 : CLOUD Hugging Face (en ligne, tous les tokens) ---
        if (!empty($cloudModels)) {
            $cloudResult = $this->callCloudApi($cloudModels, $systemPrompt, $enrichedPrompt, $maxTokens, $isExplanation);

            if ($cloudResult !== null) {
                return $this->persistAndRespond(
                    $conversation,
                    $userInput,
                    $cloudResult['output'],
                    $cloudResult['model'],
                    'cloud_api',
                    $cloudResult['token_index']
                );
            }

            Log::warning('⚠️ Cloud HF indisponible (402 = crédits épuisés, 401 = token invalide) — bascule Ollama');
        } else {
            Log::info('ℹ️ Aucun modèle cloud HF — bascule Ollama');
        }

        // --- ÉTAPE 2 : Ollama local ---
        $localResult = $this->callOllama($requestedModel, $systemPrompt, $enrichedPrompt, $isExplanation);
        if ($localResult !== null) {
            return $this->persistAndRespond(
                $conversation,
                $userInput,
                $localResult['output'],
                $localResult['model'],
                'local_ollama'
            );
        }

        Log::warning('⚠️ Ollama indisponible — bascule base de données');

        // --- ÉTAPE 3 : Base de données (secours) ---
        Log::warning("🚨 EMERGENCY FALLBACK TO DATABASE...");
        try {
            // Utiliser la base de données comme solution de secours
            $fallbackObj = null;
            if ($boneName) {
                $fallbackObj = \App\Models\AnatomicalObject::where('name', 'LIKE', '%' . $boneName . '%')
                    ->whereNotNull('description')->first();
            }
            if (!$fallbackObj) {
                $fallbackObj = \App\Models\AnatomicalObject::whereNotNull('description')
                    ->where('description', '!=', '')
                    ->inRandomOrder()
                    ->first();
            }

            if ($fallbackObj) {
                Log::info("💎 DATABASE FALLBACK SUCCESS: " . $fallbackObj->name);

                $desc = mb_substr(strip_tags($fallbackObj->description ?? ''), 0, 900);
                if ($isExplanation) {
                    $simulatedResponse = __('messages.ai.emergency_mode') . "\n\n"
                        . "## " . $fallbackObj->name . "\n\n"
                        . $desc . (strlen($fallbackObj->description ?? '') > 900 ? '…' : '');
                } else {
                    $simulatedResponse = json_encode([
                        [
                            "text" => __('messages.ai.offline_quiz_text', ['name' => $fallbackObj->name]),
                            "options" => ["Vrai", "Faux", "N/A", "Inutile"],
                            "correctAnswer" => 0,
                            "explanation" => mb_substr($fallbackObj->description, 0, 200) . "...",
                        ],
                    ]);
                }

                return $this->persistAndRespond(
                    $conversation,
                    $userInput,
                    $simulatedResponse,
                    'database_cache',
                    'emergency'
                );
            }
        } catch (\Throwable $e) { 
            Log::error("❌ DATABASE FALLBACK ERROR: " . $e->getMessage()); 
        }

        return response()->json(['error' => __('messages.ai.error_all_failed')], 500);
    }

    private function getAnatomyChunk($specificBone = null)
    {
        try {
            $item = null;

            // 1. Si on demande une notion précise, on cible sa description dans la DB !
            if ($specificBone) {
                $item = \App\Models\AnatomicalObject::where('name', 'LIKE', '%' . $specificBone . '%')
                        ->whereNotNull('description')
                        ->first();
            }

            // 2. Si aucune notion précise ou qu'elle n'a pas de description, on y va séquentiellement
            if (!$item) {
                $lastId = cache()->get('last_ai_anatomy_id', 0);
                $item = \App\Models\AnatomicalObject::where('id', '>', $lastId)
                            ->whereNotNull('description')
                            ->where('description', '!=', '')
                            ->orderBy('id', 'asc')
                            ->first();
                            
                if (!$item) {
                    $item = \App\Models\AnatomicalObject::whereNotNull('description')
                                ->where('description', '!=', '')
                                ->orderBy('id', 'asc')
                                ->first();
                }

                if ($item) {
                    cache()->put('last_ai_anatomy_id', $item->id);
                }
            }

            if (!$item) {
                return __('messages.ai.no_context');
            }

            $name = $item->name ?? 'Unknown';
            $desc = $item->description ?? '';
            // On envoie un bon bout de texte à l'IA
            $shortDesc = strlen($desc) > 500 ? substr($desc, 0, 500) . "..." : $desc;
            
            return "[$name]: $shortDesc\n";
        } catch (\Exception $e) {
            return "Error reading chunk: " . $e->getMessage();
        }
    }

    private function getHistory()
    {
        if (!auth()->check()) {
            return [];
        }

        // Anti-répétition pour le quiz : on lit les outputs des 10 derniers chats de l'étudiant
        $chats = Chat::whereHas('conversation', fn($q) => $q->where('user_id', auth()->id()))
                     ->orderBy('created_at', 'desc')
                     ->limit(10)
                     ->get(['output']);

        $history = [];
        foreach ($chats as $chat) {
            if ($chat->output) {
                preg_match_all('/"text":\s*"([^"]+)"/', $chat->output, $matches);
                if (!empty($matches[1])) {
                    $history = array_merge($history, $matches[1]);
                }
            }
        }

        return $history;
    }

    /**
     * Retourne l'historique des messages du student connecté.
     * ?group=<uuid> → filtre sur une session précise
     * ?limit=50     → nombre max de messages (défaut 50)
     */
    public function history(\Illuminate\Http\Request $request)
    {
        $query = Chat::where('user_id', auth()->id())
                     ->orderBy('created_at', 'asc');

        if ($request->filled('group')) {
            $query->where('group', $request->query('group'));
        }

        $limit = min((int) $request->query('limit', 50), 200);
        $chats = $query->limit($limit)->get(['id', 'group', 'input', 'output', 'created_at']);

        return response()->json(['data' => $chats]);
    }

    public function models()
    {
        try {
            // Lecture des modèles via la commande terminal `ollama list` au lieu de l'API HTTP
            $process = new \Symfony\Component\Process\Process(['/usr/local/bin/ollama', 'list']);
            $process->run();

            if (!$process->isSuccessful()) {
                throw new \Exception($process->getErrorOutput());
            }

            $output = $process->getOutput();
            $lines = explode("\n", trim($output));
            // Supprimer la première ligne (les en-têtes NAME ID SIZE MODIFIED)
            array_shift($lines);

            $formattedModels = [];
            foreach ($lines as $line) {
                $parts = preg_split('/\s+/', trim($line));
                if (count($parts) >= 1) {
                    $formattedModels[] = [
                        'name' => $parts[0]
                    ];
                }
            }

            return response()->json(['models' => $formattedModels]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Erreur commande 'ollama list': " . $e->getMessage());
            return response()->json(['models' => []]);
        }
    }
}

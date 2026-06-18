<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\StoreChatRequest;
use App\Models\Chat;
use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AiController extends Controller
{
    /**
     * POST /api/ai/generate
     * Lance la génération IA dans un processus système séparé pour ne pas bloquer le serveur.
     */
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
                ->where('user_id', $studentId)->first();
        }
        
        if (empty($conversation)) {
            $conversation = Conversation::create([
                'user_id' => $studentId,
                'name'    => $boneName
                    ? __('messages.conversation.bone_discussion', ['name' => $boneName])
                    : __('messages.conversation.default_name'),
            ]);
        }

        // --- Préparer les données IA ---
        $context = $this->getAnatomyChunk($boneName);
        $sessionHistory = '';
        if ($isExplanation) {
            $prevChats = Chat::where('conversation_id', $conversation->id)
                ->orderBy('created_at', 'asc')->limit(10)->get(['input', 'output']);
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
            $historyBlock   = $sessionHistory ? "\n\nHistorique:\n$sessionHistory" : '';
            $enrichedPrompt = "CONTEXTE ANATOMIQUE:\n$context\n\nRequête: $userInput" . $historyBlock;
            $systemPrompt   = __('messages.ai.system_prompt_expert');
            $maxTokens = 2000;
        } else {
            $history     = $this->getHistory();
            $historyList = count($history) > 0 ? implode('|', array_slice(array_reverse($history), 0, 5)) : 'None';
            $enrichedPrompt = "ANATOMY CONTEXT:\n$context\nAVOID REPEATING: $historyList\n\n$userInput";
            $systemPrompt   = __('messages.ai.system_prompt_quiz');
            $maxTokens = 600;
        }

        $jobId = (string) Str::uuid();

        // 1. Marquer comme "pending"
        Cache::put("ai_job:{$jobId}", ['status' => 'pending'], now()->addHour());

        // 2. Stocker les données temporaires pour la commande
        Cache::put("ai_job_payload:{$jobId}", [
            'userId'         => (string) $studentId,
            'conversationId' => (string) $conversation->id,
            'userInput'      => $userInput,
            'enrichedPrompt' => $enrichedPrompt,
            'systemPrompt'   => $systemPrompt,
            'maxTokens'      => (int) $maxTokens,
            'requestedModel' => $requestedModel,
            'isExplanation'  => (bool) $isExplanation,
            'boneName'       => $boneName,
        ], now()->addMinutes(10));

        // 3. LANCER LE PROCESSUS EN ARRIÈRE-PLAN (CLI)
        $artisan = base_path('artisan');
        // Utilisation de nohup pour être sûr que le processus survit à la fin de la requête PHP-FPM
        $command = "nohup php $artisan ai:process $jobId > /dev/null 2>&1 &";
        
        exec($command);
        
        Log::info("[AI] Processus CLI lancé via nohup → job_id={$jobId}");

        return response()->json([
            'job_id'          => $jobId,
            'conversation_id' => $conversation->id,
            'status'          => 'pending',
        ], 202);
    }

    /**
     * GET /api/ai/status/{jobId}
     */
    public function status(string $jobId)
    {
        $result = Cache::get("ai_job:{$jobId}");
        if (!$result) return response()->json(['status' => 'not_found'], 404);
        return response()->json($result);
    }

    /**
     * GET /api/ai/models
     */
    public function models()
    {
        try {
            $binary = config('services.ollama.binary', '/usr/local/bin/ollama');
            $process = new \Symfony\Component\Process\Process([$binary, 'list']);
            $process->run();
            if (!$process->isSuccessful()) return response()->json(['models' => []]);
            $lines = explode("\n", trim($process->getOutput()));
            array_shift($lines);
            $formatted = [];
            foreach ($lines as $line) {
                $parts = preg_split('/\s+/', trim($line));
                if (count($parts) >= 1 && !empty($parts[0])) $formatted[] = ['name' => $parts[0]];
            }
            return response()->json(['models' => $formatted]);
        } catch (\Throwable $e) { return response()->json(['models' => []]); }
    }

    private function getHistory(): array
    {
        if (!auth()->check()) return [];
        $chats = Chat::whereHas('conversation', fn($q) => $q->where('user_id', auth()->id()))
            ->orderBy('created_at', 'desc')->limit(10)->get(['output']);
        $history = [];
        foreach ($chats as $chat) {
            if ($chat->output) {
                preg_match_all('/"text":\s*"([^"]+)"/', $chat->output, $matches);
                if (!empty($matches[1])) $history = array_merge($history, $matches[1]);
            }
        }
        return $history;
    }

    private function getAnatomyChunk(?string $boneName): string
    {
        if (!$boneName) return "Général";
        $obj = \App\Models\AnatomicalObject::where(function($q) use ($boneName) {
            $q->where('name->fr', 'LIKE', "%{$boneName}%")->orWhere('name->en', 'LIKE', "%{$boneName}%");
        })->first();
        if ($obj) return "OBJET: " . $obj->getName('fr') . "\nDESCRIPTION: " . strip_tags($obj->getDescription('fr'));
        return "Objet: $boneName";
    }
}

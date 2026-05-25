<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\StoreChatRequest;
use App\Models\Chat;
use App\Models\Conversation;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AiController extends Controller
{
    private $hfToken;

    public function __construct()
    {
        $this->hfToken = env('HF_TOKEN', 'YOUR_TOKEN_HERE');
    }
    private $apiBase = 'https://router.huggingface.co/v1';

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
                ->where('student_id', $studentId)
                ->first();
        }
        // Si pas trouvée ou pas fournie, en créer une nouvelle
        if (empty($conversation)) {
            $conversation = Conversation::create([
                'student_id' => $studentId,
                'name'       => $boneName ? 'Discussion : ' . $boneName : 'Nouvelle discussion',
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
            $systemPrompt   = "Tu es un professeur d'anatomie expert. Utilise si possible le contexte fourni pour construire ton explication. Fournis des explications complètes et détaillées en markdown.";
            $maxTokens = 2000;
        } else {
            $history     = $this->getHistory();
            $historyList = count($history) > 0 ? implode('|', array_slice(array_reverse($history), 0, 5)) : 'None';

            $enrichedPrompt = "ANATOMY CONTEXT:\n$context\n" .
                              "AVOID REPEATING: $historyList\n\n" .
                              $userInput;
            $systemPrompt   = "Tu es un serveur de données JSON strict. INTERDICTION de parler. INTERDICTION d'ajouter des commentaires // ou des explications. Réponds UNIQUEMENT avec un tableau JSON [{}]. Structure: text, options(array), correctAnswer(int), explanation.";
            $maxTokens = 600;
        }

        Log::info("=== AI GENERATION REQUEST ===");

        // --- STEP 1: CLOUD API ---
        $apiModels = [$requestedModel, "deepseek-ai/DeepSeek-V4-Flash", "meta-llama/Llama-3.1-8B-Instruct"];
        $apiModels = array_unique($apiModels);

        foreach ($apiModels as $apiModel) {
            try {
                Log::info("📡 TRYING CLOUD API: $apiModel");
                $response = Http::withToken($this->hfToken)
                    ->timeout($isExplanation ? 30 : 12)
                    ->post($this->apiBase . '/chat/completions', [
                        'model' => $apiModel,
                        'messages' => [
                            ['role' => 'system', 'content' => $systemPrompt],
                            ['role' => 'user', 'content' => $enrichedPrompt]
                        ],
                        'max_tokens' => $maxTokens
                    ]);

                if ($response->successful()) {
                    $output = $response->json('choices.0.message.content');
                    if ($output) {
                        $output = preg_replace('/^```json\s*|```$/m', '', $output);
                        $output = trim($output);

                        Log::info("✅ CLOUD API SUCCESS: $apiModel");

                        // Persister dans la table chats
                        $chat = Chat::create([
                            'conversation_id' => $conversation->id,
                            'input'           => $userInput,
                            'output'          => $output,
                            'created_at'      => now(),
                        ]);

                        return response()->json([
                            'chat_id'         => $chat->id,
                            'conversation_id' => $conversation->id,
                            'model'           => $apiModel,
                            'source'          => 'cloud_api',
                            'response'        => $output,
                        ]);
                    }
                }
            } catch (\Throwable $e) {
                Log::error("❌ CLOUD API ERROR: " . $e->getMessage());
            }
        }

        // --- STEP 2: LOCAL OLLAMA ---
        Log::info("🐢 FALLING BACK TO OLLAMA...");
        foreach (['llama3:latest', 'tinyllama:latest'] as $localModel) {
            try {
                $process = new \Symfony\Component\Process\Process(
                    ['/usr/local/bin/ollama', 'run', $localModel, $enrichedPrompt],
                    null,
                    ['HOME' => '/home/bellox', 'PATH' => '/usr/bin:/bin:/usr/local/bin', 'TERM' => 'dumb', 'NO_COLOR' => '1']
                );
                $process->setTimeout(45);
                $process->run();

                if ($process->isSuccessful() && !empty(trim($process->getOutput()))) {
                    $output = preg_replace('/\x1b(\[|\(|\))[;?0-9]*[0-9A-Za-z]/', '', $process->getOutput());
                    Log::info("✅ OLLAMA SUCCESS: $localModel");

                    // Persister dans la table chats
                    $chat = Chat::create([
                        'conversation_id' => $conversation->id,
                        'input'           => $userInput,
                        'output'          => $output,
                        'created_at'      => now(),
                    ]);

                    return response()->json([
                        'chat_id'         => $chat->id,
                        'conversation_id' => $conversation->id,
                        'model'           => $localModel,
                        'source'          => 'local_ollama',
                        'response'        => $output,
                    ]);
                }
            } catch (\Throwable $e) {
                Log::error("❌ OLLAMA ERROR: " . $e->getMessage());
            }
        }

        // --- STEP 3: STATIC CACHE (DATABASE FALLBACK) ---
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
                
                $simulatedResponse = json_encode([
                    [
                        "text" => "Le système est actuellement hors-ligne. (Généré depuis la DB) Voici des informations sur : " . $fallbackObj->name . ". Est-ce correct ?",
                        "options" => ["Vrai", "Faux", "N/A", "Inutile"], 
                        "correctAnswer" => 0,
                        "explanation" => mb_substr($fallbackObj->description, 0, 200) . "..."
                    ]
                ]);
                return response()->json(['model' => 'database_cache', 'source' => 'emergency', 'response' => $simulatedResponse]);
            }
        } catch (\Throwable $e) { 
            Log::error("❌ DATABASE FALLBACK ERROR: " . $e->getMessage()); 
        }

        return response()->json(['error' => 'All AI systems failed.'], 500);
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
                return "No database anatomy context available.";
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
        $chats = Chat::whereHas('conversation', fn($q) => $q->where('student_id', auth()->id()))
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
        $query = Chat::where('student_id', auth()->id())
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

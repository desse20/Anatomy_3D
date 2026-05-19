<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class AiController extends Controller
{
    private $cacheFile = 'ai_quiz_history.json';
    private $anatomyFile = 'anatomy_hierarchy.json';
    private $localStaticFallbackFile = 'cache_questions.json';
    private $hfToken;

    public function __construct()
    {
        $this->hfToken = env('HF_TOKEN', 'YOUR_TOKEN_HERE');
    }
    private $apiBase = 'https://router.huggingface.co/v1';

    public function generate(Request $request)
    {
        $request->validate([
            'model' => 'nullable|string',
            'prompt' => 'required|string',
            'bone' => 'nullable|string',
            'type' => 'nullable|string'
        ]);

        $requestedModel = $request->model ?: 'deepseek-ai/DeepSeek-V4-Flash';
        $boneName = $request->bone;
        $isExplanation = $request->type === 'explain';

        $context = $this->getAnatomyChunk();
        
        if ($isExplanation) {
            $enrichedPrompt = $request->prompt;
            $systemPrompt = "Tu es un professeur d'anatomie expert. Fournis des explications complètes et détaillées en markdown.";
            $maxTokens = 2000;
        } else {
            $history = $this->getHistory();
            $historyList = count($history) > 0 ? implode("|", array_slice(array_reverse($history), 0, 5)) : "None";

            $enrichedPrompt = "ANATOMY CONTEXT:\n$context\n" . 
                              "AVOID REPEATING: $historyList\n\n" . 
                              $request->prompt;
            $systemPrompt = "Tu es un serveur de données JSON strict. INTERDICTION de parler. INTERDICTION d'ajouter des commentaires // ou des explications. Réponds UNIQUEMENT avec un tableau JSON [{}]. Structure: text, options(array), correctAnswer(int), explanation.";
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
                        // Nettoyage Markdown si l'IA en a mis quand même
                        $output = preg_replace('/^```json\s*|```$/m', '', $output);
                        $output = trim($output);
                        
                        Log::info("✅ CLOUD API SUCCESS: $apiModel");
                        $this->updateHistory($output);
                        return response()->json(['model' => $apiModel, 'source' => 'cloud_api', 'response' => $output]);
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
                    $this->updateHistory($output);
                    return response()->json(['model' => $localModel, 'source' => 'local_ollama', 'response' => $output]);
                }
            } catch (\Throwable $e) {
                Log::error("❌ OLLAMA ERROR: " . $e->getMessage());
            }
        }

        // --- STEP 3: STATIC CACHE ---
        Log::warning("🚨 EMERGENCY FALLBACK TO STATIC CACHE...");
        if (Storage::exists($this->localStaticFallbackFile)) {
            try {
                $staticData = json_decode(Storage::get($this->localStaticFallbackFile), true);
                $questionSet = ($boneName && isset($staticData[$boneName])) ? $staticData[$boneName] : $staticData[array_rand($staticData)];
                if ($questionSet) {
                    Log::info("💎 STATIC CACHE SUCCESS: " . ($questionSet['bone'] ?? 'Random'));
                    // Simulate RAW JSON ARRAY as expected by Quiz.tsx handleStart
                    $simulatedResponse = json_encode([
                        [
                            "text" => $questionSet['question'], 
                            "options" => ["Vrai", "Faux", "N/A", "Inutile"], 
                            "correctAnswer" => 0,
                            "explanation" => "Question de secours locale."
                        ]
                    ]);
                    return response()->json(['model' => 'static_cache', 'source' => 'emergency', 'response' => $simulatedResponse]);
                }
            } catch (\Throwable $e) { Log::error("❌ STATIC ERROR: " . $e->getMessage()); }
        }

        return response()->json(['error' => 'All AI systems failed.'], 500);
    }

    private function getAnatomyChunk()
    {
        $path = storage_path('app/' . $this->anatomyFile);
        if (!File::exists($path)) {
            return "No anatomical context available.";
        }

        try {
            $json = json_decode(File::get($path), true);
            if (!$json) return "Format error in anatomy file.";

            // Pick 1 random item (drastically reduced for CPU local performance)
            $randomKeys = array_rand($json, 1);
            if (!is_array($randomKeys)) $randomKeys = [$randomKeys];

            $chunk = "";
            foreach ($randomKeys as $key) {
                $item = $json[$key];
                $name = $item['name'] ?? 'Unknown';
                $desc = $item['description'] ?? '';
                // Take only first 150 chars to stay extremely fast
                $shortDesc = strlen($desc) > 150 ? substr($desc, 0, 150) . "..." : $desc;
                $chunk .= "[$name]: $shortDesc\n";
            }

            return $chunk;
        } catch (\Exception $e) {
            return "Error reading chunk: " . $e->getMessage();
        }
    }

    private function getHistory()
    {
        if (Storage::exists($this->cacheFile)) {
            return json_decode(Storage::get($this->cacheFile), true) ?? [];
        }
        return [];
    }

    private function updateHistory($aiResponse)
    {
        // Try to extract question texts from JSON response
        preg_match_all('/"text":\s*"([^"]+)"/', $aiResponse, $matches);
        
        if (!empty($matches[1])) {
            $history = $this->getHistory();
            $newHistory = array_merge($history, $matches[1]);
            
            // Keep only last 100 questions to avoid huge file
            if (count($newHistory) > 100) {
                $newHistory = array_slice($newHistory, -100);
            }
            
            Storage::put($this->cacheFile, json_encode($newHistory));
        }
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

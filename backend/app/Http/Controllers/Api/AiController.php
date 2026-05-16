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
    private $anatomyFile = '/home/bellox/Soutennance/Anatomy_3D/front_3D/public/z_anatomy_hierarchy_Copie.json';

    public function generate(Request $request)
    {
        $request->validate([
            'model' => 'required|string',
            'prompt' => 'required|string',
        ]);

        // 1. Get Chunking Context
        $context = $this->getAnatomyChunk();

        // 2. Get History (Avoid Repetitions)
        $history = $this->getHistory();
        $historyList = count($history) > 0 ? implode("|", array_slice(array_reverse($history), 0, 5)) : "None";

        // 3. Enrich Prompt
        $enrichedPrompt = "ANATOMY CONTEXT:\n$context\n" . 
                          "AVOID REPEATING: $historyList\n\n" . 
                          $request->prompt;

        // 4. Fallback Strategy
        // Limit to 2 models max to avoid overloading the local system's RAM/CPU
        $models = [$request->model, 'tinyllama:latest'];
        $models = array_unique($models); // Remove duplicates

        $lastError = "";
        foreach ($models as $model) {
            try {
                // EXÉCUTION DANS LE TERMINAL (via Symfony Process pour la robustesse et la stabilité)
                Log::info("=== AI TERMINAL EXECUTION STARTED ===");
                Log::info("MODEL: " . $model);

                // Utilisation du composant Process de Laravel/Symfony qui exécute proprement la commande bash sans bug de syntaxe
                // CRITIQUE : Ollama plante s'il ne connaît pas $HOME pour trouver ses modèles. Il faut injecter l'environnement manuellement.
                $process = new \Symfony\Component\Process\Process(
                    ['/usr/local/bin/ollama', 'run', $model, $enrichedPrompt],
                    null,
                    [
                        'HOME' => '/home/bellox', 
                        'PATH' => '/usr/bin:/bin:/usr/local/bin',
                        'TERM' => 'dumb',     // Demande à ollama de ne pas envoyer d'animations
                        'NO_COLOR' => '1',    // Désactive les couleurs dans la console
                        'OLLAMA_NOHISTORY' => '1'
                    ]
                );
                $process->setTimeout(600); // Laisse jusqu'à 10 minutes au terminal pour répondre
                $process->run();

                if (!$process->isSuccessful()) {
                    throw new \Exception($process->getErrorOutput());
                }

                $output = $process->getOutput();
                
                // CRITIQUE : Nettoyage drastique des codes de formatage Bash pour rendre le texte "Propre"
                // 1. Supprime les codes d'échappement (couleurs, curseurs, clear-line comme [K ou [3D)
                $output = preg_replace('/\x1b(\[|\(|\))[;?0-9]*[0-9A-Za-z]/', '', $output);
                $output = preg_replace('/\x1b/', '', $output);
                // 2. Supprimer les éventuelles séquences orphelines liées aux effacements de texte d'Ollama
                $output = preg_replace('/\[\d*[A-HJKSTfimn]/', '', $output);
                
                Log::info("RAW OLLAMA OUTPUT: " . ($output ?: "EMPTY"));

                if (!empty($output)) {
                    $this->updateHistory($output);
                    Log::info("=== AI BASH EXECUTION SUCCEEDED ===");
                    return response()->json([
                        'model' => $model,
                        'response' => $output
                    ]);
                }
                
                $lastError = "La commande bash n'a rien retourné pour $model.";
                Log::error("BASH ERROR: " . $lastError);
            } catch (\Throwable $e) {
                // Utilisation de \Throwable pour capturer ABSOLUMENT TOUTES les erreurs (Fatales incluses)
                $lastError = "Erreur Process Terminal sur $model: " . $e->getMessage();
                Log::error("PHP EXCEPTION/ERROR: " . $lastError);
            }
        }

        Log::error("ALL MODELS FAILED OR TIMED OUT.");

        return response()->json([
            'error' => 'All AI models failed or timed out.',
            'details' => $lastError
        ], 500);
    }

    private function getAnatomyChunk()
    {
        if (!File::exists($this->anatomyFile)) {
            return "No anatomical context available.";
        }

        try {
            $json = json_decode(File::get($this->anatomyFile), true);
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

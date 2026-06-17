<?php

namespace App\Console\Commands;

use App\Jobs\ProcessAiGeneration;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ProcessAiCommand extends Command
{
    /**
     * The name and signature of the console command.
     * @var string
     */
    protected $signature = 'ai:process {jobId}';

    /**
     * The console command description.
     * @var string
     */
    protected $description = 'Exécute manuellement une génération IA pour un jobId donné en arrière-plan.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $jobId = $this->argument('jobId');
        $jobData = Cache::get("ai_job_payload:{$jobId}");

        if (!$jobData) {
            Log::error("[AiCommand] Pas de données trouvées pour le job {$jobId}");
            return Command::FAILURE;
        }

        Log::info("[AiCommand] Démarrage du traitement pour le job {$jobId}");

        try {
            $job = new ProcessAiGeneration(
                $jobId,
                $jobData['userId'],
                $jobData['conversationId'],
                $jobData['userInput'],
                $jobData['enrichedPrompt'],
                $jobData['systemPrompt'],
                $jobData['maxTokens'],
                $jobData['requestedModel'],
                $jobData['isExplanation'],
                $jobData['boneName']
            );

            $job->handle();
            
            // Nettoyage temporaire des données de payload
            Cache::forget("ai_job_payload:{$jobId}");
            
            return Command::SUCCESS;
        } catch (\Throwable $e) {
            Log::error("[AiCommand] Erreur critique job {$jobId}: " . $e->getMessage());
            Cache::put("ai_job:{$jobId}", ['status' => 'error', 'message' => $e->getMessage()], now()->addHour());
            return Command::FAILURE;
        }
    }
}

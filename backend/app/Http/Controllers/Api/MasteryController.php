<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserMastery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MasteryController extends Controller
{
    /**
     * GET /api/mastery/stats
     * Retourne les stats de maîtrise de l'utilisateur connecté :
     * - notions les plus ratées (à travailler)
     * - notions les mieux maîtrisées
     * - score global
     */
    public function stats(Request $request)
    {
        $userId = $request->user()?->id;

        if (!$userId) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $masteries = UserMastery::where('user_id', $userId)
            ->with('anatomicalObject')
            ->get();

        if ($masteries->isEmpty()) {
            return response()->json([
                'has_data'               => false,
                'global_score'           => 0,
                'total_attempts'         => 0,
                'total_notions'          => 0,
                'not_started'            => [],
                'en_cours'               => [],
                'maitrisees'             => [],
                'totalement_maitrisees'  => [],
                'cultivees'              => [],
                'due_notions'            => [],
                'mastery_levels'         => [],
            ]);
        }

        $totalSuccess = $masteries->sum('success_count');
        $totalFailure = $masteries->sum('failure_count');
        $totalAttempts = $totalSuccess + $totalFailure;
        $globalScore = $totalAttempts > 0 ? round(($totalSuccess / $totalAttempts) * 100) : 0;

        $mapItem = fn($m) => [
            'name'               => $m->anatomicalObject->name ?? 'Inconnu',
            'success'            => $m->success_count,
            'failure'            => $m->failure_count,
            'mastery_level'      => $m->mastery_level,
            'last_review'        => $m->last_review_at?->diffForHumans(),
            'next_review'        => $m->next_review_at?->diffForHumans(),
            'next_review_ts'     => $m->next_review_at?->timestamp,
            'net_score'          => $m->success_count - $m->failure_count,
        ];

        $net = fn($m) => $m->success_count - $m->failure_count;

        // Jamais commencées (aucune tentative)
        $notStarted = $masteries
            ->filter(fn($m) => ($m->success_count + $m->failure_count) === 0)
            ->values()
            ->map($mapItem);

        // En cours : niveau 0 mais déjà commencé
        $enCours = $masteries
            ->filter(fn($m) => ($m->success_count + $m->failure_count) > 0 && $m->mastery_level === 0)
            ->sortByDesc('failure_count')
            ->values()
            ->map($mapItem);

        // Maîtrisées : niveau 1 à 4
        $maitrisees = $masteries
            ->filter(fn($m) => $m->mastery_level > 0 && $m->mastery_level < 5)
            ->sortByDesc('mastery_level')
            ->values()
            ->map($mapItem);

        // Totalement maîtrisées : niveau 5
        $totalementMaitrisees = $masteries
            ->filter(fn($m) => $m->mastery_level === 5)
            ->sortByDesc('success_count')
            ->values()
            ->map($mapItem);

        // Cultivées : niveau 5 ET peu d'échecs (≤ 2)
        $cultivees = $masteries
            ->filter(fn($m) => $m->mastery_level === 5 && $m->failure_count <= 2)
            ->sortByDesc('success_count')
            ->values()
            ->map($mapItem);

        // Distribution des niveaux
        $levelDistribution = $masteries
            ->groupBy('mastery_level')
            ->map(fn($group, $level) => [
                'level' => (int)$level,
                'count' => $group->count(),
            ])
            ->sortBy('level')
            ->values();

        // Notions avec une révision planifiée (passée ou future), triée par date
        $due = $masteries
            ->filter(fn($m) => $m->next_review_at !== null)
            ->sortBy('next_review_at')
            ->take(12)
            ->values()
            ->map($mapItem);

        // Calcul du radar (maîtrise par racines anatomiques)
        $radar = [];
        $roots = \App\Models\AnatomicalObject::where('id', 1)->first()
            ? \App\Models\AnatomicalObject::where('parent_id', 1)->get()
            : \App\Models\AnatomicalObject::whereNull('parent_id')->get();
        
        // Si un seul nœud racine (ex: Human Anatomy), on descend d'un cran
        if ($roots->count() === 1 && $roots->first()->children()->count() > 0) {
            $roots = $roots->first()->children;
        }

        foreach ($roots as $root) {
            // Trouver tous les descendants de ce root
            $descendantIds = $this->getDescendantIds($root);
            
            // Calculer la maîtrise moyenne sur ces descendants
            $relevantMasteries = $masteries->whereIn('anatomical_object_id', $descendantIds);
            
            $avgLevel = $relevantMasteries->count() > 0 
                ? $relevantMasteries->avg('mastery_level') 
                : 0;
                
            $radar[] = [
                'id'    => $root->id,
                'label' => $root->name, // Object avec langages
                'value' => round($avgLevel, 2),
                'count' => $relevantMasteries->count()
            ];
        }

        return response()->json([
            'has_data'               => true,
            'global_score'           => $globalScore,
            'total_attempts'         => $totalAttempts,
            'total_notions'          => $masteries->count(),
            'not_started'            => $notStarted,
            'en_cours'               => $enCours,
            'maitrisees'             => $maitrisees,
            'totalement_maitrisees'  => $totalementMaitrisees,
            'cultivees'              => $cultivees,
            'due_notions'            => $due,
            'mastery_levels'         => $levelDistribution,
            'radar'                  => $radar,
        ]);
    }

    private function getDescendantIds($node)
    {
        $ids = [$node->id];
        foreach ($node->children as $child) {
            $ids = array_merge($ids, $this->getDescendantIds($child));
        }
        return $ids;
    }

    /**
     * POST /api/mastery/record
     * Enregistre le résultat d'une session de questions pour une notion donnée
     */
    public function record(Request $request)
    {
        $request->validate([
            'anatomical_object_name' => 'required|string',
            'success_count'          => 'sometimes|integer|min:0',
            'failure_count'          => 'sometimes|integer|min:0',
            'is_correct'             => 'sometimes|boolean', // kept for backward compatibility
            'is_review'              => 'sometimes|boolean',
        ]);

        $userId = $request->user()?->id;
        if (!$userId) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Si c'est une révision/correction d'erreurs, on n'enregistre pas la progression de niveau
        if ($request->is_review) {
            return response()->json(['success' => true, 'message' => 'Review session, no level change']);
        }

        // Recherche multilingue (FR d'abord, puis EN)
        $obj = \App\Models\AnatomicalObject::whereRaw("JSON_EXTRACT(name, '$.fr') = ?", [$request->anatomical_object_name])->first()
            ?? \App\Models\AnatomicalObject::whereRaw("JSON_EXTRACT(name, '$.en') = ?", [$request->anatomical_object_name])->first();

        if (!$obj) {
            // Auto-creation if not found
            $maxId = \App\Models\AnatomicalObject::max('id') ?? 10000;
            $defaultAssetId = \App\Models\Asset3d::inRandomOrder()->first()?->id;
            if (!$defaultAssetId) {
                return response()->json(['error' => 'No asset found to associate object'], 500);
            }
            $obj = \App\Models\AnatomicalObject::create([
                'id' => $maxId + 1,
                'asset_3d_id' => $defaultAssetId,
                'name' => [
                    'fr' => $request->anatomical_object_name,
                    'en' => ''
                ],
                'three_js_name' => strtolower($request->anatomical_object_name),
                'description' => ['fr' => '', 'en' => ''],
            ]);
        }

        $mastery = UserMastery::firstOrCreate(
            ['user_id' => $userId, 'anatomical_object_id' => $obj->id],
            ['success_count' => 0, 'failure_count' => 0, 'mastery_level' => 0]
        );

        $sessionSuccess = $request->input('success_count', $request->is_correct ? 1 : 0);
        $sessionFailure = $request->input('failure_count', $request->is_correct ? 0 : 1);

        $mastery->success_count += $sessionSuccess;
        $mastery->failure_count += $sessionFailure;

        // Logic for Level: Success rate in session needs to be > 80% to level up
        $totalSession = $sessionSuccess + $sessionFailure;
        $sessionRate = $totalSession > 0 ? ($sessionSuccess / $totalSession) : 0;

        if ($sessionRate >= 0.8) {
            $mastery->mastery_level = min($mastery->mastery_level + 1, 5);
        } elseif ($sessionRate < 0.5) {
            $mastery->mastery_level = max($mastery->mastery_level - 1, 0);
        }
        // If between 50% and 80%, level remains the same.

        $mastery->last_review_at = now();
        
        // Dynamic SRS Intervals based on level
        $intervals = [
            0 => 24,    // Lvl 0 -> Review in 1 day
            1 => 72,    // Lvl 1 -> Review in 3 days
            2 => 168,   // Lvl 2 -> Review in 7 days (1 week)
            3 => 336,   // Lvl 3 -> Review in 14 days (2 weeks)
            4 => 720,   // Lvl 4 -> Review in 30 days (1 month)
            5 => 1440,  // Lvl 5 -> Review in 60 days (2 months)
        ];
        
        $hours = $intervals[$mastery->mastery_level] ?? 168;
        $mastery->next_review_at = now()->addHours($hours);
        $mastery->save();

        return response()->json([
            'success' => true, 
            'mastery_level' => $mastery->mastery_level,
            'next_review' => $mastery->next_review_at->diffForHumans()
        ]);
    }
}

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

        // En cours : net_score <= 0 (plus d'échecs que de succès)
        $enCours = $masteries
            ->filter(fn($m) => ($m->success_count + $m->failure_count) > 0 && $net($m) <= 0)
            ->sortByDesc('failure_count')
            ->values()
            ->map($mapItem);

        // Maîtrisées : net_score entre 1 et 4 (plus de succès)
        $maitrisees = $masteries
            ->filter(fn($m) => $net($m) > 0 && $net($m) < 5)
            ->sortByDesc('net_score')
            ->values()
            ->map($mapItem);

        // Totalement maîtrisées : net_score >= 5
        $totalementMaitrisees = $masteries
            ->filter(fn($m) => $net($m) >= 5)
            ->sortByDesc('net_score')
            ->values()
            ->map($mapItem);

        // Cultivées : net_score >= 5 ET peu d'échecs (≤ 2)
        $cultivees = $masteries
            ->filter(fn($m) => $net($m) >= 5 && $m->failure_count <= 2)
            ->sortByDesc('net_score')
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
        ]);
    }

    /**
     * POST /api/mastery/record
     * Enregistre le résultat d'une question pour une notion donnée
     */
    public function record(Request $request)
    {
        $request->validate([
            'anatomical_object_name' => 'required|string',
            'is_correct'           => 'required|boolean',
        ]);

        $userId = $request->user()?->id;
        if (!$userId) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Auto-créer ou trouver l'objet par nom
        $obj = \App\Models\AnatomicalObject::where('name', $request->anatomical_object_name)->first();
        if (!$obj) {
            $maxId = \App\Models\AnatomicalObject::max('id') ?? 10000;
            $defaultAssetId = \App\Models\Asset3d::inRandomOrder()->first()?->id;
            if (!$defaultAssetId) {
                return response()->json(['error' => 'No asset found to associate object'], 500);
            }
            $obj = \App\Models\AnatomicalObject::create([
                'id' => $maxId + 1,
                'asset_3d_id' => $defaultAssetId,
                'name' => $request->anatomical_object_name,
                'three_js_name' => strtolower($request->anatomical_object_name),
                'description' => '',
            ]);
        }

        $mastery = UserMastery::firstOrCreate(
            [
                'user_id'            => $userId,
                'anatomical_object_id'  => $obj->id,
            ],
            [
                'success_count' => 0,
                'failure_count' => 0,
                'mastery_level' => 0,
            ]
        );

        if ($request->is_correct) {
            $mastery->success_count++;
        } else {
            $mastery->failure_count++;
        }

        $netScore = $mastery->success_count - $mastery->failure_count;
        $mastery->mastery_level = min(max($netScore, 0), 5);

        $mastery->last_review_at = now();
        // 1 semaine = 2 révisions → intervalle fixe de 84 heures (3,5 jours)
        $mastery->next_review_at = now()->addHours(84);
        $mastery->save();

        return response()->json(['success' => true, 'mastery_level' => $mastery->mastery_level]);
    }
}

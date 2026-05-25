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

        $masteries = UserMastery::where('student_id', $userId)
            ->with('anatomicalObject')
            ->get();

        if ($masteries->isEmpty()) {
            return response()->json([
                'has_data'        => false,
                'global_score'    => 0,
                'total_attempts'  => 0,
                'weak_notions'    => [],
                'strong_notions'  => [],
                'mastery_levels'  => [],
            ]);
        }

        $totalSuccess = $masteries->sum('success_count');
        $totalFailure = $masteries->sum('failure_count');
        $totalAttempts = $totalSuccess + $totalFailure;
        $globalScore = $totalAttempts > 0 ? round(($totalSuccess / $totalAttempts) * 100) : 0;

        // Notions les PLUS RATÉES (failure_count élevé)
        $weak = $masteries
            ->filter(fn($m) => ($m->success_count + $m->failure_count) > 0)
            ->sortByDesc('failure_count')
            ->take(8)
            ->map(fn($m) => [
                'name'          => $m->anatomicalObject->name ?? 'Inconnu',
                'success'       => $m->success_count,
                'failure'       => $m->failure_count,
                'mastery_level' => $m->mastery_level,
                'last_review'   => $m->last_review_at?->diffForHumans(),
                'next_review'   => $m->next_review_at?->diffForHumans(),
            ])
            ->values();

        // Notions les MIEUX MAÎTRISÉES (mastery_level élevé)
        $strong = $masteries
            ->filter(fn($m) => $m->mastery_level > 0)
            ->sortByDesc('mastery_level')
            ->take(8)
            ->map(fn($m) => [
                'name'          => $m->anatomicalObject->name ?? 'Inconnu',
                'success'       => $m->success_count,
                'failure'       => $m->failure_count,
                'mastery_level' => $m->mastery_level,
                'last_review'   => $m->last_review_at?->diffForHumans(),
            ])
            ->values();

        // Distribution des niveaux de maîtrise (0=débutant … 5=expert)
        $levelDistribution = $masteries
            ->groupBy('mastery_level')
            ->map(fn($group, $level) => [
                'level' => (int)$level,
                'count' => $group->count(),
            ])
            ->sortBy('level')
            ->values();

        return response()->json([
            'has_data'        => true,
            'global_score'    => $globalScore,
            'total_attempts'  => $totalAttempts,
            'total_notions'   => $masteries->count(),
            'weak_notions'    => $weak,
            'strong_notions'  => $strong,
            'mastery_levels'  => $levelDistribution,
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
            $obj = \App\Models\AnatomicalObject::create([
                'id' => $maxId + 1,
                'name' => $request->anatomical_object_name,
                'three_js_name' => strtolower($request->anatomical_object_name),
                'description' => '',
            ]);
        }

        $mastery = UserMastery::firstOrCreate(
            [
                'student_id'            => $userId,
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
            // Monte de niveau tous les 3 succès consécutifs (max 5)
            if ($mastery->success_count % 3 === 0 && $mastery->mastery_level < 5) {
                $mastery->mastery_level++;
            }
        } else {
            $mastery->failure_count++;
            // Descend de niveau si trop d'échecs (min 0)
            if ($mastery->failure_count % 5 === 0 && $mastery->mastery_level > 0) {
                $mastery->mastery_level--;
            }
        }

        $mastery->last_review_at = now();
        // Algorithme de répétition espacée simple : intervalle en heures selon le niveau
        $intervals = [1, 6, 24, 72, 168, 336]; // 1h, 6h, 1j, 3j, 1sem, 2sem
        $mastery->next_review_at = now()->addHours($intervals[$mastery->mastery_level] ?? 1);
        $mastery->save();

        return response()->json(['success' => true, 'mastery_level' => $mastery->mastery_level]);
    }
}

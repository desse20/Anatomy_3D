<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnatomicalObject;
use App\Models\UserMastery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class QuizController extends Controller
{
    /**
     * GET /api/quiz/next-topic
     * Retourne un objet parent anatomique aléatoire (qui a des enfants)
     * que l'utilisateur n'a pas encore étudié (aucun enregistrement user_mastery).
     */
    public function nextTopic(Request $request)
    {
        $userId = $request->user()?->id;
        if (!$userId) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // IDs des objets déjà étudiés par cet utilisateur
        $studiedIds = UserMastery::where('user_id', $userId)
            ->pluck('anatomical_object_id')
            ->toArray();

        // Trouver un objet parent (qui a des enfants) non étudié
        $parent = AnatomicalObject::whereHas('children', function ($q) {
                $q->whereNotNull('id');
            })
            ->whereNotIn('id', $studiedIds)
            ->inRandomOrder()
            ->first();

        if (!$parent) {
            // Tous les parents ont été étudiés → retourner un parent aléatoire (révision)
            $parent = AnatomicalObject::whereHas('children', function ($q) {
                    $q->whereNotNull('id');
                })
                ->inRandomOrder()
                ->first();
        }

        if (!$parent) {
            return response()->json(['error' => 'No available topic'], 404);
        }

        $childCount = $parent->children()->count();

        return response()->json([
            'id'           => $parent->id,
            'name'         => $parent->name,
            'child_count'  => $childCount,
        ]);
    }
}

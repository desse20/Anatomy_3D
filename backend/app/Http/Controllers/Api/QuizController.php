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
     * Retourne un objet parent anatomique (qui a des enfants)
     * Si un object_id est fourni, retourne cet objet s'il est valide.
     * Sinon, choisit un objet aléatoire non étudié.
     */
    public function nextTopic(Request $request)
    {
        $userId = $request->user()?->id;
        if (!$userId) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $requestedObjectId = $request->query('object_id');

        if ($requestedObjectId) {
            $parent = AnatomicalObject::where('id', $requestedObjectId)->first();
            if (!$parent) {
                return response()->json(['error' => 'Object not found'], 404);
            }
        } else {
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

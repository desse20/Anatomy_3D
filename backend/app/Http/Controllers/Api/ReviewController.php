<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Review\StoreReviewRequest;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReviewController extends Controller
{
    /**
     * Liste les avis (admin uniquement).
     * Paramètre optionnel : ?type=platform|model_3d|object  ?target_id=X  ?limit=20
     */
    public function index(Request $request)
    {
        $query = Review::with(['user:id,firstname,lastname'])
            ->latest('created_at');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('min_rating')) {
            $query->where('rating', '>=', $request->min_rating);
        }
        if ($request->filled('max_rating')) {
            $query->where('rating', '<', $request->max_rating);
        }

        $limit = min((int) $request->query('limit', 20), 100);
        $data  = $query->paginate($limit);

        return response()->json([
            ...$data->toArray(),
            'empty_message' => $data->isEmpty() ? __('reviews.empty_list') : null
        ]);
    }

    /**
     * Soumet un avis (tout utilisateur authentifié).
     * POST /reviews
     */
    public function store(StoreReviewRequest $request)
    {
        $validated = $request->validated();

        $review = Review::create([
            ...$validated,
            'user_id'    => auth()->id(),
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => __('reviews.success_store'),
            'data'    => $review,
        ], 201);
    }

    /**
     * Statistiques des avis.
     * GET /reviews/stats?type=platform|model_3d|object
     */
    public function stats(Request $request)
    {
        $query = Review::query();

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $total       = $query->count();
        $average     = $total > 0 ? round($query->avg('rating'), 2) : null;
        
        $distribution = $query->clone()->select('rating', DB::raw('count(*) as count'))
            ->groupBy('rating')
            ->orderBy('rating')
            ->get()
            ->keyBy('rating')
            ->map(fn($r) => (int) $r->count);

        $byType = Review::select('type', DB::raw('count(*) as count'))
            ->groupBy('type')
            ->get()
            ->keyBy('type')
            ->map(fn($r) => (int) $r->count);

        $positive = Review::where('rating', '>=', 3)->count();
        $negative = Review::where('rating', '<', 3)->count();

        return response()->json([
            'total'        => $total,
            'average'      => $average,
            'distribution' => $distribution,
            'by_type'      => $byType,
            'counts'       => [
                'positive' => $positive,
                'negative' => $negative
            ]
        ]);
    }

    /**
     * Supprime un avis (admin ou auteur uniquement).
     * DELETE /reviews/{id}
     */
    public function destroy(string $id)
    {
        $user   = auth()->user();
        $review = Review::findOrFail($id);

        if ($user->role !== 'admin' && $review->user_id !== $user->id) {
            return response()->json(['message' => __('reviews.unauthorized')], 403);
        }

        $review->delete();

        return response()->json(['message' => __('reviews.success_delete')]);
    }
}

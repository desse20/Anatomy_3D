<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    /**
     * Données d'usage des objets anatomiques (pour l'admin).
     * GET /analytics/objects?range=30&limit=10
     *
     * Retourne :
     *  - top     : objets les plus visités
     *  - flop    : objets les moins visités
     *  - average : objets dans la moyenne
     *  - total   : total des consultations sur la période
     */
    public function objects(Request $request)
    {
        $days  = max(1, (int) $request->query('range', 30));
        $limit = min((int) $request->query('limit', 10), 50);
        $since = now()->subDays($days);

        // Rang de chaque objet par nombre de consultations sur la période
        $ranked = DB::table('consultation_logs as cl')
            ->join('anatomical_objects as ao', 'cl.anatomical_object_id', '=', 'ao.id')
            ->leftJoin('assets_3d as a3', 'ao.asset_3d_id', '=', 'a3.id')
            ->where('cl.viewed_at', '>=', $since)
            ->select(
                'ao.id',
                'ao.name',
                'a3.name as model_name',
                DB::raw('COUNT(cl.id) as visit_count')
            )
            ->groupBy('ao.id', 'ao.name', 'a3.name')
            ->orderByDesc('visit_count')
            ->get();

        $total = $ranked->sum('visit_count');
        $count = $ranked->count();

        if ($count === 0) {
            return response()->json([
                'total'   => 0,
                'top'     => [],
                'flop'    => [],
                'average' => [],
                'period'  => $days,
                'empty_message' => __('analytics.empty_activity')
            ]);
        }

        $avg = $total / $count;

        // Top — On prend les plus visités. Si peu de données, on prend juste les premiers sans filtrer par moyenne.
        if ($ranked->count() <= 5) {
            $top = $ranked->values();
            $flop = collect([]); // Pas de flop si trop peu de données
            $average = collect([]);
        } else {
            // Top — au-dessus de la moyenne, limité à $limit entrées
            $top = $ranked->filter(fn($r) => $r->visit_count > $avg)->take($limit)->values();
            // Si le filtre strict ne donne rien (ex: tous à 1), on prend le début
            if ($top->isEmpty()) $top = $ranked->take($limit)->values();

            // Flop — en dessous de la moyenne
            $flop = $ranked->filter(fn($r) => $r->visit_count < $avg)
                ->sortBy('visit_count')->take($limit)->values();

            // Moyenne — dans un écart de ±20 % de la moyenne
            $band  = max(1, $avg * 0.2);
            $average = $ranked->filter(fn($r) => abs($r->visit_count - $avg) <= $band)
                ->take($limit)->values();
        }

        return response()->json([
            'total'   => $total,
            'average' => round($avg, 1),
            'top'     => $top,
            'flop'    => $flop,
            'in_avg'  => $average,
            'period'  => $days,
        ]);
    }

    /**
     * Modèles 3D les plus utilisés (déduit via consultation_logs → anatomical_objects → assets_3d).
     * GET /analytics/models?range=30
     */
    public function models(Request $request)
    {
        $days  = max(1, (int) $request->query('range', 30));
        $since = now()->subDays($days);

        $models = DB::table('consultation_logs as cl')
            ->join('anatomical_objects as ao', 'cl.anatomical_object_id', '=', 'ao.id')
            ->join('assets_3d as a3', 'ao.asset_3d_id', '=', 'a3.id')
            ->where('cl.viewed_at', '>=', $since)
            ->select(
                'a3.id',
                'a3.name',
                DB::raw('COUNT(cl.id) as visit_count'),
                DB::raw('COUNT(DISTINCT cl.user_id) as unique_users'),
                DB::raw('COUNT(DISTINCT ao.id) as objects_viewed')
            )
            ->groupBy('a3.id', 'a3.name')
            ->orderByDesc('visit_count')
            ->get();

        return response()->json([
            'title'  => __('analytics.top_models_title'),
            'models' => $models,
            'total'  => $models->sum('visit_count'),
            'period' => $days,
            'empty_message' => $models->isEmpty() ? __('analytics.empty_models') : null
        ]);
    }

    /**
     * Évolution des consultations dans le temps (courbe).
     * GET /analytics/timeline?range=30
     */
    public function timeline(Request $request)
    {
        $days  = max(1, (int) $request->query('range', 30));
        $since = now()->subDays($days);

        $timeline = DB::table('consultation_logs')
            ->where('viewed_at', '>=', $since)
            ->select(
                DB::raw('DATE(viewed_at) as date'),
                DB::raw('COUNT(*) as visits'),
                DB::raw('COUNT(DISTINCT user_id) as unique_users')
            )
            ->groupBy(DB::raw('DATE(viewed_at)'))
            ->orderBy('date', 'ASC')
            ->get();

        return response()->json([
            'timeline' => $timeline,
            'period'   => $days,
        ]);
    }

    /**
     * Résumé global pour le dashboard admin.
     * GET /analytics/summary
     */
    public function summary(Request $request)
    {
        $days  = max(1, (int) $request->query('range', 30));
        $since = now()->subDays($days);

        $totalVisits      = DB::table('consultation_logs')->where('viewed_at', '>=', $since)->count();
        $uniqueUsers      = DB::table('consultation_logs')->where('viewed_at', '>=', $since)->distinct('user_id')->count('user_id');
        $totalObjects     = DB::table('anatomical_objects')->count();
        $visitedObjects   = DB::table('consultation_logs')->where('viewed_at', '>=', $since)->distinct('anatomical_object_id')->count('anatomical_object_id');
        $neverVisited     = $totalObjects - DB::table('consultation_logs')->distinct('anatomical_object_id')->count('anatomical_object_id');
        $totalReviews     = DB::table('reviews')->count();
        $avgRating        = DB::table('reviews')->avg('rating');
        $cachedResponses  = DB::table('ai_cache')->count();

        return response()->json([
            'period'             => $days,
            'total_visits'       => $totalVisits,
            'unique_users'       => $uniqueUsers,
            'total_objects'      => $totalObjects,
            'visited_objects'    => $visitedObjects,
            'never_visited'      => max(0, $neverVisited),
            'total_reviews'      => $totalReviews,
            'avg_rating'         => $avgRating ? round($avgRating, 2) : null,
            'ai_cached_responses'=> $cachedResponses,
            'labels' => [
                'visits' => __('analytics.labels.visits'),
                'users'  => __('analytics.labels.users'),
                'rating' => __('analytics.labels.rating'),
                'cache'  => __('analytics.labels.cache'),
            ]
        ]);
    }

    /**
     * Liste des utilisateurs avec résumé d'activité.
     * GET /api/analytics/users
     */
    public function users(Request $request)
    {
        $users = DB::table('users as u')
            ->leftJoin('consultation_logs as cl', 'u.id', '=', 'cl.user_id')
            ->select(
                'u.id',
                'u.firstname',
                'u.lastname',
                'u.email',
                'u.role',
                DB::raw('COUNT(cl.id) as total_visits'),
                DB::raw('MAX(cl.viewed_at) as last_visit')
            )
            ->groupBy('u.id', 'u.firstname', 'u.lastname', 'u.email', 'u.role')
            ->orderByDesc('total_visits')
            ->get();

        return response()->json($users);
    }

    /**
     * Détails d'utilisation pour un utilisateur spécifique.
     * GET /api/analytics/users/{id}
     */
    public function userDetails(string $userId)
    {
        $user = DB::table('users')->where('id', $userId)->first();
        if (!$user) return response()->json(['error' => 'User not found'], 404);

        $stats = DB::table('consultation_logs as cl')
            ->join('anatomical_objects as ao', 'cl.anatomical_object_id', '=', 'ao.id')
            ->leftJoin('assets_3d as a3', 'ao.asset_3d_id', '=', 'a3.id')
            ->where('cl.user_id', $userId)
            ->select(
                'ao.id',
                'ao.name',
                'a3.name as model_name',
                DB::raw('COUNT(cl.id) as visit_count'),
                DB::raw('MAX(cl.viewed_at) as last_viewed')
            )
            ->groupBy('ao.id', 'ao.name', 'a3.name')
            ->orderByDesc('visit_count')
            ->get();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->firstname . ' ' . $user->lastname,
                'email' => $user->email,
                'role' => $user->role
            ],
            'visited_objects' => $stats,
            'top' => $stats->take(10),
            'flop' => $stats->sortBy('visit_count')->take(10)->values(),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BaseDonneesController extends Controller
{
    public function stats(Request $request)
    {
        try {
            $range = $request->query('range', '30');
            $days = intval($range);
            if ($days <= 0) $days = 30;

            $dbName = config('database.connections.mysql.database') ?: env('DB_DATABASE');
            
            // Récupération des tables et de leur taille
            $tables = DB::select("
                SELECT 
                    TABLE_NAME as name, 
                    TABLE_ROWS as `rows`, 
                    (DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024 AS size_mb 
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = ?
                ORDER BY size_mb DESC
            ", [$dbName]);

            if (empty($tables)) {
                $rawTables = DB::select('SHOW TABLES');
                $tables = [];
                foreach ($rawTables as $rt) {
                    $prop = "Tables_in_" . $dbName;
                    $name = $rt->$prop ?? array_values((array)$rt)[0];
                    $count = DB::table($name)->count();
                    $tables[] = (object)[
                        'name' => $name,
                        'rows' => $count,
                        'size_mb' => 0.1
                    ];
                }
            }

            // Tables détaillées pour la page /tech
            $detailedTables = array_map(function($t) {
                return [
                    'name' => $t->name,
                    'rows' => $t->rows,
                    'size' => round($t->size_mb ?? 0, 2)
                ];
            }, $tables);

            // Top 3 pour le dashboard
            $topTables = collect($detailedTables)->take(3)->values();

            $totalSize = collect($tables)->sum('size_mb');

            // Évolution des utilisateurs groupée par rôle
            $userEvolution = DB::table('users')
                ->select(DB::raw('DATE(created_at) as date'), 'role', DB::raw('count(*) as count'))
                ->where('created_at', '>=', now()->subDays($days))
                ->groupBy('date', 'role')
                ->orderBy('date', 'ASC')
                ->get();

            // Comptage par rôle pour le diagramme de proportion (TOTAL actuel)
            $roleCounts = [
                'admin' => DB::table('users')->where('role', 'admin')->count(),
                'teacher' => DB::table('users')->where('role', 'teacher')->count(),
                'student' => DB::table('users')->where('role', 'student')->count(),
            ];

            // Comptage par rôle sur la PÉRIODE (pour le filtre)
            $periodRoleCounts = [
                'admin' => DB::table('users')->where('role', 'admin')->where('created_at', '>=', now()->subDays($days))->count(),
                'teacher' => DB::table('users')->where('role', 'teacher')->where('created_at', '>=', now()->subDays($days))->count(),
                'student' => DB::table('users')->where('role', 'student')->where('created_at', '>=', now()->subDays($days))->count(),
            ];

            // Sessions actives : Uniquement ceux qui ont un token (connectés)
            $activeSessions = DB::table('users')
                ->whereNotNull('token')
                ->count();

            return response()->json([
                'total_size_mb' => round($totalSize, 2),
                'tables' => $detailedTables,
                'top_tables' => $topTables,
                'user_evolution' => $userEvolution,
                'role_counts' => $roleCounts,
                'period_role_counts' => $periodRoleCounts, // Pour les analytics filtrés
                'active_sessions' => $activeSessions,
                'counts' => [
                    'users' => DB::table('users')->count(),
                    'assets_3d' => DB::table('assets_3d')->count(),
                    'anatomical_objects' => DB::table('anatomical_objects')->count(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BaseDonneesController extends Controller
{
    public function stats()
    {
        $dbName = env('DB_DATABASE');
        
        $tables = DB::select('
            SELECT 
                table_name AS name, 
                table_rows AS rows_count, 
                ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb 
            FROM information_schema.TABLES 
            WHERE table_schema = ?
        ', [$dbName]);

        $totalSize = collect($tables)->sum('size_mb');

        return response()->json([
            'total_size_mb' => round($totalSize, 2),
            'tables' => $tables
        ]);
    }
}

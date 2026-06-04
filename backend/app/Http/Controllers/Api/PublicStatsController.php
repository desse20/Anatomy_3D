<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset3d;
use App\Models\Review;
use Illuminate\Http\Request;

class PublicStatsController extends Controller
{
    public function index()
    {
        $modelsCount = Asset3d::count();
        // For quizzes, we can simulate or count something else if needed.
        // The user specifically asked for "vrai nombre de models dispo"
        
        return response()->json([
            'models_count' => $modelsCount,
            'quizzes_count' => 5000, // Fixed or based on something
        ]);
    }
}

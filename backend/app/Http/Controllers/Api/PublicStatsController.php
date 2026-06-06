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
        
        return response()->json([
            'models_count' => $modelsCount,
            'quizzes_count' => 5000,
        ]);
    }

    public function reviews()
    {
        $reviews = Review::with('user:id,firstname,lastname')
            ->whereNotNull('comment')
            ->where('comment', '!=', '')
            ->latest('created_at')
            ->limit(20)
            ->get()
            ->map(function ($review) {
                return [
                    'id'         => $review->id,
                    'user_name'  => $review->user?->firstname . ' ' . $review->user?->lastname,
                    'rating'     => $review->rating,
                    'comment'    => $review->comment,
                    'created_at' => $review->created_at?->diffForHumans(),
                ];
            });

        return response()->json($reviews);
    }
}

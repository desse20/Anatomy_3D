<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class CheckRole
{
    /**
     * Handle an incoming request.
     * Les rôles peuvent être séparés par un pipe `|` ex: `teacher|admin`
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['message' => __('messages.auth.unauthenticated')], 401);
        }

        $userRole = $user->role;
        $allowedRoles = explode('|', $role);

        $hierarchy = [
            'student' => 1,
            'teacher' => 2,
            'admin'   => 3,
        ];

        $userWeight = $hierarchy[$userRole] ?? 0;

        foreach ($allowedRoles as $reqRole) {
            $reqWeight = $hierarchy[$reqRole] ?? 999;
            if ($userWeight >= $reqWeight) {
                return $next($request);
            }
        }

        return response()->json([
            'message' => __('messages.auth.access_denied')
        ], 403);
    }
}

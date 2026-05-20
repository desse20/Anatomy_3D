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

        // L'administrateur a un accès universel dans l'application
        if ($userRole === 'admin') {
            return $next($request);
        }

        if (in_array($userRole, $allowedRoles)) {
            return $next($request);
        }

        return response()->json([
            'message' => __('messages.auth.access_denied')
        ], 403);
    }
}

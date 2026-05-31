<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SimpleTokenAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        // Laisser passer les requêtes de pré-vérification CORS (OPTIONS)
        if ($request->isMethod('OPTIONS')) {
            return $next($request);
        }

        $token = $request->bearerToken() ?: $request->query('token');
        
        error_log("SIMPLE_AUTH: Attempting auth for " . $request->fullUrl() . " | has_token: " . ($token ? 'YES' : 'NO'));

        if (!$token) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Le token est: base64(userId) + '.' + hmac
        $parts = explode('.', $token);
        if (count($parts) !== 2) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $userId = base64_decode($parts[0]);
        $tokenStr   = $parts[1];

        $user = User::find($userId);
        if (!$user || !$user->token) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Vérifie que le hash du token fourni correspond à celui en base
        if (!hash_equals($user->token, hash('sha256', $tokenStr))) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Lie l'utilisateur à la requête et à l'Auth de Laravel
        $request->setUserResolver(fn() => $user);
        \Illuminate\Support\Facades\Auth::setUser($user);

        return $next($request);
    }
}

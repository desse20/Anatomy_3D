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

        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Le token est: base64(userId) + '.' + hmac
        $parts = explode('.', $token);
        if (count($parts) !== 2) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $userId = base64_decode($parts[0]);
        $hmac   = $parts[1];

        $user = User::find($userId);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Vérifie la signature en régénérant le token attendu
        $expectedToken = $user->generateSimpleToken();
        
        if (!hash_equals($expectedToken, $token)) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Lie l'utilisateur à la requête et à l'Auth de Laravel
        $request->setUserResolver(fn() => $user);
        \Illuminate\Support\Facades\Auth::setUser($user);

        return $next($request);
    }
}

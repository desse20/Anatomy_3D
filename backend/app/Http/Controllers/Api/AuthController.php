<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\LogoutRequest;
use App\Http\Resources\AuthResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $request->authenticate();
        
        $user = $request->user();
        $token = $user->createToken('auth_token')->plainTextToken;
        
        $userResource = new AuthResource($user);
        $userResource->additional(['token' => $token]);
        
        return $userResource;
    }

    public function register(RegisterRequest $request)
    {
        $user = User::create([
            'firstname' => $request->firstname,
            'lastname' => $request->lastname,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role ?? 'student',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;
        
        $userResource = new AuthResource($user);
        $userResource->additional(['token' => $token]);
        
        return $userResource->response()->setStatusCode(201);
    }

    public function logout(LogoutRequest $request)
    {
        $request->fulfill();
        
        return response()->json(['message' => 'Successfully logged out']);
    }

    public function me(Request $request)
    {
        return new AuthResource($request->user());
    }

    public function refresh(Request $request)
    {
        $user = $request->user();
        
        // Révoquer tous les tokens existants
        $user->tokens()->delete();
        
        // Créer un nouveau token
        $token = $user->createToken('auth_token')->plainTextToken;
        
        $userResource = new AuthResource($user);
        $userResource->additional(['token' => $token]);
        
        return $userResource;
    }
}

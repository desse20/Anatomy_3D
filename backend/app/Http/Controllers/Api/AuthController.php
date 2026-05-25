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
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use App\Mail\VerificationCodeMail;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $request->authenticate();
        
        $user = $request->user();
        $token = $user->generateSimpleToken();
        
        return (new AuthResource($user))->additional(['token' => $token]);
    }

    public function sendRegistrationCode(RegisterRequest $request)
    {
        // On génère un code à 6 chiffres
        $code = rand(100000, 999999);

        // On sauvegarde le code dans le cache avec l'email, valide 15 minutes
        Cache::put('registration_code_' . $request->email, $code, now()->addMinutes(15));
        
        // On sauvegarde temporairement les données pour éviter de tout redemander ? 
        // Pas nécessaire si on renvoie tout depuis le front
        
        try {
            Mail::to($request->email)->send(new VerificationCodeMail($code));
        } catch (\Exception $e) {
            // Pour le dev local si l'email ne passe pas, on peut se renvoyer le code
            return response()->json([
                'message' => __('messages.auth.email_send_error'),
                'error' => $e->getMessage()
            ], 500);
        }

        return response()->json(['message' => __('messages.auth.code_sent')]);
    }

    public function register(RegisterRequest $request)
    {
        $request->validate(
            ['code' => 'required|numeric'],
            [
                'code.required' => __('messages.auth.code_required'),
                'code.numeric' => __('messages.auth.code_numeric')
            ]
        );

        $cachedCode = Cache::get('registration_code_' . $request->email);

        if (!$cachedCode || $cachedCode != $request->code) {
            return response()->json([
                'message' => __('messages.auth.code_invalid')
            ], 400);
        }

        $user = User::create([
            'firstname' => strtoupper($request->firstname),
            'lastname' => $request->lastname,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'student', // Toujours étudiant à l'inscription publique (sécurité)
        ]);

        // On supprime le code du cache
        Cache::forget('registration_code_' . $request->email);

        $token = $user->generateSimpleToken();
        
        return (new AuthResource($user))
            ->additional(['token' => $token])
            ->response()
            ->setStatusCode(201);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate(
            ['email' => 'required|email'],
            [
                'email.required' => __('messages.auth.email_required'),
                'email.email' => __('messages.auth.email_valid'),
            ]
        );

        $status = Password::broker()->sendResetLink(
            $request->only('email')
        );

        return $status === Password::RESET_LINK_SENT
            ? response()->json(['message' => __('auth.forgot_sent')])
            : response()->json(['message' => __($status)], 400);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        $status = Password::broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->password = Hash::make($password);
                $user->save();
            }
        );

        return $status === Password::PASSWORD_RESET
            ? response()->json(['message' => __('auth.reset_success')])
            : response()->json(['message' => __($status)], 400);
    }

    public function logout(LogoutRequest $request)
    {
        $request->fulfill();
        
        return response()->json(['message' => __('auth.logout')]);
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

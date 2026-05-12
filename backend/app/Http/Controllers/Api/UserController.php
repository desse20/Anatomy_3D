<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Http\Resources\UserCollection;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::query()
            ->withCount(['consultationLogs', 'masteries'])
            ->paginate($request->get('per_page', 15));

        return new UserCollection($users);
    }

    public function store(StoreUserRequest $request)
    {
        $user = User::create($request->validated());

        return (new UserResource($user))
            ->response()
            ->setStatusCode(201);
    }

    public function show(User $user)
    {
        $user->load(['consultationLogs', 'masteries']);

        return new UserResource($user);
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $user->update($request->validated());

        return new UserResource($user);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        $user->update([
            'password' => \Hash::make($request->password),
        ]);

        $newToken = $user->generateSimpleToken();

        return response()->json([
            'message' => __('auth.password_updated'),
            'token'   => $newToken,
        ]);
    }

    public function destroy(Request $request, User $user)
    {
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (!\Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => __('auth.failed'),
                'errors' => ['password' => [__('auth.password') . ' ' . __('validation.invalid')]]
            ], 422);
        }

        $user->delete();

        return response()->json(['message' => __('auth.user_deleted')]);
    }

    public function updateProfile(UpdateUserRequest $request)
    {
        $user = $request->user();
        $user->update($request->validated());

        // Regénère un token frais car si l'email a changé, l'ancien HMAC est invalide
        $newToken = $user->generateSimpleToken();

        return (new UserResource($user))->additional(['token' => $newToken]);
    }

    public function deleteAccount(Request $request)
    {
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (!\Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => __('auth.failed'),
                'errors' => ['password' => [__('auth.password') . ' ' . __('validation.invalid')]]
            ], 422);
        }

        $user->delete();

        return response()->json(['message' => __('auth.user_deleted')]);
    }
}

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

        // Regénère un token frais (le token ne dépend plus du mdp, mais on le retourne quand même)
        $hmac = hash_hmac('sha256', $user->id . $user->email, config('app.key'));
        $newToken = base64_encode($user->id) . '.' . $hmac;

        return response()->json([
            'message' => 'Mot de passe mis à jour avec succès',
            'token'   => $newToken,
        ]);
    }

    public function destroy(User $user)
    {
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }
}

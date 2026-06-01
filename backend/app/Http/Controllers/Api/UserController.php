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
        $query = User::query()->withCount(['consultationLogs', 'masteries']);
        
        if ($request->has('search') && !empty($request->search)) {
            $s = $request->search;
            $query->where(function($q) use ($s) {
                $q->where('firstname', 'LIKE', "%{$s}%")
                  ->orWhere('lastname', 'LIKE', "%{$s}%")
                  ->orWhere('email', 'LIKE', "%{$s}%");
            });
        }
        
        if ($request->has('role') && !empty($request->role)) {
            $query->where('role', $request->role);
        }

        $users = $query->paginate($request->get('per_page', 15));

        return UserResource::collection($users);
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
        $data = $request->validated();

        if ($user->role === 'admin' && isset($data['role']) && $data['role'] !== 'admin') {
            return response()->json(['message' => __('messages.user.admin_role_protected')], 403);
        }

        if ($user->role === 'teacher' && isset($data['role']) && $data['role'] === 'student') {
            return response()->json(['message' => __('messages.user.teacher_downgrade_forbidden')], 403);
        }

        $user->update($data);

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

    public function bulkDestroy(Request $request)
    {
        $request->validate([
            'password' => ['required', 'string'],
            'ids' => ['required', 'array'],
        ]);

        if (!\Hash::check($request->password, auth()->user()->password)) {
            return response()->json([
                'message' => __('messages.user.password_incorrect'),
                'errors' => ['password' => [__('messages.user.password_incorrect')]]
            ], 422);
        }

        $ids = $request->ids;
        // On ne se supprime pas soi-même
        $count = User::whereIn('id', $ids)
                    ->where('id', '!=', auth()->id())
                    ->delete();

        return response()->json(['message' => __('messages.user.bulk_deleted', ['count' => $count])]);
    }

    public function destroy(Request $request, User $user)
    {
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (!\Hash::check($request->password, auth()->user()->password)) {
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
        $data = $request->validated();

        // Les utilisateurs ne peuvent pas modifier leur propre rôle via leur profil !
        if (isset($data['role'])) {
            unset($data['role']);
        }

        if (isset($data['firstname'])) {
            $data['firstname'] = strtoupper($data['firstname']);
        }

        $user->update($data);

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

<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AnatomyController;
use App\Http\Controllers\Api\MasteryController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\LabController;

Route::prefix('ai')->middleware(['simple_auth', 'role:student'])->group(function () {
    Route::post('generate', [AiController::class, 'generate']);
    Route::post('evaluate', [AiController::class, 'evaluate']);
    Route::get('models',   [AiController::class, 'models']);
});

Route::prefix('conversations')->middleware(['simple_auth', 'role:student'])->group(function () {
    Route::get('',                         [ConversationController::class, 'index']);
    Route::post('',                        [ConversationController::class, 'store']);
    Route::put('{id}',                     [ConversationController::class, 'update']);
    Route::delete('{id}',                  [ConversationController::class, 'destroy']);
    Route::get('{id}/messages',            [ConversationController::class, 'messages']);
});

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::post('register/send-code', [AuthController::class, 'sendRegistrationCode']);
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:3,1');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->name('password.reset');
    Route::post('logout', [AuthController::class, 'logout'])->middleware('simple_auth');
    Route::get('me', [AuthController::class, 'me'])->middleware('simple_auth');
    Route::post('refresh', [AuthController::class, 'refresh'])->middleware('simple_auth');
});

Route::prefix('users')->middleware('simple_auth')->group(function () {
    // Profil (accessible à tous les authentifiés)
    Route::put('/profile', [UserController::class, 'updateProfile']);
    Route::delete('/profile', [UserController::class, 'deleteAccount']);
    Route::post('/change-password', [UserController::class, 'changePassword']);

    // Gestion par l'Admin uniquement
    Route::middleware('role:admin')->group(function () {
        Route::post('bulk-delete', [UserController::class, 'bulkDestroy']);
        Route::get('', [UserController::class, 'index']); // Change '/' to ''
        Route::post('', [UserController::class, 'store']);
        Route::get('{user}', [UserController::class, 'show']);
        Route::put('{user}', [UserController::class, 'update']);
        Route::delete('{user}', [UserController::class, 'destroy']);
    });
});

// Anatomy hierarchy (Accès aux étudiants, profs et admins)
Route::prefix('anatomy')->middleware(['simple_auth'])->group(function () {
    Route::get('all',             [AnatomyController::class, 'all']);
    Route::get('roots',           [AnatomyController::class, 'roots']);
    Route::get('subtree/{name}',  [AnatomyController::class, 'subtree']);
    Route::get('search',          [AnatomyController::class, 'search']);
});

// Maîtrise utilisateur (réservé aux étudiants et admins)
Route::prefix('mastery')->middleware(['simple_auth'])->group(function () {
    Route::get('stats',    [MasteryController::class, 'stats']);
    Route::post('record',  [MasteryController::class, 'record']);
});

use App\Http\Controllers\Api\Asset3dController;

// Gestion des Actifs 3D (Admin uniquement) - Sécurité bypassée pour debug final
Route::prefix('models-manager')->group(function () {
    Route::get('scan',           [Asset3dController::class, 'scanLocalFolder']);
    Route::get('',               [Asset3dController::class, 'index']);
    Route::get('{asset}',        [Asset3dController::class, 'show']);
    Route::get('{asset}/objects-paginated', [Asset3dController::class, 'getObjectsPaginated']);
    Route::get('{asset}/offline-package',   [Asset3dController::class, 'offlinePackage']);
    Route::put('{asset}',        [Asset3dController::class, 'update']);
    Route::delete('{asset}',     [Asset3dController::class, 'destroy']);
    Route::post('{asset}/objects', [Asset3dController::class, 'addObject']);
    Route::put('objects/{object}', [Asset3dController::class, 'updateObject']);
    Route::delete('objects/{object}', [Asset3dController::class, 'destroyObject']);
    Route::post('{asset}/import-hierarchy', [Asset3dController::class, 'importHierarchy']);
    Route::get('{asset}/search-objects', [Asset3dController::class, 'searchObjects']);
    Route::get('files/{filename}',     [Asset3dController::class, 'serveFile']);
    Route::post('process-local', [Asset3dController::class, 'processLocalFile']);
    Route::post('upload',        [Asset3dController::class, 'upload']);
    Route::post('confirm',       [Asset3dController::class, 'confirm']);
});

// Gestion des Labs
Route::prefix('labs')->middleware(['simple_auth'])->group(function () {

    // ✅ Accessible à TOUS les rôles authentifiés (étudiant, prof, admin)
    // Le contrôleur filtre les résultats selon le rôle (labs créés vs labs rejoints)
    Route::get('',                     [LabController::class, 'index']);

    // Accessible à tous les rôles via lien de partage (enregistre le participant)
    Route::get('{lab}/view',           [LabController::class, 'publicShow']);

    // Accessibles uniquement aux profs/admins
    Route::middleware('role:teacher')->group(function () {
        Route::post('bulk-delete',                          [LabController::class, 'bulkDestroy']);
        Route::post('',                                     [LabController::class, 'store']);
        // Gestion des vues 3D partagées (Routes statiques en premier !)
        Route::get('shared-views',                         [LabController::class, 'mySharedViews']);
        Route::post('shared-views/bulk-delete',            [LabController::class, 'bulkDestroySharedViews']);
        Route::put('shared-views/{sharedViewId}',          [LabController::class, 'updateSharedView']);
        Route::delete('shared-views/{sharedViewId}',       [LabController::class, 'destroySharedView']);
        Route::put('shared-views/{sharedViewId}/status',   [LabController::class, 'updateSharedViewStatus']);

        Route::get('my-views',                             [LabController::class, 'mySharedViews']);
        Route::get('{lab}',                                [LabController::class, 'show']);
        Route::put('{lab}',                                [LabController::class, 'update']);
        Route::delete('{lab}',                             [LabController::class, 'destroy']);
        Route::post('{lab}/views/{sharedViewId}',          [LabController::class, 'addSharedView']);
        Route::delete('{lab}/views/{sharedViewId}',        [LabController::class, 'removeSharedView']);
    });
});
Route::options('{any}', function() {
    return response()->json([], 200)
        ->header('Access-Control-Allow-Origin', '*')
        ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
})->where('any', '.*');
use App\Http\Controllers\Api\BaseDonneesController;

Route::get('system/stats', [BaseDonneesController::class, 'stats'])->middleware(['simple_auth', 'role:admin']);


<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AnatomyController;
use App\Http\Controllers\Api\MasteryController;

Route::prefix('ai')->middleware(['simple_auth', 'role:student'])->group(function () {
    Route::post('generate', [AiController::class, 'generate']);
    Route::post('evaluate', [AiController::class, 'evaluate']);
    Route::get('models', [AiController::class, 'models']);
});

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:5,1');
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
        Route::get('', [UserController::class, 'index']); // Change '/' to ''
        Route::post('', [UserController::class, 'store']);
        Route::get('{user}', [UserController::class, 'show']);
        Route::put('{user}', [UserController::class, 'update']);
        Route::delete('{user}', [UserController::class, 'destroy']);
    });
});

// Anatomy hierarchy (Accès restreint aux utilisateurs identifiés)
Route::prefix('anatomy')->middleware(['simple_auth', 'role:student|teacher'])->group(function () {
    Route::get('roots',           [AnatomyController::class, 'roots']);
    Route::get('subtree/{name}',  [AnatomyController::class, 'subtree']);
    Route::get('search',          [AnatomyController::class, 'search']);
});

// Maîtrise utilisateur (réservé aux étudiants)
Route::prefix('mastery')->middleware(['simple_auth', 'role:student'])->group(function () {
    Route::get('stats',    [MasteryController::class, 'stats']);
    Route::post('record',  [MasteryController::class, 'record']);
});

use App\Http\Controllers\Api\BaseDonneesController;

// Console Technique
Route::prefix('system')->middleware(['simple_auth', 'role:admin'])->group(function () {
    Route::get('stats', [BaseDonneesController::class, 'stats']);
});

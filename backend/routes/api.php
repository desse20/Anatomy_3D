<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AnatomyController;
use App\Http\Controllers\Api\MasteryController;
use App\Http\Controllers\Api\QuizController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\LabController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\AiCacheController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\BaseDonneesController;
use App\Http\Controllers\Api\PublicStatsController;

Route::get('/public/stats',   [PublicStatsController::class, 'index']);
Route::get('/public/reviews', [PublicStatsController::class, 'reviews']);

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
    Route::post('log',            [AnatomyController::class, 'logConsultation']);
});

// Maîtrise utilisateur (réservé aux étudiants et admins)
Route::prefix('mastery')->middleware(['simple_auth'])->group(function () {
    Route::get('stats',    [MasteryController::class, 'stats']);
    Route::post('record',  [MasteryController::class, 'record']);
});

Route::prefix('quiz')->middleware(['simple_auth'])->group(function () {
    Route::get('next-topic', [QuizController::class, 'nextTopic']);
});

use App\Http\Controllers\Api\Asset3dController;

// Gestion des Actifs 3D (Admin uniquement)
Route::prefix('models-manager')->middleware('simple_auth')->group(function () {
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
    Route::post('process-local', [Asset3dController::class, 'processLocalFile']);
    Route::post('upload',        [Asset3dController::class, 'upload']);
    Route::post('confirm',       [Asset3dController::class, 'confirm']);
});

// SANS simple_auth — nécessaire pour le render 3D (vue publique)
Route::prefix('models-manager')->group(function () {
    Route::get('files/{filename}', [Asset3dController::class, 'serveFile']);
});

// Gestion des Labs
Route::prefix('labs')->middleware(['simple_auth'])->group(function () {

    // ✅ Accessible à TOUS les rôles authentifiés (étudiant, prof, admin)
    // Le contrôleur filtre les résultats selon le rôle (labs créés vs labs rejoints)
    Route::get('',                     [LabController::class, 'index']);

    // Accessible à tous les rôles via lien de partage (enregistre le participant)
    Route::get('{lab}/view',           [LabController::class, 'publicShow']);

    // Permet à tout utilisateur authentifié de charger une vue partagée dans le viewer
    Route::get('shared-views/{sharedViewId}', [LabController::class, 'getSharedView']);

    // Accessibles uniquement aux profs/admins
    Route::middleware('role:teacher')->group(function () {
        Route::post('bulk-delete',                          [LabController::class, 'bulkDestroy']);
        Route::post('',                                     [LabController::class, 'store']);
        // Gestion des vues 3D partagées (Routes statiques en premier !)
        Route::post('shared-views',                        [LabController::class, 'storeSharedView']);
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

Route::get('system/stats', [BaseDonneesController::class, 'stats'])->middleware(['simple_auth', 'role:admin']);

// ── AVIS UTILISATEURS ─────────────────────────────────────────────────────────
// POST   /reviews          — soumettre un avis (tous les authentifiés)
// GET    /reviews          — lister les avis (admin uniquement)
// GET    /reviews/stats    — stats d'un objet ou la plateforme
// DELETE /reviews/{id}     — supprimer un avis (admin ou auteur)
Route::prefix('reviews')->middleware('simple_auth')->group(function () {
    Route::post('',          [ReviewController::class, 'store']);
    Route::get('stats',      [ReviewController::class, 'stats']);
    Route::middleware('role:admin')->group(function () {
        Route::get('',           [ReviewController::class, 'index']);
        Route::delete('{id}',    [ReviewController::class, 'destroy']);
    });
});

// ── CACHE DES RÉPONSES IA ─────────────────────────────────────────────────────
// POST   /ai-cache/lookup  — rechercher une réponse en cache (tous)
// POST   /ai-cache         — enregistrer une réponse (tous — appelé après gen. IA)
// GET    /ai-cache         — liste du cache (admin)
// DELETE /ai-cache/expired — purge des entrées expirées (admin)
// DELETE /ai-cache/{id}    — suppression unitaire (admin)
Route::prefix('ai-cache')->middleware('simple_auth')->group(function () {
    Route::post('lookup',         [AiCacheController::class, 'lookup']);
    Route::post('',               [AiCacheController::class, 'store']);
    Route::middleware('role:admin')->group(function () {
        Route::get('',            [AiCacheController::class, 'index']);
        Route::get('active-models', [AiCacheController::class, 'aiModels']);
        Route::put('{id}',        [AiCacheController::class, 'update']);
        Route::delete('{id}',     [AiCacheController::class, 'destroy']);
    });
});

// ── ANALYTICS ADMIN ───────────────────────────────────────────────────────────
// GET /analytics/summary   — chiffres clés globaux
// GET /analytics/objects   — top/flop/moyenne des objets anatomiques visités
// GET /analytics/models    — modèles 3D les plus utilisés
// GET /analytics/timeline  — courbe des consultations dans le temps
Route::prefix('analytics')->middleware(['simple_auth', 'role:admin'])->group(function () {
    Route::get('summary',   [AnalyticsController::class, 'summary']);
    Route::get('objects',   [AnalyticsController::class, 'objects']);
    Route::get('models',    [AnalyticsController::class, 'models']);
    Route::get('timeline',  [AnalyticsController::class, 'timeline']);
    Route::get('users',     [AnalyticsController::class, 'users']);
    Route::get('user/{id}', [AnalyticsController::class, 'userDetails']);
});

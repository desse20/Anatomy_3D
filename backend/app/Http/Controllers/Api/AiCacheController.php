<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AiCacheController extends Controller
{
    /**
     * Recherche une réponse en cache.
     * POST /ai-cache/lookup
     *
     * Body : { question, language, object_id? }
     * Retourne la meilleure correspondance valide ou 404.
     */
    public function lookup(Request $request)
    {
        $question  = $request->input('question', '');
        $language  = $request->input('language', 'fr');
        $objectId  = $request->input('object_id');

        if (strlen(trim($question)) < 5) {
            return response()->json(['message' => __('ai_cache.too_short')], 422);
        }

        // Recherche par object_id + langue en priorité, puis fallback général
        $query = AiCache::where('language', $language)
            ->where(function ($q) use ($question) {
                // Recherche approximative : les premiers mots-clés de la question
                $keywords = array_filter(explode(' ', $question), fn($w) => mb_strlen($w) > 3);
                $keywords = array_slice($keywords, 0, 5);
                foreach ($keywords as $kw) {
                    $q->orWhere('question', 'LIKE', '%' . $kw . '%');
                }
            });

        if ($objectId) {
            $query->where('object_id', $objectId);
        }

        // Filtrer les entrées non expirées
        $cached = $query
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->orderBy('use_count', 'desc') // La plus utilisée en premier
            ->first();

        if (!$cached) {
            return response()->json(['message' => __('ai_cache.not_found')], 404);
        }

        // Incrémenter le compteur d'utilisation
        $cached->increment('use_count');

        Log::info("💾 AI CACHE HIT — id={$cached->id}, use_count={$cached->use_count}");

        return response()->json([
            'response'   => $cached->response,
            'from_cache' => true,
            'ai_model'   => $cached->ai_model,
            'language'   => $cached->language,
            'use_count'  => $cached->use_count,
        ]);
    }

    /**
     * Enregistre une réponse IA en cache.
     * POST /ai-cache
     *
     * Appelé automatiquement par le système après chaque réponse IA réussie.
     * Body : { question, response, language, object_id?, ai_model, expires_at? }
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'question'   => ['required', 'string', 'min:5', 'max:5000'],
            'response'   => ['required', 'string'],
            'language'   => ['required', 'in:fr,en'],
            'object_id'  => ['nullable', 'integer', 'exists:anatomical_objects,id'],
            'ai_model'   => ['nullable', 'string', 'max:100'],
            'expires_at' => ['nullable', 'date'],
        ]);

        $cached = AiCache::create([
            ...$validated,
            'use_count'  => 0,
            'created_at' => now(),
        ]);

        return response()->json(['data' => $cached], 201);
    }

    /**
     * Liste les entrées de cache (admin uniquement).
     * GET /ai-cache
     */
    public function index(Request $request)
    {
        $query = AiCache::with('anatomicalObject:id,name')
            ->latest('created_at');

        if ($request->filled('language')) {
            $query->where('language', $request->language);
        }
        if ($request->filled('object_id')) {
            $query->where('object_id', $request->object_id);
        }
        if ($request->filled('ai_model')) {
            $query->where('ai_model', $request->ai_model);
        }

        if ($request->query('sort') === 'most_used') {
            $query->reorder()->orderByDesc('use_count');
        }

        $limit = min((int) $request->query('limit', 20), 100);
        $data  = $query->paginate($limit);

        return response()->json([
            ...$data->toArray(),
            'empty_message' => $data->isEmpty() ? __('ai_cache.empty_list') : null
        ]);
    }

    /**
     * Supprime une ou toutes les entrées expirées (admin).
     * DELETE /ai-cache/expired  — purge les entrées expirées
     * DELETE /ai-cache/{id}     — supprime une entrée précise
     */
    public function destroy(string $id)
    {
        if ($id === 'expired') {
            $deleted = AiCache::where('expires_at', '<', now())->delete();
            return response()->json(['message' => __('ai_cache.expired_purged', ['count' => $deleted])]);
        }

        AiCache::findOrFail($id)->delete();
        return response()->json(['message' => __('ai_cache.success_delete')]);
    }

    /**
     * Met à jour une entrée de cache.
     * PUT /ai-cache/{id}
     */
    public function update(Request $request, string $id)
    {
        $cached = AiCache::findOrFail($id);
        
        $validated = $request->validate([
            'question'   => ['sometimes', 'string', 'min:5'],
            'response'   => ['sometimes', 'string'],
            'language'   => ['sometimes', 'in:fr,en'],
            'object_id'  => ['nullable', 'integer', 'exists:anatomical_objects,id'],
            'ai_model'   => ['sometimes', 'string', 'max:100'],
            'expires_at' => ['nullable', 'date'],
        ]);

        $cached->update($validated);
        return response()->json(['data' => $cached]);
    }

    /**
     * Analyse des modèles IA les plus actifs (ceux qui ont le plus de cache).
     * GET /ai-cache/active-models
     */
    public function aiModels()
    {
        $models = AiCache::select('ai_model', \DB::raw('count(*) as cache_count'), \DB::raw('sum(use_count) as total_uses'))
            ->groupBy('ai_model')
            ->orderByDesc('cache_count')
            ->get();

        return response()->json([
            'data' => $models,
            'empty_message' => $models->isEmpty() ? __('analytics.empty_ai_models') : null
        ]);
    }
}

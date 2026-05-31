<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lab\StoreLabRequest;
use App\Http\Requests\Lab\UpdateLabRequest;
use App\Models\Lab;
use App\Models\SharedView;
use App\Models\LabParticipant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LabController extends Controller
{
    /**
     * Liste les labs.
     * Retourne :
     *  - Les labs créés par l'utilisateur (is_owner = true)
     *  - Les labs où l'utilisateur est participant mais pas propriétaire (is_owner = false)
     * Admin : voit tout.
     */
    public function index(): JsonResponse
    {
        $user = auth()->user();

        if ($user->role === 'admin') {
            // Admin : tous les labs
            $labs = Lab::with(['sharedViews', 'teacher'])
                ->withCount('participants as total_participants')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($lab) use ($user) {
                    $lab->is_owner = $lab->teacher_id === $user->id;
                    return $lab;
                });
        } else {
            // Teacher / Student : labs créés + labs rejoints
            $created = Lab::with(['sharedViews', 'teacher'])
                ->withCount('participants as total_participants')
                ->where('teacher_id', $user->id)
                ->get()
                ->map(function ($lab) { $lab->is_owner = true; return $lab; });

            $joined = Lab::with(['sharedViews', 'teacher'])
                ->withCount('participants as total_participants')
                ->where('teacher_id', '!=', $user->id)
                ->whereHas('participants', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                })
                ->get()
                ->map(function ($lab) { $lab->is_owner = false; return $lab; });

            $labs = $created->concat($joined)->sortByDesc('created_at')->values();
        }

        return response()->json(['data' => $labs]);
    }

    /**
     * Crée un nouveau lab.
     */
    public function store(StoreLabRequest $request): JsonResponse
    {
        $lab = Lab::create([
            'teacher_id'  => auth()->id(),
            'name'        => $request->validated()['name'],
            'description' => $request->validated()['description'] ?? null,
        ]);

        return response()->json(['data' => $lab], 201);
    }

    /**
     * Détail d'un lab (vue gestion).
     */
    public function show(Lab $lab): JsonResponse
    {
        $this->authorizeTeacherOrAdmin($lab);
        $lab->load(['sharedViews', 'teacher', 'participants']);
        $lab->total_participants = $lab->participants()->count();
        
        return response()->json(['data' => $lab]);
    }

    /**
     * Met à jour un lab.
     */
    public function update(UpdateLabRequest $request, Lab $lab): JsonResponse
    {
        $this->authorizeTeacherOrAdmin($lab);
        $lab->update($request->validated());

        return response()->json(['data' => $lab]);
    }

    /**
     * Supprime plusieurs labs.
     */
    public function bulkDestroy(Request $request): JsonResponse
    {
        $ids = $request->input('ids', []);
        if (empty($ids)) return response()->json(['message' => 'Aucun ID fourni.'], 400);

        $user = auth()->user();
        $query = Lab::whereIn('id', $ids);

        if ($user->role !== 'admin') {
            $query->where('teacher_id', $user->id);
        }

        $count = $query->delete();

        return response()->json(['message' => "$count lab(s) supprimé(s)."]);
    }

    /**
     * Supprime un lab.
     */
    public function destroy(Lab $lab): JsonResponse
    {
        $this->authorizeTeacherOrAdmin($lab);
        $lab->delete();

        return response()->json(['message' => 'Lab supprimé.'], 200);
    }

    /**
     * Associe une SharedView à un Lab.
     */
    public function addSharedView(Lab $lab, string $sharedViewId): JsonResponse
    {
        $this->authorizeTeacherOrAdmin($lab);

        $sharedView = SharedView::findOrFail($sharedViewId);

        if (auth()->user()->role !== 'admin' && $sharedView->teacher_id !== auth()->id()) {
            abort(403, 'Cette vue ne vous appartient pas.');
        }

        if (!$lab->sharedViews()->where('shared_view_id', $sharedView->id)->exists()) {
            \App\Models\LabSharedView::create([
                'id'             => \Illuminate\Support\Str::uuid()->toString(),
                'lab_id'         => $lab->id,
                'shared_view_id' => $sharedView->id,
                'created_at'     => now(),
            ]);
        }

        return response()->json(['message' => 'Vue ajoutée au Lab.']);
    }

    /**
     * Retire une SharedView d'un Lab.
     */
    public function removeSharedView(Lab $lab, string $sharedViewId): JsonResponse
    {
        $this->authorizeTeacherOrAdmin($lab);

        \App\Models\LabSharedView::where('lab_id', $lab->id)
            ->where('shared_view_id', $sharedViewId)
            ->delete();

        return response()->json(['message' => 'Vue retirée du Lab.']);
    }

    /**
     * Retourne les vues du prof pour le sélecteur.
     */
    public function mySharedViews(): JsonResponse
    {
        $user = auth()->user();
        $query = SharedView::orderBy('created_at', 'desc');

        if ($user->role !== 'admin') {
            $query->where('teacher_id', $user->id);
        }

        $views = $query->get();
        return response()->json(['data' => $views]);
    }

    /**
     * Vue publique (étudiant) : ajoute l'étudiant comme participant.
     */
    public function publicShow(Lab $lab): JsonResponse
    {
        $user = auth()->user();

        if ($user) {
            \App\Models\LabParticipant::firstOrCreate([
                'lab_id'  => $lab->id,
                'user_id' => $user->id
            ], [
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'joined_at' => now()
            ]);
        }

        // Chargement du prof
        $lab->load(['teacher']);
        
        // Chargement uniquement des vues VISIBLES pour les étudiants
        $lab->setRelation('sharedViews', $lab->sharedViews()->where('status', 'visible')->get());
        
        $lab->loadCount('participants as total_participants');

        return response()->json(['data' => $lab]);
    }

    /**
     * Supprime plusieurs vues partagées.
     */
    public function bulkDestroySharedViews(Request $request): JsonResponse
    {
        $ids = $request->input('ids', []);
        if (empty($ids)) return response()->json(['message' => 'Aucun ID fourni.'], 400);

        $user = auth()->user();
        $query = \App\Models\SharedView::whereIn('id', $ids);

        if ($user->role !== 'admin') {
            $query->where('teacher_id', $user->id);
        }

        $count = $query->delete();

        return response()->json(['message' => "$count vue(s) supprimée(s)."]);
    }

    /**
     * Met à jour une SharedView (note ou statut).
     */
    public function updateSharedView(Request $request, string $sharedViewId): JsonResponse
    {
        $view = SharedView::findOrFail($sharedViewId);
        $user = auth()->user();

        if ($user->role !== 'admin' && $view->teacher_id !== $user->id) {
            abort(403, 'Action non autorisée.');
        }

        $validated = $request->validate([
            'status' => 'sometimes|in:visible,hidden',
            'teacher_note' => 'sometimes|string|nullable'
        ]);

        $view->update($validated);

        return response()->json(['data' => $view]);
    }

    /**
     * Supprime une SharedView.
     */
    public function destroySharedView(string $sharedViewId): JsonResponse
    {
        $view = SharedView::findOrFail($sharedViewId);
        $user = auth()->user();

        if ($user->role !== 'admin' && $view->teacher_id !== $user->id) {
            abort(403, 'Action non autorisée.');
        }

        $view->delete();

        return response()->json(['message' => 'Vue supprimée.']);
    }

    /**
     * Change le statut (visible/hidden) d'une vue.
     */
    public function updateSharedViewStatus(Request $request, string $sharedViewId): JsonResponse
    {
        return $this->updateSharedView($request, $sharedViewId);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function authorizeTeacherOrAdmin(Lab $lab): void
    {
        $user = auth()->user();
        if ($user->role !== 'admin' && $lab->teacher_id !== $user->id) {
            abort(403, 'Accès refusé.');
        }
    }
}

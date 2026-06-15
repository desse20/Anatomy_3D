<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lab\StoreLabRequest;
use App\Http\Requests\Lab\UpdateLabRequest;
use App\Http\Requests\SharedView\StoreSharedViewRequest;
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

        // Labs créés
        $created = Lab::with(['sharedViews', 'teacher'])
            ->withCount('participants as total_participants')
            ->where('user_id', $user->id)
            ->get()
            ->map(function ($lab) { $lab->is_owner = true; return $lab; });

        // Labs rejoints
        $joined = Lab::with(['sharedViews', 'teacher'])
            ->withCount('participants as total_participants')
            ->where('user_id', '!=', $user->id)
            ->whereHas('participants', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->get()
            ->map(function ($lab) { $lab->is_owner = false; return $lab; });

        $labs = $created->concat($joined)->sortByDesc('created_at')->values();

        return response()->json(['data' => $labs]);
    }

    /**
     * Crée un nouveau lab.
     */
    public function store(StoreLabRequest $request): JsonResponse
    {
        $lab = Lab::create([
            'user_id'  => auth()->id(),
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
        $lab->is_owner = $lab->user_id === auth()->id();
        
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
        if (empty($ids)) return response()->json(['message' => __('messages.lab.no_ids')], 400);

        $user = auth()->user();
        $query = Lab::whereIn('id', $ids)->where('user_id', $user->id);

        $count = $query->delete();

        return response()->json(['message' => __('messages.lab.bulk_deleted', ['count' => $count])]);
    }

    /**
     * Supprime un lab.
     */
    public function destroy(Lab $lab): JsonResponse
    {
        $this->authorizeTeacherOrAdmin($lab);
        $lab->delete();

        return response()->json(['message' => __('messages.lab.deleted')], 200);
    }

    /**
     * Associe une SharedView à un Lab.
     */
    public function addSharedView(Lab $lab, string $sharedViewId): JsonResponse
    {
        $this->authorizeTeacherOrAdmin($lab);

        $sharedView = SharedView::findOrFail($sharedViewId);

        if ($sharedView->user_id !== auth()->id()) {
            abort(403, __('messages.lab.not_owner'));
        }

        if (!$lab->sharedViews()->where('shared_view_id', $sharedView->id)->exists()) {
            \App\Models\LabSharedView::create([
                'id'             => \Illuminate\Support\Str::uuid()->toString(),
                'lab_id'         => $lab->id,
                'shared_view_id' => $sharedView->id,
                'created_at'     => now(),
            ]);
        }

        return response()->json(['message' => __('messages.lab.view_added')]);
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

        return response()->json(['message' => __('messages.lab.view_removed')]);
    }

    /**
     * Crée une nouvelle SharedView.
     */
    public function storeSharedView(StoreSharedViewRequest $request): JsonResponse
    {
        $view = SharedView::create([
            'user_id'         => auth()->id(),
            'asset_3d_id'     => $request->input('asset_3d_id'),
            'status'          => 'hidden',
            'camera_position' => $request->input('camera_position'),
            'camera_target'   => $request->input('camera_target'),
            'scene_state'     => $request->input('scene_state'),
            'teacher_note'    => $request->input('teacher_note'),
        ]);

        return response()->json(['data' => $view], 201);
    }

    /**
     * Retourne les vues du prof pour le sélecteur.
     */
    public function mySharedViews(): JsonResponse
    {
        $query = SharedView::where('user_id', auth()->id())->orderBy('created_at', 'desc');

        $views = $query->with('labs')->get();
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

        $isTeacherOrAdmin = $user && in_array($user->role, ['teacher', 'admin']);

        // Étudiants : uniquement les vues visibles. Teachers/admins : toutes les vues.
        if ($isTeacherOrAdmin) {
            $lab->load(['sharedViews']);
        } else {
            $lab->setRelation('sharedViews', $lab->sharedViews()->where('status', 'visible')->get());
        }
        
        $lab->loadCount('participants as total_participants');
        $lab->is_owner = $lab->user_id === ($user->id ?? null);

        return response()->json(['data' => $lab]);
    }

    /**
     * Supprime plusieurs vues partagées.
     */
    public function bulkDestroySharedViews(Request $request): JsonResponse
    {
        $ids = $request->input('ids', []);
        if (empty($ids)) return response()->json(['message' => __('messages.lab.no_ids')], 400);

        $user = auth()->user();
        $query = \App\Models\SharedView::whereIn('id', $ids)->where('user_id', $user->id);

        $count = $query->delete();

        return response()->json(['message' => __('messages.lab.view_deleted')]);
    }

    /**
     * Met à jour une SharedView (note ou statut).
     */
    public function updateSharedView(Request $request, string $sharedViewId): JsonResponse
    {
        $view = SharedView::findOrFail($sharedViewId);
        $user = auth()->user();

        if ($view->user_id !== $user->id) {
            abort(403, __('messages.general.access_denied'));
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

        if ($view->user_id !== $user->id) {
            abort(403, __('messages.general.access_denied'));
        }

        $view->delete();

        return response()->json(['message' => __('messages.lab.view_deleted')]);
    }

    /**
     * Récupère une SharedView par son ID (pour chargement dans le viewer).
     */
    public function getSharedView(string $sharedViewId): JsonResponse
    {
        $view = SharedView::with('labs')->findOrFail($sharedViewId);
        return response()->json(['data' => $view]);
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
        if ($lab->user_id !== $user->id) {
            abort(403, __('messages.general.access_denied'));
        }
    }
}

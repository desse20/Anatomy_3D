<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lab\StoreLabRequest;
use App\Http\Requests\Lab\UpdateLabRequest;
use App\Models\Lab;
use Illuminate\Http\JsonResponse;

class LabController extends Controller
{
    /**
     * Liste tous les labs de l'enseignant connecté.
     */
    public function index(): JsonResponse
    {
        $labs = Lab::where('teacher_id', auth()->id())
                   ->orderBy('created_at', 'desc')
                   ->get();

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
            'created_at'  => now(),
        ]);

        return response()->json(['data' => $lab], 201);
    }

    /**
     * Détail d'un lab (avec ses SharedViews associées).
     */
    public function show(Lab $lab): JsonResponse
    {
        $this->authorizeTeacher($lab);

        $lab->load('sharedViews');

        return response()->json(['data' => $lab]);
    }

    /**
     * Met à jour un lab.
     */
    public function update(UpdateLabRequest $request, Lab $lab): JsonResponse
    {
        $this->authorizeTeacher($lab);

        $lab->update($request->validated());

        return response()->json(['data' => $lab]);
    }

    /**
     * Supprime un lab.
     */
    public function destroy(Lab $lab): JsonResponse
    {
        $this->authorizeTeacher($lab);

        $lab->delete();

        return response()->json(['message' => 'Lab supprimé.'], 200);
    }

    /**
     * Associe une SharedView à un Lab (via pivot lab_shared_views).
     */
    public function addSharedView(Lab $lab, string $sharedViewId): JsonResponse
    {
        $this->authorizeTeacher($lab);

        // Vérifie que la SharedView appartient au même teacher
        $sharedView = \App\Models\SharedView::where('id', $sharedViewId)
                          ->where('teacher_id', auth()->id())
                          ->firstOrFail();

        // Évite les doublons
        if (!$lab->sharedViews()->where('shared_view_id', $sharedView->id)->exists()) {
            \App\Models\LabSharedView::create([
                'lab_id'         => $lab->id,
                'shared_view_id' => $sharedView->id,
                'created_at'     => now(),
            ]);
        }

        return response()->json(['message' => 'SharedView ajoutée au Lab.']);
    }

    /**
     * Retire une SharedView d'un Lab.
     */
    public function removeSharedView(Lab $lab, string $sharedViewId): JsonResponse
    {
        $this->authorizeTeacher($lab);

        \App\Models\LabSharedView::where('lab_id', $lab->id)
            ->where('shared_view_id', $sharedViewId)
            ->delete();

        return response()->json(['message' => 'SharedView retirée du Lab.']);
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    private function authorizeTeacher(Lab $lab): void
    {
        if ($lab->teacher_id !== auth()->id()) {
            abort(403, 'Accès refusé. Ce lab ne vous appartient pas.');
        }
    }
}

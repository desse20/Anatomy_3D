<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    /**
     * GET /api/conversations
     * Liste les conversations de l'étudiant connecté.
     */
    public function index()
    {
        $conversations = Conversation::where('student_id', auth()->id())
            ->withCount('chats')
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'created_at', 'updated_at']);

        return response()->json(['data' => $conversations]);
    }

    /**
     * POST /api/conversations
     * Crée une nouvelle conversation.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $conversation = Conversation::create([
            'student_id' => auth()->id(),
            'name' => $validated['name'] ?? 'Nouvelle discussion',
        ]);

        return response()->json(['data' => $conversation], 201);
    }

    /**
     * PUT /api/conversations/{id}
     * Renomme une conversation.
     */
    public function update(Request $request, string $id)
    {
        $conversation = Conversation::where('id', $id)
            ->where('student_id', auth()->id())
            ->firstOrFail();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $conversation->update(['name' => $validated['name']]);

        return response()->json(['data' => $conversation]);
    }

    /**
     * DELETE /api/conversations/{id}
     * Supprime une conversation et ses messages (cascade).
     */
    public function destroy(string $id)
    {
        $conversation = Conversation::where('id', $id)
            ->where('student_id', auth()->id())
            ->firstOrFail();

        $conversation->delete();

        return response()->json(['message' => 'Conversation supprimée.']);
    }

    /**
     * GET /api/conversations/{id}/messages
     * Retourne les messages d'une conversation.
     */
    public function messages(string $id)
    {
        $conversation = Conversation::where('id', $id)
            ->where('student_id', auth()->id())
            ->firstOrFail();

        $chats = $conversation->chats()
            ->orderBy('created_at', 'asc')
            ->get(['id', 'input', 'output', 'created_at']);

        return response()->json(['data' => $chats]);
    }
}

// front_3D/src/services/ai.ts
import { apiCall } from './api';

export interface AiResponse {
    chat_id?: string;
    conversation_id?: string;
    model: string;
    source?: string;
    response: string;
}

export interface ChatMessage {
    id: string;
    input: string;
    output: string;
    created_at: string;
}

export interface ConversationItem {
    id: string;
    name: string;
    chats_count?: number;
    created_at: string;
    updated_at: string;
}

export const aiService = {
    /**
     * Envoie un message à l'IA et retourne la réponse persistée.
     * @param model           - modèle HuggingFace / Ollama
     * @param input           - texte du message de l'utilisateur
     * @param bone            - objet anatomique ciblé (optionnel)
     * @param type            - 'explain' | 'quiz'
     * @param conversation_id - UUID de la conversation pour regrouper les messages
     */
    generate: async (
        model: string,
        input: string,
        bone?: string,
        type?: string,
        conversation_id?: string,
    ): Promise<AiResponse> => {
        const data: AiResponse = await apiCall('/ai/generate', {
            method: 'POST',
            body: JSON.stringify({ model, input, bone, type, conversation_id }),
        });

        if ((data as any).error) {
            throw new Error((data as any).error);
        }

        return data;
    },

    // ── CONVERSATIONS ─────────────────────────────────────────────────────────

    /** Liste toutes les conversations de l'étudiant. */
    listConversations: async (): Promise<ConversationItem[]> => {
        const data: any = await apiCall('/conversations');
        return data.data ?? [];
    },

    /** Crée une nouvelle conversation et retourne son objet. */
    createConversation: async (name?: string): Promise<ConversationItem> => {
        const data: any = await apiCall('/conversations', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
        return data.data;
    },

    /** Renomme une conversation. */
    renameConversation: async (id: string, name: string): Promise<ConversationItem> => {
        const data: any = await apiCall(`/conversations/${id}`, {
            method: 'POST',
            body: JSON.stringify({ name, _method: 'PUT' }),
        });
        return data.data;
    },
    
    /** Supprime une conversation (et ses messages en cascade). */
    deleteConversation: async (id: string): Promise<void> => {
        await apiCall(`/conversations/${id}`, { 
            method: 'POST',
            body: JSON.stringify({ _method: 'DELETE' }),
        });
    },

    /** Récupère les messages d'une conversation. */
    getMessages: async (conversationId: string): Promise<ChatMessage[]> => {
        const data: any = await apiCall(`/conversations/${conversationId}/messages`);
        return data.data ?? [];
    },
};

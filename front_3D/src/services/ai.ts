// front_3D/src/services/ai.ts
import { apiCall } from './api';

export interface AiResponse {
    chat_id?: string;
    conversation_id?: string;
    model: string;
    source?: string;
    response: string;
    job_id?: string; // Ajouté
    status?: string; // Ajouté
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
    /** Lancement initial du job IA */
    startGenerate: async (
        model: string,
        input: string,
        bone?: string,
        type?: string,
        conversation_id?: string,
    ): Promise<AiResponse> => {
        const data: any = await apiCall('/ai/generate', {
            method: 'POST',
            body: JSON.stringify({ model, input, bone, type, conversation_id }),
        });
        if (data.error) throw new Error(data.error);
        return data;
    },

    /** Polling du statut d'un job */
    pollStatus: async (jobId: string): Promise<AiResponse> => {
        return await apiCall(`/ai/status/${jobId}`);
    },

    /** Ancienne méthode (gardée pour compatibilité ou usage direct bloquant) */
    generate: async (
        model: string,
        input: string,
        bone?: string,
        type?: string,
        conversation_id?: string,
    ): Promise<AiResponse> => {
        const initial = await aiService.startGenerate(model, input, bone, type, conversation_id);
        
        if (initial.status === 'pending' && initial.job_id) {
            return new Promise((resolve, reject) => {
                let attempts = 0;
                const poll = setInterval(async () => {
                    try {
                        attempts++;
                        const res = await aiService.pollStatus(initial.job_id!);
                        if (res.status === 'done') { clearInterval(poll); resolve(res); }
                        else if (res.status === 'error') { clearInterval(poll); reject(new Error(res.response)); }
                        else if (attempts > 60) { clearInterval(poll); reject(new Error('Timeout')); }
                    } catch (e) { clearInterval(poll); reject(e); }
                }, 2000);
            });
        }
        return initial;
    },

    listConversations: async (): Promise<ConversationItem[]> => {
        const data: any = await apiCall('/conversations');
        return data.data ?? [];
    },

    createConversation: async (name?: string): Promise<ConversationItem> => {
        const data: any = await apiCall('/conversations', { method: 'POST', body: JSON.stringify({ name }) });
        return data.data;
    },

    renameConversation: async (id: string, name: string): Promise<ConversationItem> => {
        const data: any = await apiCall(`/conversations/${id}`, { method: 'POST', body: JSON.stringify({ name, _method: 'PUT' }) });
        return data.data;
    },

    deleteConversation: async (id: string): Promise<void> => {
        await apiCall(`/conversations/${id}`, { method: 'POST', body: JSON.stringify({ _method: 'DELETE' }) });
    },

    getMessages: async (conversationId: string): Promise<ChatMessage[]> => {
        const data: any = await apiCall(`/conversations/${conversationId}/messages`);
        return data.data ?? [];
    },
};

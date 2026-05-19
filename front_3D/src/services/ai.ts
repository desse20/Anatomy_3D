// front_3D/src/services/ai.ts
import { apiCall } from './api';

export interface AiResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
}

export const aiService = {
    generate: async (model: string, prompt: string, bone?: string, type?: string): Promise<string> => {
        try {
            // Use the Laravel proxy to avoid CORS issues and improve reliability
            const data: any = await apiCall('/ai/generate', {
                method: 'POST',
                body: JSON.stringify({
                    model,
                    prompt,
                    bone,
                    type,
                }),
            });

            console.log("📥 [AI_BACKEND_RAW]:", data);

            if (data.error) {
                throw new Error(data.error);
            }

            return data.response;
        } catch (error) {
            console.error("Failed to call AI Service (via Proxy):", error);
            throw error;
        }
    }
};

// front_3D/src/services/ollama.ts
import { apiCall } from './api';

export interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
}

export const ollamaService = {
    generate: async (model: string, prompt: string): Promise<string> => {
        try {
            // Use the Laravel proxy to avoid CORS issues and improve reliability
            const data: any = await apiCall('/ai/generate', {
                method: 'POST',
                body: JSON.stringify({
                    model,
                    prompt,
                }),
            });

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

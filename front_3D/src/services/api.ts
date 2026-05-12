// front_3D/src/services/api.ts
const API_BASE_URL = 'http://localhost:8000/api';

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(errorData.message || 'Une erreur est survenue');
            (error as any).data = errorData; // On attache les données (ex: errors de validation)
            throw error;
        }

        return response.json();
    } catch (error: any) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('Le serveur est injoignable. Veuillez réessayer plus tard.');
        }
        throw error;
    }
};

export const authService = {
    login: (credentials: any) => apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
    }),
    register: (userData: any) => apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
    }),
    logout: () => apiCall('/auth/logout', { method: 'POST' }),
    me: () => apiCall('/auth/me', { method: 'GET' }),
};

export const userService = {
    changePassword: (data: any) => apiCall('/users/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
};

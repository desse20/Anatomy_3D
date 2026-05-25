// front_3D/src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://10.85.3.181:8000/api';

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    
    // S'assurer qu'il n'y a pas de double slash
    const fullUrl = `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
    console.log(`Calling API: ${fullUrl} [${options.method || 'GET'}]`);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': localStorage.getItem('app_lang') || 'fr',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(fullUrl, {
            ...options,
            headers,
        });

        const lang = localStorage.getItem('app_lang') || 'fr';

        if (!response.ok) {
            let errorData = {};
            try {
                errorData = await response.json();
            } catch (e) {
                // Not JSON
            }
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return;
            }
            const defaultMsg = lang === 'fr' ? 'Une erreur est survenue' : 'An error occurred';
            const error = new Error((errorData as any).message || (errorData as any).error || defaultMsg);
            (error as any).data = errorData;
            throw error;
        }

        return response.json();
    } catch (error: any) {
        console.error('API Error:', error);
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
    sendRegistrationCode: (userData: any) => apiCall('/auth/register/send-code', {
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
    updateProfile: (data: any) => apiCall('/users/profile', {
        method: 'POST', // On utilise POST pour contourner les blocages PUT
        body: JSON.stringify({ ...data, _method: 'PUT' }),
    }),
    deleteAccount: (password: string) => apiCall('/users/profile', {
        method: 'POST', // On utilise POST pour contourner les blocages DELETE
        body: JSON.stringify({ password, _method: 'DELETE' }),
    }),
};

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

export const fetchBlob = async (endpoint: string): Promise<Blob> => {
    const token = localStorage.getItem('token');
    const fullUrl = `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(fullUrl, { headers });
    if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
    return response.blob();
};

export const downloadWithProgress = (endpoint: string, onProgress: (pct: number) => void): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const token = localStorage.getItem('token');
        const fullUrl = `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', fullUrl);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.responseType = 'blob';
        xhr.onprogress = (e) => {
            if (e.lengthComputable) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.response);
            } else {
                reject(new Error(`Download failed: ${xhr.status}`));
            }
        };
        xhr.onerror = () => reject(new Error('Network error during download'));
        xhr.send();
    });
};

export const anatomyService = {
    /** Récupère TOUTE la hiérarchie pour le mapper 3D */
    getAll: () => apiCall('/anatomy/all'),
    /** Récupère les racines de la hiérarchie (Skeletal System, etc.) */
    getRoots: () => apiCall('/anatomy/roots'),
    /** Récupère un sous-arbre complet à partir d'un nom de node */
    getSubtree: (name: string) => apiCall(`/anatomy/subtree/${encodeURIComponent(name)}`),
    /** Recherche des structures anatomiques */
    search: (query: string) => apiCall(`/anatomy/search?q=${encodeURIComponent(query)}`),
};

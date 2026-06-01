/**
 * Retourne les options de thème pour SweetAlert2
 * en détectant automatiquement le mode clair/sombre.
 */
export const getSwalTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    return {
        background: isDark ? 'rgb(1, 11, 37)' : '#ffffff',
        color:      isDark ? '#f9fafb'         : '#18181b',
    };
};

/**
 * Options communes pour les toasts (coin supérieur droit)
 */
export const getSwalToast = () => ({
    toast: true,
    position: 'top-end' as const,
    showConfirmButton: false,
    timer: 1500,
    ...getSwalTheme(),
});

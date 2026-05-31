import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const token = localStorage.getItem('token');
    const location = useLocation();
    
    if (!token) {
        localStorage.setItem('intended_url', location.pathname + location.search);
        return <Navigate to="/login" replace />;
    }
    
    return <>{children}</>;
};

export const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const token = localStorage.getItem('token');
    
    if (token) {
        return <Navigate to="/dash" replace />;
    }
    
    return <>{children}</>;
};

export const RoleRoute: React.FC<{ children: React.ReactNode, allowedRoles: string[] }> = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('token');
    const location = useLocation();
    
    if (!token) {
        localStorage.setItem('intended_url', location.pathname + location.search);
        return <Navigate to="/login" replace />;
    }
    
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            localStorage.setItem('intended_url', location.pathname + location.search);
            return <Navigate to="/login" replace />;
        }
        
        const user = JSON.parse(userStr);
        const userRole = user.role || 'student';
        
        const hierarchy: Record<string, number> = {
            'student': 1,
            'teacher': 2,
            'admin': 3
        };

        const userWeight = hierarchy[userRole] || 0;

        // On vérifie si l'utilisateur a un poids suffisant pour au moins l'un des rôles autorisés
        const isAuthorized = allowedRoles.some(role => {
            const requiredWeight = hierarchy[role] || 999;
            return userWeight >= requiredWeight;
        });

        if (!isAuthorized) {
            return <Navigate to="/forbidden" replace />;
        }
    } catch (e) {
        localStorage.setItem('intended_url', location.pathname + location.search);
        return <Navigate to="/login" replace />;
    }
    
    return <>{children}</>;
};

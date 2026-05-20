import React from 'react';
import { Navigate } from 'react-router-dom';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const token = localStorage.getItem('token');
    
    if (!token) {
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
    
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return <Navigate to="/login" replace />;
        
        const user = JSON.parse(userStr);
        const userRole = user.role || 'student';
        
        // Suppression du passe-droit admin par défaut pour respecter l'étanchéité des rôles demandée
        
        if (!allowedRoles.includes(userRole)) {
            return <Navigate to="/forbidden" replace />;
        }
    } catch (e) {
        return <Navigate to="/login" replace />;
    }
    
    return <>{children}</>;
};

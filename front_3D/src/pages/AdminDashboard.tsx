import React, { useState, useEffect } from 'react';
import { Users, UploadCloud, Search, Filter } from 'lucide-react';
import App from '../components/layouts/App';
import { apiCall } from '../services/api';

const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (roleFilter) params.append('role', roleFilter);
            
            const url = `users${params.toString() ? '?' + params.toString() : ''}`;
            
            const res = await apiCall(url);
            // Si res est directement le tableau ou contient .data
            const usersList = Array.isArray(res) ? res : (res.data || []);
            setUsers(usersList);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (activeTab === 'users') {
            const delayDebounceFn = setTimeout(() => {
                fetchUsers();
            }, 300); // Effectue la recherche 300ms après la dernière touche

            return () => clearTimeout(delayDebounceFn);
        }
    }, [activeTab, search, roleFilter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
    };

    return (
        <App breadcrumb="Tableau de bord Administrateur" title="Supervision des Utilisateurs">
            
            <div style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '12px', overflow: 'hidden' }}>
                
                <div style={{ padding: '20px', borderBottom: '1px solid var(--dash-border)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '11px', color: 'var(--dash-text-muted)' }} />
                        <input 
                            type="text" 
                            placeholder="Rechercher par nom, email..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '10px 16px 10px 44px', borderRadius: '8px', border: '1px solid var(--dash-border)', background: 'transparent', color: 'var(--dash-text)', fontSize: '14px' }}
                        />
                    </form>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={18} color="var(--dash-text-muted)" />
                        <select 
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--dash-border)', background: 'var(--dash-bg)', color: 'var(--dash-text)', fontSize: '14px', outline: 'none' }}>
                            <option value="" style={{ background: 'var(--dash-bg)' }}>Tous les rôles</option>
                            <option value="student" style={{ background: 'var(--dash-bg)' }}>Étudiants</option>
                            <option value="teacher" style={{ background: 'var(--dash-bg)' }}>Professeurs</option>
                            <option value="admin" style={{ background: 'var(--dash-bg)' }}>Administrateurs</option>
                        </select>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--dash-border)' }}>
                                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>Utilisateur</th>
                                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>Rôle</th>
                                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>Email</th>
                                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>Inscrit le</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--dash-text-muted)' }}>Chargement...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--dash-text-muted)' }}>Aucun utilisateur trouvé.</td></tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--dash-border)' }}>
                                        <td style={{ padding: '16px 20px', fontWeight: 500 }}>{u.firstname} {u.lastname}</td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', background: u.role === 'admin' ? '#f8717120' : u.role === 'teacher' ? '#fbbf2420' : '#34d39920', color: u.role === 'admin' ? '#f87171' : u.role === 'teacher' ? '#fbbf24' : '#34d399' }}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 20px', color: 'var(--dash-text-muted)', fontSize: '14px' }}>{u.email}</td>
                                        <td style={{ padding: '16px 20px', color: 'var(--dash-text-muted)', fontSize: '14px' }}>
                                            {new Date(u.created_at).toLocaleDateString('fr-FR')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </App>
    ); 
};

export default AdminDashboard;

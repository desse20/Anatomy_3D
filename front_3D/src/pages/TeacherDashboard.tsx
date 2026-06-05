import React, { useState, useEffect } from 'react';
import { Presentation, Plus, Trash2, X, Edit2, Users, Layout, AlertCircle, Share2, Eye, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import App from '../components/layouts/App';
import { useLanguage } from '../contexts/LanguageContext';
import { apiCall } from '../services/api';
import { getSwalTheme, getSwalToast } from '../services/swalTheme';

const LabModal = ({ isOpen, title, formData, setFormData, onSubmit, onClose, submitLabel, language, error, setError }: any) => {
    if (!isOpen) return null;
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: 'var(--dash-bg)', width: '100%', maxWidth: '450px', borderRadius: '20px', border: '1px solid var(--dash-border)', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--dash-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '20px' }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--dash-text-muted)', cursor: 'pointer' }}><X size={24} /></button>
                </div>
                <form onSubmit={onSubmit} style={{ padding: '24px' }}>
                    {error && (
                        <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                            <AlertCircle size={16} /> 
                            <span style={{ flex: 1 }}>{error}</span>
                            <button type="button" onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '2px' }}><X size={14} /></button>
                        </div>
                    )}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--dash-text-muted)', marginBottom: '8px' }}>{t('Nom', 'Name')}</label>
                        <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--dash-border)', background: 'rgba(0,0,0,0.02)', color: 'var(--dash-text)', outline: 'none' }} />
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--dash-text-muted)', marginBottom: '8px' }}>{t('Description', 'Description')}</label>
                        <textarea rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--dash-border)', background: 'rgba(0,0,0,0.02)', color: 'var(--dash-text)', outline: 'none', resize: 'none' }} />
                    </div>
                    <button type="submit" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#fbbf24', color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}>{submitLabel}</button>
                </form>
            </div>
        </div>
    );
};

const TeacherDashboard: React.FC = () => {
    const { language } = useLanguage();
    const navigate = useNavigate();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;
    
    const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
    const isTeacherOrAdmin = currentUser.role === 'teacher' || currentUser.role === 'admin';
    const isStudent = currentUser.role === 'student';

    const [labs, setLabs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Separation des labs
    const myLabs     = labs.filter(l => l.is_owner !== false);
    const joinedLabs = labs.filter(l => l.is_owner === false);
    
    const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
    const [newLabData, setNewLabData] = useState({ name: '', description: '' });
    const [createError, setCreateError] = useState<string | null>(null);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingLab, setEditingLab] = useState<any>(null);
    const [editData, setEditData] = useState({ name: '', description: '' });
    const [editError, setEditError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchLabs = async () => {
        setLoading(true);
        try {
            const res = await apiCall('labs');
            setLabs(res.data || []);
            setSelectedIds([]);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => {
        fetchLabs();
        // Poll pour mettre à jour le nombre de participants en temps réel
        const interval = setInterval(fetchLabs, 15000); // Rafraîchir toutes les 15 secondes
        return () => clearInterval(interval);
    }, []);

    const handleCreateLab = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);
        try {
            await apiCall('labs', { method: 'POST', body: JSON.stringify(newLabData) });
            setIsAddSectionOpen(false);
            setNewLabData({ name: '', description: '' });
            fetchLabs();
            Swal.fire({ title: t('Succès !', 'Success!'), text: t('Salle créée avec succès.', 'Lab created successfully.'), icon: 'success', timer: 1500, showConfirmButton: false, ...getSwalTheme() });
        } catch (e: any) {
            setCreateError(e.errors?.name?.[0] || e.message || "Erreur.");
        }
    };

    const handleDeleteLab = async (lab: any) => {
        const result = await Swal.fire({
            title: t('Supprimer la salle ?', 'Delete lab?'),
            text: t(`Voulez-vous vraiment supprimer "${lab.name}" ? Cette action est irréversible.`, `Are you sure you want to delete "${lab.name}"? This action is irreversible.`),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            cancelButtonColor: '#6b7280',
            confirmButtonText: t('Oui, supprimer', 'Yes, delete'),
            cancelButtonText: t('Annuler', 'Cancel'),
            ...getSwalTheme()
        });

        if (result.isConfirmed) {
            try {
                await apiCall(`labs/${lab.id}`, { method: 'POST', body: JSON.stringify({ _method: 'DELETE' }) });
                fetchLabs();
                Swal.fire({ title: t('Supprimé !', 'Deleted!'), icon: 'success', timer: 1000, showConfirmButton: false, ...getSwalTheme() });
            } catch (e) { Swal.fire({ title: 'Erreur', text: 'Impossible de supprimer.', icon: 'error', ...getSwalTheme() }); }
        }
    };

    const handleBulkDelete = async () => {
        const result = await Swal.fire({
            title: t('Supprimer la sélection ?', 'Delete selection?'),
            text: t('Toutes les données associées seront perdues.', 'All associated data will be lost.'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            cancelButtonColor: '#6b7280',
            confirmButtonText: t('Supprimer', 'Delete'),
            cancelButtonText: t('Annuler', 'Cancel'),
            ...getSwalTheme()
        });

        if (result.isConfirmed) {
            try {
                await apiCall('labs/bulk-delete', { method: 'POST', body: JSON.stringify({ ids: selectedIds }) });
                fetchLabs();
                Swal.fire({ title: t('Supprimé !', 'Deleted!'), icon: 'success', timer: 1500, showConfirmButton: false, ...getSwalTheme() });
            } catch (e) { Swal.fire({ title: 'Erreur', text: 'Erreur lors de la suppression groupée.', icon: 'error', ...getSwalTheme() }); }
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === myLabs.length) setSelectedIds([]);
        else setSelectedIds(myLabs.map(l => l.id));
    };

    const toggleSelectOne = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const [activeTab, setActiveTab] = useState<'my' | 'joined'>('my');

    return (
        <App breadcrumb={t('Espace Personnel', 'Personal Space')} title={isStudent ? t('Mes Salles Rejointes', 'My Joined Labs') : t('Mes Salles de Cours (Labs)', 'My Labs')}>
            
            {/* --- Onglets de Filtrage (Teacher/Admin seulement) --- */}
            {isTeacherOrAdmin && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', background: 'rgba(0,0,0,0.02)', padding: '6px', borderRadius: '12px', width: 'fit-content', border: '1px solid var(--dash-border)', flexWrap: 'wrap' }}>
                    <button 
                        onClick={() => setActiveTab('my')}
                        style={{ flex: '1 1 auto', padding: '10px 24px', borderRadius: '10px', border: 'none', background: activeTab === 'my' ? 'var(--dash-bg)' : 'transparent', color: activeTab === 'my' ? '#fbbf24' : 'var(--dash-text-muted)', fontWeight: 700, cursor: 'pointer', boxShadow: activeTab === 'my' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', transition: '0.2s' }}
                    >
                        {t('Mes Salles', 'My Labs')} ({myLabs.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('joined')}
                        style={{ flex: '1 1 auto', padding: '10px 24px', borderRadius: '10px', border: 'none', background: activeTab === 'joined' ? 'var(--dash-bg)' : 'transparent', color: activeTab === 'joined' ? '#fbbf24' : 'var(--dash-text-muted)', fontWeight: 700, cursor: 'pointer', boxShadow: activeTab === 'joined' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', transition: '0.2s' }}
                    >
                        {t('Salles rejointes', 'Joined Labs')} ({joinedLabs.length})
                    </button>
                </div>
            )}

            <div className="dash-header-actions" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {selectedIds.length > 0 && isTeacherOrAdmin && activeTab === 'my' && (
                        <button 
                            onClick={handleBulkDelete}
                            style={{ background: '#f43f5e', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(244, 63, 94, 0.2)', fontSize: '13px' }}
                        >
                            <Trash2 size={18} /> {t('Supprimer', 'Delete')} ({selectedIds.length})
                        </button>
                    )}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', color: 'var(--dash-text-muted)' }} />
                        <input 
                            type="text" 
                            placeholder={t('Rechercher...', 'Search...')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: '100%', maxWidth: '280px', padding: '10px 16px 10px 44px', borderRadius: '12px', border: '1px solid var(--dash-border)', background: 'var(--dash-bg)', color: 'var(--dash-text)', outline: 'none' }}
                        />
                    </div>
                </div>
                {isTeacherOrAdmin && !isAddSectionOpen && activeTab === 'my' && (
                    <button 
                        onClick={() => { setIsAddSectionOpen(true); setCreateError(null); }}
                        style={{ background: '#fbbf24', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(251, 191, 36, 0.2)' }}
                    >
                        <Plus size={20} /> {t('Ajouter', 'Add')}
                    </button>
                )}
            </div>

            {isTeacherOrAdmin && isAddSectionOpen && activeTab === 'my' && (
                <div style={{ marginBottom: '32px', background: 'var(--dash-bg)', padding: '24px', borderRadius: '20px', border: '1px solid #fbbf2440', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}><Layout size={20} color="#fbbf24" /> {t('Nouvelle salle de cours', 'New Classroom')}</h3>
                        <button onClick={() => setIsAddSectionOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--dash-text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                    </div>
                    {createError && (
                        <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', borderRadius: '10px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(244, 63, 94, 0.2)', position: 'relative' }}>
                            <AlertCircle size={18} /> <span style={{ flex: 1 }}>{createError}</span>
                            <button onClick={() => setCreateError(null)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}><X size={14} /></button>
                        </div>
                    )}
                    <form onSubmit={handleCreateLab} className="dash-header-actions" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, minWidth: '240px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>{t('Nom de la séance', 'Session Name')}</label>
                            <input type="text" required placeholder="ex: Anatomie du Coeur" value={newLabData.name} onChange={(e) => setNewLabData({...newLabData, name: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--dash-border)', background: 'rgba(0,0,0,0.02)', color: 'var(--dash-text)', outline: 'none' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: '240px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>{t('Description', 'Description')}</label>
                            <input type="text" placeholder="..." value={newLabData.description} onChange={(e) => setNewLabData({...newLabData, description: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--dash-border)', background: 'rgba(0,0,0,0.02)', color: 'var(--dash-text)', outline: 'none' }} />
                        </div>
                        <button type="submit" style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', background: '#fbbf24', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{t('Générer', 'Generate')}</button>
                    </form>
                </div>
            )}

            {/* ── Section GESTION (Pour Teacher/Admin) ── */}
            {isTeacherOrAdmin && activeTab === 'my' && (
                <div style={{ marginBottom: joinedLabs.length > 0 ? '40px' : '0' }}>
                    <div className="table-container-responsive" style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--dash-border)' }}>
                                    <th style={{ padding: '16px 20px', width: '40px' }}>
                                        <input type="checkbox" checked={myLabs.length > 0 && selectedIds.length === myLabs.length} onChange={toggleSelectAll} style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#fbbf24' }} />
                                    </th>
                                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t('Salle', 'Lab')}</th>
                                    <th className="hide-mobile" style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t('Participants', 'Participants')}</th>
                                    <th className="hide-mobile" style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t('Date', 'Date')}</th>
                                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t('Partage', 'Share')}</th>
                                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>{t('Actions', 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center' }}>{t('Chargement...', 'Loading...')}</td></tr>
                                ) : myLabs.length === 0 ? (
                                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--dash-text-muted)' }}>{t('Aucune salle créée.', 'No labs created.')}</td></tr>
                                ) : (
                                    (() => {
                                        const filtered = myLabs.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()) || (l.description || '').toLowerCase().includes(searchTerm.toLowerCase()));
                                        if (filtered.length === 0 && searchTerm) {
                                            return <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--dash-text-muted)' }}>{t('Aucune salle ne correspond à votre recherche.', 'No labs match your search.')}</td></tr>;
                                        }
                                        return filtered.map(lab => (
                                        <tr key={lab.id} style={{ borderBottom: '1px solid var(--dash-border)', background: selectedIds.includes(lab.id) ? 'rgba(251, 191, 36, 0.03)' : 'transparent', transition: '0.2s' }}>
                                            <td style={{ padding: '16px 20px' }}>
                                                <input type="checkbox" checked={selectedIds.includes(lab.id)} onChange={() => toggleSelectOne(lab.id)} style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#fbbf24' }} />
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '40px', height: '40px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                                                        <Presentation size={20} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: 'var(--dash-text)' }}>{lab.name}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--dash-text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lab.description || t('Pas de description', 'No description')}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hide-mobile" style={{ padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--dash-text)', fontWeight: 600 }}>
                                                    <Users size={16} color="#34d399" />
                                                    {lab.total_participants ?? 0}
                                                </div>
                                            </td>
                                            <td className="hide-mobile" style={{ padding: '16px 20px', color: 'var(--dash-text-muted)', fontSize: '13px' }}>
                                                {new Date(lab.created_at).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <code className="hide-mobile" style={{ background: 'rgba(0,0,0,0.03)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', color: '#fbbf24', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {`${window.location.origin}/salle/${lab.id}`}
                                                    </code>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`${window.location.origin}/salle/${lab.id}`);
                                                            Swal.fire({ icon: 'success', title: 'Lien copié !', ...getSwalToast() });
                                                        }}
                                                        style={{ border: 'none', background: 'none', color: '#fbbf24', cursor: 'pointer', padding: '4px' }}
                                                        title="Copier le lien complet"
                                                    >
                                                        <Share2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                    <button onClick={() => navigate(`/salle/${lab.id}`)} style={{ background: 'rgba(14, 165, 233, 0.1)', border: 'none', color: '#0ea5e9', padding: '8px', borderRadius: '8px', cursor: 'pointer' }} title="Voir la salle"><Eye size={16} /></button>
                                                    <button onClick={() => { setEditingLab(lab); setEditData({ name: lab.name, description: lab.description || '' }); setEditError(null); setIsEditOpen(true); }} style={{ background: 'rgba(99, 102, 241, 0.1)', border: 'none', color: '#6366f1', padding: '8px', borderRadius: '8px', cursor: 'pointer' }} title="Modifier"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteLab(lab)} style={{ background: 'rgba(244, 63, 94, 0.1)', border: 'none', color: '#f43f5e', padding: '8px', borderRadius: '8px', cursor: 'pointer' }} title="Supprimer"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ));
                                    })()
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Section REJOINTE (WhatsApp Style - Pour tous si joinedLabs existe) ── */}
            {(isStudent || (isTeacherOrAdmin && activeTab === 'joined')) && (
                <div>
                    {!isStudent && joinedLabs.length > 0 && (
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--dash-text-muted)' }}>
                            {t('Salles Rejointes', 'Joined Labs')}
                        </h3>
                    )}
                    <div style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '16px', overflow: 'hidden' }}>
                        {loading && joinedLabs.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--dash-text-muted)' }}>{t('Chargement...', 'Loading...')}</div>
                        ) : joinedLabs.length === 0 ? (
                            <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--dash-text-muted)', fontSize: '14px' }}>
                                <Presentation size={40} style={{ opacity: 0.2, margin: '0 auto 16px', display: 'block' }} />
                                {t("Aucune salle trouvée.", "No labs found.")}
                            </div>
                        ) : (
                            (() => {
                                const filtered = joinedLabs.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()) || (l.description || '').toLowerCase().includes(searchTerm.toLowerCase()));
                                if (filtered.length === 0 && searchTerm) {
                                    return <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--dash-text-muted)', fontSize: '14px' }}>{t("Aucune salle ne correspond à votre recherche.", "No labs match your search.")}</div>;
                                }
                                return filtered.map((lab, i) => {
                                const date = new Date(lab.created_at);
                                const now = new Date();
                                const diffMs = now.getTime() - date.getTime();
                                const diffMins = Math.floor(diffMs / 60000);
                                const diffHours = Math.floor(diffMins / 60);
                                const diffDays = Math.floor(diffHours / 24);
                                let timeLabel = '';
                                if (diffMins < 1) timeLabel = t("À l'instant", 'Just now');
                                else if (diffMins < 60) timeLabel = `${diffMins} min`;
                                else if (diffHours < 24) timeLabel = `${diffHours}h`;
                                else if (diffDays < 7) timeLabel = `${diffDays}j`;
                                else timeLabel = date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit' });

                                return (
                                    <div
                                        key={lab.id}
                                        onClick={() => navigate(`/salle/${lab.id}`)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '14px',
                                            padding: '14px 20px',
                                            borderBottom: i < joinedLabs.length - 1 ? '1px solid var(--dash-border)' : 'none',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--dash-accent-hover)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <div style={{ width: '48px', height: '48px', flexShrink: 0, background: 'rgba(251,191,36,0.13)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                                            <Presentation size={22} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--dash-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {lab.name}
                                            </div>
                                            <div style={{ fontSize: '13px', color: 'var(--dash-text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {lab.description || t('Appuyer pour rejoindre', 'Tap to join')}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--dash-text-muted)', flexShrink: 0, alignSelf: 'flex-start', marginTop: '2px' }}>
                                            {timeLabel}
                                        </div>
                                    </div>
                                );
                            })
                            })()
                        )}
                    </div>
                </div>
            )}


            <LabModal 
                isOpen={isEditOpen} 
                title={t('Modifier la salle', 'Edit Lab')} 
                formData={editData} 
                setFormData={setEditData} 
                onSubmit={async (e: any) => {
                    e.preventDefault();
                    setEditError(null);
                    try {
                        await apiCall(`labs/${editingLab.id}`, { method: 'POST', body: JSON.stringify({ ...editData, _method: 'PUT' }) });
                        setIsEditOpen(false);
                        fetchLabs();
                        Swal.fire({ icon: 'success', title: t('Mis à jour', 'Updated'), timer: 1000, showConfirmButton: false, ...getSwalTheme() });
                    } catch (err: any) { setEditError(err.errors?.name?.[0] || err.message || "Erreur."); }
                }} 
                onClose={() => setIsEditOpen(false)} 
                submitLabel={t('Enregistrer les modifications', 'Save Changes')} 
                language={language}
                error={editError}
                setError={setEditError}
            />
        </App>
    );
};

export default TeacherDashboard;

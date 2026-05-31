import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Presentation, User, Calendar, ExternalLink, X,
    Loader2, Plus, Trash2, Users, Eye, EyeOff
} from 'lucide-react';
import App from '../components/layouts/App';
import { apiCall } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const LabViewer: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { language } = useLanguage();
    const navigate = useNavigate();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

    const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
    const isTeacherOrAdmin = currentUser.role === 'teacher' || currentUser.role === 'admin';

    const [lab, setLab]         = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);
    const [isOwner, setIsOwner] = useState(false);

    // Pour le prof propriétaire : ses SharedViews disponibles
    const [myViews, setMyViews]               = useState<any[]>([]);
    const [addingView, setAddingView]         = useState(false);
    const [selectedViewId, setSelectedViewId] = useState('');

    const fetchLab = async () => {
        setLoading(true);
        try {
            // Essai en tant que propriétaire d'abord (teacher endpoint)
            // Si 403 → on utilise l'endpoint public (rejoindre comme participant)
            if (isTeacherOrAdmin) {
                try {
                    const res = await apiCall(`labs/${id}`);
                    setLab(res.data);
                    setIsOwner(true);
                    setLoading(false);
                    return;
                } catch {
                    // Pas propriétaire → on tombe dans le flow public
                }
            }
            // Étudiant ou teacher non-propriétaire → rejoindre comme participant
            const res = await apiCall(`labs/${id}/view`);
            setLab(res.data);
            setIsOwner(false);
        } catch (e: any) {
            console.error(e);
            setError(t('Impossible de rejoindre la salle. Le lien est peut-être invalide ou expiré.', 'Unable to join the room. The link may be invalid or expired.'));
        }
        setLoading(false);
    };

    const fetchMyViews = async () => {
        if (!isOwner) return;
        try {
            const res = await apiCall('labs/my-views');
            setMyViews(res.data || []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchLab();
        fetchMyViews();
        // Poll pour mettre à jour les participants en temps réel
        const interval = setInterval(fetchLab, 10000); // Rafraîchir toutes les 10 secondes
        return () => clearInterval(interval);
    }, [id]);

    const handleAddView = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedViewId) return;
        try {
            await apiCall(`labs/${id}/views/${selectedViewId}`, { method: 'POST', body: JSON.stringify({}) });
            setAddingView(false);
            setSelectedViewId('');
            fetchLab();
        } catch (e: any) {
            alert(e.message || t("Erreur lors de l'ajout.", "Error adding view."));
        }
    };

    const handleRemoveView = async (sharedViewId: string) => {
        if (!window.confirm(t("Retirer cette vue de la salle ?", "Remove this view from the lab?"))) return;
        try {
            await apiCall(`labs/${id}/views/${sharedViewId}`, { method: 'POST', body: JSON.stringify({ _method: 'DELETE' }) });
            fetchLab();
        } catch (e: any) {
            alert(e.message || t("Erreur.", "Error."));
        }
    };

    const handleToggleStatus = async (view: any) => {
        const newStatus = view.status === 'visible' ? 'hidden' : 'visible';
        try {
            await apiCall(`labs/shared-views/${view.id}/status`, { 
                method: 'POST', 
                body: JSON.stringify({ status: newStatus, _method: 'PUT' }) 
            });
            fetchLab();
        } catch (e: any) {
            alert(t("Erreur de modification du statut.", "Error updating status."));
        }
    };

    const sharedViews = lab?.shared_views || [];

    return (
        <App 
            breadcrumb={
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500 }}>
                    <Link to="/labs" style={{ color: 'var(--dash-text-muted)', textDecoration: 'none' }}>
                        {t('Toutes les salles de cours', 'All Labs')}
                    </Link>
                    <span style={{ color: 'var(--dash-text-muted)', opacity: 0.5 }}>/</span>
                    <span style={{ color: 'var(--dash-text)', fontWeight: 600 }}>{lab?.name || '...'}</span>
                </div>
            }
        >
            {loading && !lab ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
                    <Loader2 size={32} className="animate-spin" color="#0ea5e9" />
                    <p style={{ color: 'var(--dash-text-muted)', fontSize: '14px' }}>{t('Chargement de la salle...', 'Loading lab...')}</p>
                    <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : error ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '24px', textAlign: 'center' }}>
                    <div style={{ background: '#fef2f2', color: '#ef4444', padding: '16px', borderRadius: '50%' }}><X size={32} /></div>
                    <div>
                        <h2 style={{ marginBottom: '8px', fontSize: '20px' }}>{t("Erreur d'accès", 'Access Error')}</h2>
                        <p style={{ color: 'var(--dash-text-muted)', maxWidth: '400px', fontSize: '14px' }}>{error}</p>
                    </div>
                    <button onClick={() => navigate('/labs')} style={{ padding: '10px 20px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        {t('Retour à la liste', 'Back to list')}
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    
                    {/* === COLONNE GAUCHE (Contenu Principal) === */}
                    <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* === META INFO === */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', color: 'var(--dash-text-muted)', fontSize: '13px', paddingBottom: '10px', borderBottom: '1px solid var(--dash-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: 700 }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }}></div>
                                Session Live
                            </div>
                            <span style={{ opacity: 0.3 }}>|</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <User size={14} />
                                {lab.teacher ? `${lab.teacher.firstname} ${lab.teacher.lastname}` : 'System Admin'}
                            </div>
                            <span style={{ opacity: 0.3 }}>|</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={14} />
                                {lab.created_at ? new Date(lab.created_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US') : new Date().toLocaleDateString()}
                            </div>
                        </div>

                        {/* === SECTION VUES 3D === */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Presentation size={18} color="#0ea5e9" />
                                    {t('Vues 3D partagées', '3D Shared Views')}
                                    <span style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', padding: '2px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>
                                        {sharedViews.length}
                                    </span>
                                </h3>
                                {isOwner && (
                                    <button
                                        onClick={() => setAddingView(!addingView)}
                                        style={{ background: addingView ? 'var(--dash-border)' : '#0ea5e9', color: addingView ? 'var(--dash-text)' : '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                                    >
                                        {addingView ? <X size={16} /> : <Plus size={16} />}
                                        {addingView ? t('Annuler', 'Cancel') : t('Ajouter une vue', 'Add a view')}
                                    </button>
                                )}
                            </div>

                            {isOwner && addingView && (
                                <div style={{ background: 'var(--dash-bg)', border: '1px solid #0ea5e950', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                                    <h4 style={{ margin: '0 0 16px 0', color: '#0ea5e9' }}>{t('Sélectionner une vue', 'Select a view')}</h4>
                                    <form onSubmit={handleAddView} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                        <select
                                            required
                                            value={selectedViewId}
                                            onChange={(e) => setSelectedViewId(e.target.value)}
                                            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--dash-border)', background: 'var(--dash-bg)', color: 'var(--dash-text)', outline: 'none' }}
                                        >
                                            <option value="">{t('-- Choisir une vue --', '-- Choose a view --')}</option>
                                            {myViews
                                                .filter(v => !sharedViews.find((sv: any) => sv.id === v.id))
                                                .map((v: any) => (
                                                    <option key={v.id} value={v.id}>{v.teacher_note || `Vue #${v.id.substring(0, 8)}`}</option>
                                                ))
                                            }
                                        </select>
                                        <button type="submit" style={{ padding: '10px 22px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                                            {t('Ajouter', 'Add')}
                                        </button>
                                    </form>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                {sharedViews.map((view: any) => (
                                    <div key={view.id} style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '14px', overflow: 'hidden', opacity: view.status === 'hidden' ? 0.7 : 1 }}>
                                        <div style={{ height: '140px', background: view.status === 'hidden' ? 'var(--dash-border)' : 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(14,165,233,0.02))', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                            <Presentation size={52} color={view.status === 'hidden' ? 'var(--dash-text-muted)' : "rgba(14,165,233,0.25)"} />
                                            {isOwner && (
                                                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                                                    <button onClick={() => handleToggleStatus(view)} style={{ background: '#fff', border: '1px solid var(--dash-border)', color: view.status === 'visible' ? '#34d399' : '#f43f5e', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}>
                                                        {view.status === 'visible' ? <Eye size={14} /> : <EyeOff size={14} />}
                                                    </button>
                                                    <button onClick={() => handleRemoveView(view.id)} style={{ background: '#fff', border: '1px solid var(--dash-border)', color: '#f43f5e', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ padding: '16px' }}>
                                            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>{view.teacher_note || `Vue 3D #${view.id.substring(0, 8)}`}</h4>
                                            <p style={{ fontSize: '12px', color: 'var(--dash-text-muted)', margin: '0 0 14px 0' }}>{view.status === 'visible' ? t('Visible', 'Visible') : t('Masquée', 'Hidden')}</p>
                                            <button
                                                disabled={view.status === 'hidden' && !isOwner}
                                                onClick={() => navigate(`/atlas?view=${view.id}`)}
                                                style={{ width: '100%', padding: '10px', background: view.status === 'hidden' ? 'var(--dash-border)' : 'rgba(14, 165, 233, 0.08)', color: view.status === 'hidden' ? 'var(--dash-text-muted)' : '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.2)', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                            >
                                                <ExternalLink size={14} /> {t('Rejoindre', 'Join')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* === COLONNE DROITE (Participants - Owner Only) === */}
                    {isOwner && (
                        <div style={{ width: '260px', flexShrink: 0, background: 'rgba(0,0,0,0.01)', borderRadius: '16px', padding: '20px', position: 'sticky', top: '24px', alignSelf: 'flex-start' }}>
                            <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700 }}>
                                <Users size={18} color="#34d399" />
                                {t('Participants', 'Participants')}
                                <span style={{ color: 'var(--dash-text-muted)', fontSize: '14px', fontWeight: 500 }}>
                                    ({lab.participants?.length || 0})
                                </span>
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {lab.participants && lab.participants.length > 0 ? (
                                    lab.participants.map((p: any) => {
                                        // Debug pour voir les données disponibles
                                        console.log('Participant data:', p);
                                        
                                        // Essayer plusieurs champs possibles pour la date de rejoindre
                                        const joinDate = p.joined_at ? new Date(p.joined_at) : 
                                                         p.participated_at ? new Date(p.participated_at) :
                                                         p.enrolled_at ? new Date(p.enrolled_at) :
                                                         p.pivot?.joined_at ? new Date(p.pivot.joined_at) :
                                                         p.pivot?.participated_at ? new Date(p.pivot.participated_at) :
                                                         p.pivot?.enrolled_at ? new Date(p.pivot.enrolled_at) :
                                                         p.pivot?.created_at ? new Date(p.pivot.created_at) :
                                                         p.created_at ? new Date(p.created_at) : null;
                                        const joinTime = joinDate ? joinDate.toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '';
                                        const joinDateStr = joinDate ? joinDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
                                        
                                        return (
                                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ 
                                                    width: '36px', height: '36px', borderRadius: '50%', 
                                                    background: p.role === 'student' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(14, 165, 233, 0.1)', 
                                                    color: p.role === 'student' ? '#34d399' : '#0ea5e9',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                    fontSize: '11px', fontWeight: 800, flexShrink: 0 
                                                }}>
                                                    {p.firstname?.[0]?.toUpperCase()}{p.lastname?.[0]?.toUpperCase()}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {p.firstname} {p.lastname}
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: 'var(--dash-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        {p.role}
                                                    </div>
                                                    {joinDate && (
                                                        <div style={{ fontSize: '10px', color: 'var(--dash-text-muted)', marginTop: '2px' }}>
                                                            {joinDateStr} {joinTime}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div style={{ fontSize: '13px', color: 'var(--dash-text-muted)', textAlign: 'center', padding: '20px 0' }}>
                                        {t('Aucun participant', 'No participants')}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </App>
    );
};

export default LabViewer;

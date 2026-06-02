import React, { useState, useEffect } from 'react';
import { Monitor, Share2, Trash2, Eye, EyeOff, Check, ChevronDown, ChevronRight, Search } from 'lucide-react';
import Swal from 'sweetalert2';
import App from '../components/layouts/App';
import { apiCall } from '../services/api';
import { getSwalTheme } from '../services/swalTheme';
import { useLanguage } from '../contexts/LanguageContext';

const MyViews: React.FC = () => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

    const [views, setViews] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [expandedViewId, setExpandedViewId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [labs, setLabs] = useState<any[]>([]);
    const [sharingLabs, setSharingLabs] = useState<Record<string, string[]>>({});

    const fetchViews = async () => {
        setLoading(true);
        try {
            const res = await apiCall('labs/shared-views');
            setViews(res.data || []);
            setSelectedIds([]);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchLabs = async () => {
        try {
            const res = await apiCall('labs');
            setLabs(res.data || []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchViews();
        fetchLabs();
    }, []);

    const toggleStatus = async (view: any) => {
        const newStatus = view.status === 'visible' ? 'hidden' : 'visible';
        try {
            await apiCall(`labs/shared-views/${view.id}/status`, { method: 'POST', body: JSON.stringify({ status: newStatus, _method: 'PUT' }) });
            fetchViews();
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (view: any) => {
        const result = await Swal.fire({
            title: t('Supprimer la vue ?', 'Delete view?'),
            text: t('Voulez-vous vraiment supprimer cette vue ? Elle sera retirée de toutes les salles de cours.', 'Do you really want to delete this view? It will be removed from all classrooms.'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: t('Oui, supprimer', 'Yes, delete'),
            cancelButtonText: t('Annuler', 'Cancel'),
            ...getSwalTheme()
        });

        if (result.isConfirmed) {
            try {
                await apiCall(`labs/shared-views/${view.id}`, { method: 'POST', body: JSON.stringify({ _method: 'DELETE' }) });
                fetchViews();
                Swal.fire({ icon: 'success', title: t('Supprimée', 'Deleted'), timer: 1000, showConfirmButton: false, ...getSwalTheme() });
            } catch (e) { Swal.fire({ title: t('Erreur', 'Error'), text: t('Impossible de supprimer.', 'Unable to delete.'), icon: 'error', ...getSwalTheme() }); }
        }
    };

    const handleBulkDelete = async () => {
        const result = await Swal.fire({
            title: t('Suppression groupée', 'Bulk delete'),
            text: t(`Voulez-vous supprimer les ${selectedIds.length} vues sélectionnées ?`, `Do you want to delete the ${selectedIds.length} selected views?`),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: t('Tout supprimer', 'Delete all'),
            cancelButtonText: t('Annuler', 'Cancel'),
            ...getSwalTheme()
        });

        if (result.isConfirmed) {
            try {
                await apiCall('labs/shared-views/bulk-delete', { method: 'POST', body: JSON.stringify({ ids: selectedIds }) });
                fetchViews();
                Swal.fire({ icon: 'success', title: t('Vues supprimées', 'Views deleted'), timer: 1500, showConfirmButton: false, ...getSwalTheme() });
            } catch (e) { Swal.fire({ title: t('Erreur', 'Error'), text: t('Erreur lors de la suppression.', 'Error during deletion.'), icon: 'error', ...getSwalTheme() }); }
        }
    };

    const toggleExpand = (viewId: string) => {
        if (expandedViewId === viewId) {
            setExpandedViewId(null);
        } else {
            const view = views.find(v => v.id === viewId);
            setExpandedViewId(viewId);
            setSharingLabs(prev => ({
                ...prev,
                [viewId]: view?.labs?.map((l: any) => l.id) || [],
            }));
        }
    };

    const toggleLabSelection = (viewId: string, labId: string) => {
        setSharingLabs(prev => {
            const current = prev[viewId] || [];
            return {
                ...prev,
                [viewId]: current.includes(labId)
                    ? current.filter(id => id !== labId)
                    : [...current, labId],
            };
        });
    };

    const saveSharing = async (view: any) => {
        const selected = sharingLabs[view.id] || [];
        const wasSelected = view.labs?.map((l: any) => l.id) || [];

        try {
            for (const lab of labs) {
                const isSelected = selected.includes(lab.id);
                const wasPreviously = wasSelected.includes(lab.id);

                if (isSelected && !wasPreviously) {
                    await apiCall(`labs/${lab.id}/views/${view.id}`, { method: 'POST' });
                } else if (!isSelected && wasPreviously) {
                    await apiCall(`labs/${lab.id}/views/${view.id}`, { method: 'POST', body: JSON.stringify({ _method: 'DELETE' }) });
                }
            }
            setExpandedViewId(null);
            fetchViews();
            Swal.fire({ icon: 'success', title: t('Partage mis à jour', 'Sharing updated'), timer: 1500, showConfirmButton: false, ...getSwalTheme() });
        } catch (e) { Swal.fire({ title: t('Erreur', 'Error'), text: t('Erreur lors du partage.', 'Error sharing.'), icon: 'error', ...getSwalTheme() }); }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === views.length) setSelectedIds([]);
        else setSelectedIds(views.map(v => v.id));
    };

    return (
        <App breadcrumb={t('Espace Personnel', 'Personal Space')} title={t('Mes Vues 3D Partagées', 'My Shared 3D Views')}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {selectedIds.length > 0 && (
                        <button onClick={handleBulkDelete} style={{ background: '#f43f5e', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <Trash2 size={18} /> {t('Supprimer la sélection', 'Delete selection')} ({selectedIds.length})
                        </button>
                    )}
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={18} style={{ position: 'absolute', left: '16px', color: 'var(--dash-text-muted)' }} />
                    <input 
                        type="text" 
                        placeholder={t('Rechercher une vue...', 'Search a view...')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ width: '280px', padding: '10px 16px 10px 44px', borderRadius: '12px', border: '1px solid var(--dash-border)', background: 'var(--dash-bg)', color: 'var(--dash-text)', outline: 'none' }}
                    />
                </div>
            </div>

            <div style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '16px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--dash-border)' }}>
                            <th style={{ padding: '16px 20px', width: '40px' }}>
                                <input type="checkbox" onChange={toggleSelectAll} checked={views.length > 0 && selectedIds.length === views.length} style={{width:'14px',height:'14px',accentColor:'#fbbf24'}}/>
                            </th>
                            <th style={{ padding: '16px 20px', width: '40px' }}></th>
                            <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t('Miniature & Note', 'Thumbnail & Note')}</th>
                            <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t('Date', 'Date')}</th>
                            <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t('Salles', 'Labs')}</th>
                            <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t('Visibilité', 'Visibility')}</th>
                            <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>{t('Actions', 'Actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center' }}>{t('Chargement...', 'Loading...')}</td></tr>
                        ) : views.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ padding: '80px', textAlign: 'center' }}>
                                    <Monitor size={60} color="var(--dash-text-muted)" style={{ opacity: 0.2, margin: '0 auto 16px', display: 'block' }} />
                                    <div style={{ color: 'var(--dash-text-muted)', fontWeight: 500, marginBottom: '20px' }}>{t('Aucune vue générée.', 'No view generated.')}</div>
                                    <button onClick={() => window.location.href='/atlas'} style={{ background: '#fbbf24', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>{t('Créer ma première vue', 'Create my first view')}</button>
                                </td>
                            </tr>
                        ) : (
                            (() => {
                                const filtered = views.filter(v => (v.teacher_note || '').toLowerCase().includes(searchTerm.toLowerCase()));
                                if (filtered.length === 0 && searchTerm) {
                                    return (
                                        <tr>
                                            <td colSpan={7} style={{ padding: '60px', textAlign: 'center' }}>
                                                <div style={{ color: 'var(--dash-text-muted)', fontSize: '15px' }}>
                                                    <Search size={40} style={{ opacity: 0.1, display: 'block', margin: '0 auto 10px' }} />
                                                    {t("Aucune vue ne correspond à votre recherche.", "No views match your search.")}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }
                                return filtered.map(view => {
                                    const isExpanded = expandedViewId === view.id;
                                    const viewLabIds = view.labs?.map((l: any) => l.id) || [];

                                    return (
                                        <React.Fragment key={view.id}>
                                            <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--dash-border)', background: selectedIds.includes(view.id) ? 'rgba(251, 191, 36, 0.03)' : 'transparent' }}>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <input type="checkbox" checked={selectedIds.includes(view.id)} onChange={() => setSelectedIds(prev => prev.includes(view.id) ? prev.filter(id => id !== view.id) : [...prev, view.id])} style={{width:'14px',height:'14px',accentColor:'#fbbf24'}}/>
                                                </td>
                                                <td style={{ padding: '0' }}>
                                                    <button onClick={() => toggleExpand(view.id)} style={{ background: 'none', border: 'none', color: 'var(--dash-text-muted)', cursor: 'pointer', padding: '16px 20px', display: 'flex' }}>
                                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    </button>
                                                </td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ width: '50px', height: '50px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24', flexShrink: 0 }}>
                                                            <Monitor size={24} />
                                                        </div>
                                                        <div style={{ fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{view.teacher_note || t('Sans note', 'No note')}</div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 20px', color: 'var(--dash-text-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>{new Date(view.created_at).toLocaleDateString()}</td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <div style={{ fontSize: '12px', color: '#0ea5e9', background: 'rgba(14, 165, 233, 0.1)', padding: '4px 10px', borderRadius: '100px', display: 'inline-block', fontWeight: 700 }}>
                                                        {viewLabIds.length} {t('salle(s)', 'room(s)')}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <button onClick={() => toggleStatus(view)} style={{ background: view.status === 'visible' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(244, 63, 94, 0.1)', color: view.status === 'visible' ? '#34d399' : '#f43f5e', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                                        {view.status === 'visible' ? <Eye size={14}/> : <EyeOff size={14}/>}
                                                        {view.status === 'visible' ? t('Visible', 'Visible') : t('Masquée', 'Hidden')}
                                                    </button>
                                                </td>
                                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                        <button onClick={() => toggleExpand(view.id)} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }} title={t("Partager", "Share")}><Share2 size={16}/></button>
                                                        <button onClick={() => handleDelete(view)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}><Trash2 size={16}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr style={{ borderBottom: '1px solid var(--dash-border)' }}>
                                                    <td colSpan={7} style={{ padding: '0' }}>
                                                        <div style={{ padding: '20px 40px 20px 100px', background: 'rgba(0,0,0,0.02)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                                                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--dash-text-muted)' }}>
                                                                    {t('Partager dans vos salles', 'Share in your labs')}
                                                                </h4>
                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                    <button onClick={() => setExpandedViewId(null)}
                                                                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--dash-border)', background: 'transparent', color: 'var(--dash-text)', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                                                                        {t('Annuler', 'Cancel')}
                                                                    </button>
                                                                    <button onClick={() => saveSharing(view)}
                                                                        style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#fbbf24', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                                                                        {t('Partager', 'Share')}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {labs.length === 0 ? (
                                                                <div style={{ fontSize: '13px', color: 'var(--dash-text-muted)', fontStyle: 'italic' }}>
                                                                    {t("Vous n'avez pas de salle.", "You don't have any labs.")}
                                                                </div>
                                                            ) : (
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                                    {labs.map(lab => {
                                                                        const sel = sharingLabs[view.id] || [];
                                                                        const isSelected = sel.includes(lab.id);
                                                                        const isAlreadyShared = viewLabIds.includes(lab.id);
                                                                        return (
                                                                            <div key={lab.id} onClick={() => toggleLabSelection(view.id, lab.id)}
                                                                                style={{
                                                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                                                    padding: '10px 14px', borderRadius: '10px',
                                                                                    border: isSelected ? '2px solid #fbbf24' : '1px solid var(--dash-border)',
                                                                                    cursor: 'pointer', transition: '0.15s',
                                                                                    background: isSelected ? 'rgba(251, 191, 36, 0.08)' : 'transparent',
                                                                                    opacity: isAlreadyShared && !isSelected ? 0.5 : 1,
                                                                                }}>
                                                                                <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: '2px solid #fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? '#fbbf24' : 'transparent', flexShrink: 0 }}>
                                                                                    {isSelected && <Check size={12} color="#fff" />}
                                                                                </div>
                                                                                <span style={{ fontWeight: 600, fontSize: '13px' }}>{lab.name}</span>
                                                                                {isAlreadyShared && <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>{t('✓ partagée', '✓ shared')}</span>}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                });
                            })()
                        )}
                    </tbody>
                </table>
            </div>
        </App>
    );
};

export default MyViews;

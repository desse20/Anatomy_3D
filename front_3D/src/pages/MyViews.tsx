import React, { useState, useEffect } from 'react';
import { Monitor, Share2, Trash2, Eye, EyeOff, X, Check } from 'lucide-react';
import Swal from 'sweetalert2';
import App from '../components/layouts/App';
import { apiCall } from '../services/api';
import { getSwalTheme } from '../services/swalTheme';

const MyViews: React.FC = () => {
    const [views, setViews] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Partage
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [sharingView, setSharingView] = useState<any>(null);
    const [labs, setLabs] = useState<any[]>([]);
    const [selectedLabs, setSelectedLabs] = useState<string[]>([]);

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
            title: 'Supprimer la vue ?',
            text: `Voulez-vous vraiment supprimer cette vue ? Elle sera retirée de toutes les salles de cours.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: 'Oui, supprimer',
            cancelButtonText: 'Annuler',
            ...getSwalTheme()
        });

        if (result.isConfirmed) {
            try {
                await apiCall(`labs/shared-views/${view.id}`, { method: 'POST', body: JSON.stringify({ _method: 'DELETE' }) });
                fetchViews();
                Swal.fire({ icon: 'success', title: 'Supprimée', timer: 1000, showConfirmButton: false, ...getSwalTheme() });
            } catch (e) { Swal.fire({ title: 'Erreur', text: 'Impossible de supprimer.', icon: 'error', ...getSwalTheme() }); }
        }
    };

    const handleBulkDelete = async () => {
        const result = await Swal.fire({
            title: 'Suppression groupée',
            text: `Voulez-vous supprimer les ${selectedIds.length} vues sélectionnées ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: 'Tout supprimer',
            cancelButtonText: 'Annuler',
            ...getSwalTheme()
        });

        if (result.isConfirmed) {
            try {
                await apiCall('labs/shared-views/bulk-delete', { method: 'POST', body: JSON.stringify({ ids: selectedIds }) });
                fetchViews();
                Swal.fire({ icon: 'success', title: 'Vues supprimées', timer: 1500, showConfirmButton: false, ...getSwalTheme() });
            } catch (e) { Swal.fire({ title: 'Erreur', text: 'Erreur lors de la suppression.', icon: 'error', ...getSwalTheme() }); }
        }
    };

    const openShareModal = (view: any) => {
        setSharingView(view);
        // On pré-sélectionne les salles où la vue est déjà présente
        // (Note: nécessite que le backend renvoie les lab_ids associés)
        setSelectedLabs(view.labs?.map((l: any) => l.id) || []);
        setIsShareModalOpen(true);
    };

    const toggleLabSelection = (labId: string) => {
        setSelectedLabs(prev => prev.includes(labId) ? prev.filter(id => id !== labId) : [...prev, labId]);
    };

    const saveSharing = async () => {
        try {
            // Pour chaque salle, on ajoute ou on retire la vue
            for (const lab of labs) {
                const isSelected = selectedLabs.includes(lab.id);
                const wasSelected = sharingView.labs?.some((l: any) => l.id === lab.id);
                
                if (isSelected && !wasSelected) {
                    await apiCall(`labs/${lab.id}/views/${sharingView.id}`, { method: 'POST' });
                } else if (!isSelected && wasSelected) {
                    await apiCall(`labs/${lab.id}/views/${sharingView.id}`, { method: 'POST', body: JSON.stringify({ _method: 'DELETE' }) });
                }
            }
            setIsShareModalOpen(false);
            fetchViews();
            Swal.fire({ icon: 'success', title: 'Partage mis à jour', timer: 1500, showConfirmButton: false, ...getSwalTheme() });
        } catch (e) { Swal.fire({ title: 'Erreur', text: 'Erreur lors du partage.', icon: 'error', ...getSwalTheme() }); }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === views.length) setSelectedIds([]);
        else setSelectedIds(views.map(v => v.id));
    };

    return (
        <App breadcrumb="Espace Personnel" title="Mes Vues 3D Partagées">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {selectedIds.length > 0 && (
                        <button onClick={handleBulkDelete} style={{ background: '#f43f5e', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <Trash2 size={18} /> Supprimer la sélection ({selectedIds.length})
                        </button>
                    )}
                </div>
            </div>

            <div style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '16px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--dash-border)' }}>
                            <th style={{ padding: '16px 20px', width: '40px' }}>
                                <input type="checkbox" onChange={toggleSelectAll} checked={views.length > 0 && selectedIds.length === views.length} style={{width:'14px',height:'14px',accentColor:'#fbbf24'}}/>
                            </th>
                            <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>Miniature & Note</th>
                            <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>Date</th>
                            <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>Salles</th>
                            <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>Visibilité</th>
                            <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center' }}>Chargement...</td></tr>
                        ) : views.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ padding: '80px', textAlign: 'center' }}>
                                    <Monitor size={60} color="var(--dash-text-muted)" style={{ opacity: 0.2, margin: '0 auto 16px', display: 'block' }} />
                                    <div style={{ color: 'var(--dash-text-muted)', fontWeight: 500, marginBottom: '20px' }}>Aucune vue générée.</div>
                                    <button onClick={() => window.location.href='/atlas'} style={{ background: '#fbbf24', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Créer ma première vue</button>
                                </td>
                            </tr>
                        ) : (
                            views.map(view => (
                                <tr key={view.id} style={{ borderBottom: '1px solid var(--dash-border)', background: selectedIds.includes(view.id) ? 'rgba(251, 191, 36, 0.03)' : 'transparent' }}>
                                    <td style={{ padding: '16px 20px' }}>
                                        <input type="checkbox" checked={selectedIds.includes(view.id)} onChange={() => setSelectedIds(prev => prev.includes(view.id) ? prev.filter(id => id !== view.id) : [...prev, view.id])} style={{width:'14px',height:'14px',accentColor:'#fbbf24', marginRight: '16px'}}/>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '50px', height: '50px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                                                <Monitor size={24} />
                                            </div>
                                            <div style={{ fontWeight: 600 }}>{view.teacher_note || 'Sans note'}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 20px', color: 'var(--dash-text-muted)', fontSize: '13px' }}>{new Date(view.created_at).toLocaleDateString()}</td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontSize: '12px', color: '#0ea5e9', background: 'rgba(14, 165, 233, 0.1)', padding: '4px 10px', borderRadius: '100px', display: 'inline-block', fontWeight: 700 }}>
                                            {view.labs?.length || 0} salle(s)
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <button onClick={() => toggleStatus(view)} style={{ background: view.status === 'visible' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(244, 63, 94, 0.1)', color: view.status === 'visible' ? '#34d399' : '#f43f5e', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {view.status === 'visible' ? <Eye size={14}/> : <EyeOff size={14}/>}
                                            {view.status === 'visible' ? 'Visible' : 'Masquée'}
                                        </button>
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                            <button onClick={() => openShareModal(view)} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }} title="Partager"><Share2 size={16}/></button>
                                            <button onClick={() => handleDelete(view)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isShareModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--dash-bg)', width: '100%', maxWidth: '500px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid var(--dash-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Partager dans vos salles</h3>
                            <button onClick={() => setIsShareModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--dash-text-muted)', cursor: 'pointer' }}><X size={24}/></button>
                        </div>
                        <div style={{ padding: '24px', maxHeight: '400px', overflowY: 'auto' }}>
                            {labs.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--dash-text-muted)' }}>Vous n'avez pas encore de salles de cours.</div>
                            ) : (
                                labs.map(lab => (
                                    <div key={lab.id} onClick={() => toggleLabSelection(lab.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '12px', border: '1px solid var(--dash-border)', marginBottom: '10px', cursor: 'pointer', background: selectedLabs.includes(lab.id) ? 'rgba(251, 191, 36, 0.05)' : 'transparent', borderLeft: selectedLabs.includes(lab.id) ? '4px solid #fbbf24' : '1px solid var(--dash-border)', transition: '0.2s' }}>
                                        <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: '2px solid #fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedLabs.includes(lab.id) ? '#fbbf24' : 'transparent' }}>
                                            {selectedLabs.includes(lab.id) && <Check size={14} color="#fff" />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700 }}>{lab.name}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div style={{ padding: '20px 24px', background: 'rgba(0,0,0,0.02)', display: 'flex', gap: '12px' }}>
                            <button onClick={() => setIsShareModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--dash-border)', background: 'transparent', color: 'var(--dash-text)', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                            <button onClick={saveSharing} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#fbbf24', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Enregistrer</button>
                        </div>
                    </div>
                </div>
            )}
        </App>
    );
};

export default MyViews;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, ArrowLeft, Plus, Edit2, Trash2, Save, X, Info, Eye, Loader2 } from 'lucide-react';
import App from '../components/layouts/App';
import { apiCall } from '../services/api';
import Swal from 'sweetalert2';

/**
 * Composant isolé pour le renommage — évite de re-render le tableau entier pendant la frappe
 */
const ModelNameSection: React.FC<{ asset: any, onRenamed: () => void }> = ({ asset, onRenamed }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(asset.name);

    const handleRename = async () => {
        if (!newName.trim() || newName === asset.name) {
            setIsEditing(false);
            return;
        }
        try {
            await apiCall(`models-manager/${asset.id}`, { 
                method: 'POST', 
                body: JSON.stringify({ name: newName, _method: 'PUT' }) 
            });
            setIsEditing(false);
            onRenamed();
            Swal.fire('Succès', 'Modèle renommé', 'success');
        } catch (e) {
            Swal.fire('Erreur', 'Impossible de renommer', 'error');
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', background: 'rgba(14, 165, 233, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9' }}>
                <Box size={32} />
            </div>
            <div>
                {isEditing ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                            autoFocus
                            value={newName} 
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleRename()}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '2px solid #0ea5e9', background: '#fff', color: '#000', fontSize: '18px', fontWeight: 600, width: '300px' }}
                        />
                        <button onClick={handleRename} style={{ padding: '8px', background: '#34d39920', color: '#34d399', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><Save size={18}/></button>
                        <button onClick={() => setIsEditing(false)} style={{ padding: '8px', background: 'rgba(0,0,0,0.05)', color: 'var(--dash-text-muted)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><X size={18}/></button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                        <h2 style={{ margin: 0 }}>{asset.name}</h2>
                        <button 
                            onClick={() => { setIsEditing(true); setNewName(asset.name); }}
                            style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', opacity: 0.6 }}
                        >
                            <Edit2 size={14} />
                        </button>
                        <span style={{ color: 'var(--dash-text-muted)', fontSize: '12px', fontFamily: 'monospace', background: 'rgba(0,0,0,0.03)', padding: '2px 8px', borderRadius: '4px' }}>
                            {asset.url_glb?.split('/').pop()}
                        </span>
                    </div>
                )}
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--dash-text-muted)' }}>ID: {asset.id}</p>
            </div>
        </div>
    );
};

const AdminResourceDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [asset, setAsset] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Pagination infinie (style Instagram)
    const [objects, setObjects] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalObjects, setTotalObjects] = useState(0);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Object editing state
    const [editingObjectId, setEditingObjectId] = useState<number | null>(null);
    const [objectFormData, setObjectFormData] = useState({
        name: '',
        three_js_name: '',
        mesh: '',
        description: '',
        parent_id: null as number | null
    });

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const res = await apiCall(`models-manager/${id}`);
            setAsset(res);
            // La première page d'objets vient avec le show
            if (res.objects_paginated) {
                setObjects(res.objects_paginated.data || []);
                setCurrentPage(res.objects_paginated.current_page || 1);
                setLastPage(res.objects_paginated.last_page || 1);
                setTotalObjects(res.objects_paginated.total || 0);
            } else if (res.anatomical_objects) {
                // Fallback si le backend retourne la liste complète
                setObjects(res.anatomical_objects);
                setTotalObjects(res.anatomical_objects.length);
                setLastPage(1);
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Erreur', 'Impossible de charger les détails.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadMore = useCallback(async () => {
        if (loadingMore || currentPage >= lastPage) return;
        setLoadingMore(true);
        try {
            const res = await apiCall(`models-manager/${id}/objects-paginated?page=${currentPage + 1}`);
            setObjects(prev => [...prev, ...(res.data || [])]);
            setCurrentPage(res.current_page);
            setLastPage(res.last_page);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingMore(false);
        }
    }, [currentPage, lastPage, loadingMore, id]);

    // Intersection Observer pour le scroll infini
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && currentPage < lastPage && !loadingMore) {
                loadMore();
            }
        }, { threshold: 0.1 });

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [currentPage, lastPage, loadingMore, loadMore]);

    useEffect(() => {
        fetchDetails();
    }, [id]);

    const handleDeleteAsset = async () => {
        const result = await Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: "Cela supprimera le modèle et tous ses objets associés !",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: 'Oui, supprimer tout'
        });

        if (result.isConfirmed) {
            try {
                await apiCall(`models-manager/${id}`, { method: 'POST', body: JSON.stringify({ _method: 'DELETE' }) });
                Swal.fire('Supprimé', 'Le modèle a été supprimé.', 'success');
                navigate('/model');
            } catch (e) {
                Swal.fire('Erreur', 'Suppression échouée', 'error');
            }
        }
    };

    const handleEditObject = (obj: any) => {
        setEditingObjectId(obj.id);
        setObjectFormData({
            name: obj.name,
            three_js_name: obj.three_js_name,
            mesh: obj.mesh || '',
            description: obj.description || '',
            parent_id: obj.parent_id || null
        });
    };

    const handleSaveObject = async (objId: number) => {
        try {
            await apiCall(`models-manager/objects/${objId}`, { method: 'POST', body: JSON.stringify({ ...objectFormData, _method: 'PUT' }) });
            setEditingObjectId(null);
            // Mettre à jour localement au lieu de tout recharger
            setObjects(prev => prev.map(o => o.id === objId ? { ...o, ...objectFormData } : o));
            Swal.fire('Succès', 'Objet mis à jour', 'success');
        } catch (e) {
            Swal.fire('Erreur', 'Mise à jour de l\'objet échouée', 'error');
        }
    };

    const handleDeleteObject = async (objId: number) => {
        const result = await Swal.fire({
            title: 'Supprimer cet objet ?',
            text: "Cette action est irréversible.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
        });

        if (result.isConfirmed) {
            try {
                await apiCall(`models-manager/objects/${objId}`, { method: 'POST', body: JSON.stringify({ _method: 'DELETE' }) });
                setObjects(prev => prev.filter(o => o.id !== objId));
                setTotalObjects(prev => prev - 1);
                Swal.fire('Supprimé', 'Objet retiré.', 'success');
            } catch (e) {
                Swal.fire('Erreur', 'Suppression échouée', 'error');
            }
        }
    };

    const handleSearchParent = async () => {
        const { value: query } = await Swal.fire({
            title: 'Rechercher un parent',
            input: 'text',
            inputPlaceholder: 'Entrez un nom ou un ID...',
            showCancelButton: true,
            confirmButtonText: 'Rechercher'
        });

        if (query) {
            try {
                const results = await apiCall(`models-manager/${id}/search-objects?query=${query}`);
                if (results.length === 0) {
                    Swal.fire('Info', 'Aucun objet trouvé.', 'info');
                    return null;
                }

                const { value: selectedId } = await Swal.fire({
                    title: 'Choisir le parent',
                    input: 'select',
                    inputOptions: results.reduce((acc: any, obj: any) => {
                        acc[obj.id] = `${obj.name} (ID: ${obj.id})`;
                        return acc;
                    }, {}),
                    inputPlaceholder: 'Sélectionnez un objet',
                    showCancelButton: true
                });

                return selectedId ? parseInt(selectedId) : null;
            } catch (e) {
                Swal.fire('Erreur', 'La recherche a échoué', 'error');
            }
        }
        return null;
    };

    const handleAddObject = async () => {
        let parentId: number | null = null;

        const { value: formValues } = await Swal.fire({
            title: 'Ajouter un objet',
            html:
                '<div style="text-align:left"><label style="font-size:12px;color:#666">Nom</label><input id="swal-input1" class="swal2-input" placeholder="Nom"></div>' +
                '<div style="text-align:left"><label style="font-size:12px;color:#666">ID ThreeJS</label><input id="swal-input2" class="swal2-input" placeholder="Nom ThreeJS"></div>' +
                '<div style="text-align:left"><label style="font-size:12px;color:#666">Mesh</label><input id="swal-input3" class="swal2-input" placeholder="Mesh"></div>' +
                '<div style="text-align:left; margin-top:15px"><label style="font-size:12px;color:#666">Parent</label>' +
                '<div style="display:flex; gap:8px"><input id="swal-input-parent-display" class="swal2-input" style="flex:1;margin:0" readonly placeholder="Aucun parent sélectionné">' +
                '<button type="button" id="search-parent-btn" style="padding:10px;background:#0ea5e9;color:white;border:none;border-radius:8px;cursor:pointer">Chercher</button></div></div>' +
                '<div style="text-align:left; margin-top:15px"><label style="font-size:12px;color:#666">Description</label><textarea id="swal-input4" class="swal2-textarea" placeholder="Description"></textarea></div>',
            focusConfirm: false,
            didOpen: () => {
                const btn = document.getElementById('search-parent-btn');
                const display = document.getElementById('swal-input-parent-display') as HTMLInputElement;
                btn?.addEventListener('click', async () => {
                    const picked = await handleSearchParent();
                    if (picked !== null) {
                        parentId = picked;
                        display.value = `ID: ${picked}`;
                    } else {
                        parentId = null;
                        display.value = 'Aucun parent';
                    }
                });
            },
            preConfirm: () => {
                return {
                    name: (document.getElementById('swal-input1') as HTMLInputElement).value,
                    three_js_name: (document.getElementById('swal-input2') as HTMLInputElement).value,
                    mesh: (document.getElementById('swal-input3') as HTMLInputElement).value,
                    parent_id: parentId,
                    description: (document.getElementById('swal-input4') as HTMLTextAreaElement).value
                }
            }
        });

        if (formValues) {
            try {
                const res = await apiCall(`models-manager/${id}/objects`, { method: 'POST', body: JSON.stringify(formValues) });
                setObjects(prev => [res.object, ...prev]);
                setTotalObjects(prev => prev + 1);
                Swal.fire('Succès', 'Objet ajouté', 'success');
            } catch (e) {
                Swal.fire('Erreur', 'Ajout échoué', 'error');
            }
        }
    };

    const handleImportHierarchy = async () => {
        const { value: importType } = await Swal.fire({
            title: 'Importer la hiérarchie',
            text: "Choisissez le mode d'importation",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Default JSON (Server)',
            cancelButtonText: 'Annuler',
            showDenyButton: true,
            denyButtonText: 'Upload File',
            denyButtonColor: '#0ea5e9'
        });

        let jsonData: any = null;

        if (importType === true) {
            // Default JSON
            try {
                Swal.fire({ title: 'Chargement du JSON...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                // On récupère d'abord le contenu pour previsualisation
                const path = 'storage/app/anatomy_hierarchy.json'; 
                // Note: On pourrait faire un endpoint pour LIRE le JSON sans importer
                // Mais pour simuler la demande "Afficher JSON d'abord", on va demander au serveur le contenu
                const res = await apiCall(`models-manager/${id}/import-hierarchy?preview=1`, { method: 'POST', body: JSON.stringify({ use_default: true }) });
                jsonData = res.data;
            } catch (e) {
                Swal.fire('Erreur', 'Impossible de lire le fichier par défaut', 'error');
                return;
            }
        } else if (importType === false) {
            // Upload File
            const { value: file } = await Swal.fire({
                title: 'Sélectionner le fichier JSON',
                input: 'file',
                inputAttributes: { 'accept': 'application/json' }
            });

            if (file) {
                try {
                    const text = await file.text();
                    jsonData = JSON.parse(text);
                } catch (e) {
                    Swal.fire('Erreur', 'Fichier JSON invalide', 'error');
                    return;
                }
            }
        }

        if (jsonData) {
            // PREVISUALISATION ET EDITION
            const result = await Swal.fire({
                title: 'Vérification et Édition des données',
                html: `<div style="text-align:left; display:flex; flex-direction:column; gap:10px;">
                    <p style="font-size:14px; color:#666">Vous pouvez modifier le JSON directement ci-dessous avant de valider.</p>
                    <textarea id="swal-json-editor" style="width:100%; height:500px; background:#1e1e1e; color:#d4d4d4; padding:15px; border-radius:8px; font-family:monospace; font-size:13px; line-height:1.5; outline:none; border:none;">${JSON.stringify(jsonData, null, 2)}</textarea>
                </div>`,
                width: '95%',
                showCancelButton: true,
                confirmButtonText: 'Confirmer l\'importation',
                cancelButtonText: 'Annuler',
                preConfirm: () => {
                    const editor = document.getElementById('swal-json-editor') as HTMLTextAreaElement;
                    try {
                        return JSON.parse(editor.value);
                    } catch (e) {
                        Swal.showValidationMessage('JSON invalide ! Veuillez corriger les erreurs de syntaxe.');
                        return false;
                    }
                }
            });

            if (result.isConfirmed) {
                try {
                    Swal.fire({ title: 'Importation en cours...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                    // Envoi effectif
                    const finalData = result.value;
                    await apiCall(`models-manager/${id}/import-hierarchy`, { 
                        method: 'POST', 
                        body: JSON.stringify({ objects: finalData.objects || finalData }) 
                    });
                    Swal.fire('Succès', 'Importation réussie', 'success');
                    fetchDetails();
                } catch (e) {
                    Swal.fire('Erreur', 'L\'importation a échoué', 'error');
                }
            }
        }
    };

    if (loading) return <App title="Chargement..."><div style={{ padding: '40px', textAlign: 'center' }}>Veuillez patienter...</div></App>;
    if (!asset) return <App title="Erreur"><div style={{ padding: '40px', textAlign: 'center' }}>Modèle non trouvé.</div></App>;

    return (
        <App breadcrumb="Administration / Modèles" title={asset.name}>
            
            <div style={{ marginBottom: '24px' }}>
                <button 
                    onClick={() => navigate('/model')}
                    style={{ background: 'none', border: 'none', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, padding: 0, marginBottom: '20px' }}
                >
                    <ArrowLeft size={18} /> Retour à la liste
                </button>

                <div style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ModelNameSection asset={asset} onRenamed={fetchDetails} />
                    
                    <button 
                        onClick={handleDeleteAsset}
                        style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid #f43f5e50', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Trash2 size={18} /> Supprimer le modèle
                    </button>
                </div>
            </div>

            <div style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--dash-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700 }}>
                        <Info size={20} color="#f59e0b" /> Objets Anatomiques ({totalObjects})
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleImportHierarchy} style={{ padding: '8px 16px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Save size={18} /> Importer JSON (Hiérarchie)
                        </button>
                        <button onClick={handleAddObject} style={{ padding: '8px 16px', background: '#34d399', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={18} /> Ajouter un objet
                        </button>
                    </div>
                </div>

                <div style={{ padding: '24px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--dash-border)', color: 'var(--dash-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                                <th style={{ padding: '12px' }}>Nom</th>
                                <th style={{ padding: '12px' }}>Parent ID</th>
                                <th style={{ padding: '12px' }}>ID ThreeJS</th>
                                <th style={{ padding: '12px' }}>Mesh</th>
                                <th style={{ padding: '12px' }}>Description</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {objects.map((obj: any) => (
                                <tr key={obj.id} style={{ borderBottom: '1px solid var(--dash-border)', transition: '0.2s' }}>
                                    <td style={{ padding: '16px 12px' }}>
                                        {editingObjectId === obj.id ? (
                                            <input 
                                                value={objectFormData.name} onChange={e => setObjectFormData({...objectFormData, name: e.target.value})}
                                                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #0ea5e9', background: 'transparent', color: 'var(--dash-text)' }}
                                            />
                                        ) : (
                                            <div style={{ fontWeight: 600 }}>{obj.name}</div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 12px' }}>
                                        {editingObjectId === obj.id ? (
                                            <input 
                                                type="number"
                                                value={objectFormData.parent_id || ''} onChange={e => setObjectFormData({...objectFormData, parent_id: e.target.value ? parseInt(e.target.value) : null})}
                                                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #0ea5e9', background: 'transparent', color: 'var(--dash-text)' }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: '12px', color: 'var(--dash-text-muted)' }}>{obj.parent_id || '-'}</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 12px' }}>
                                        {editingObjectId === obj.id ? (
                                            <input 
                                                value={objectFormData.three_js_name} onChange={e => setObjectFormData({...objectFormData, three_js_name: e.target.value})}
                                                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #0ea5e9', background: 'transparent', color: 'var(--dash-text)' }}
                                            />
                                        ) : (
                                            <code style={{ fontSize: '12px', color: 'var(--dash-text-muted)' }}>{obj.three_js_name}</code>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 12px' }}>
                                        {editingObjectId === obj.id ? (
                                            <input 
                                                value={objectFormData.mesh} onChange={e => setObjectFormData({...objectFormData, mesh: e.target.value})}
                                                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #0ea5e9', background: 'transparent', color: 'var(--dash-text)' }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: '12px' }}>{obj.mesh || 'N/A'}</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 12px' }}>
                                        {editingObjectId === obj.id ? (
                                            <textarea 
                                                value={objectFormData.description} onChange={e => setObjectFormData({...objectFormData, description: e.target.value})}
                                                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #0ea5e9', background: 'transparent', color: 'var(--dash-text)', height: '60px' }}
                                            />
                                        ) : (
                                            <div style={{ 
                                                fontSize: '12px', 
                                                color: 'var(--dash-text-muted)', 
                                                fontStyle: 'italic',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                lineHeight: '1.5em',
                                                maxHeight: '4.5em'
                                            }}>
                                                {obj.description || 'Aucune description'}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                            {editingObjectId === obj.id ? (
                                                <>
                                                    <button onClick={() => handleSaveObject(obj.id)} style={{ padding: '6px', background: '#34d39920', color: '#34d399', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Save size={16}/></button>
                                                    <button onClick={() => setEditingObjectId(null)} style={{ padding: '6px', background: 'rgba(0,0,0,0.05)', color: 'var(--dash-text-muted)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><X size={16}/></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => {
                                                        Swal.fire({
                                                            title: `<div style="text-align: left; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Détails : ${obj.name}</div>`,
                                                            html: `
                                                                <div style="text-align: left; padding: 20px 0;">
                                                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                                                        <div style="background: #f9fafb; padding: 15px; border-radius: 12px; border: 1px solid #e5e7eb;">
                                                                            <label style="display: block; font-size: 11px; text-transform: uppercase; color: #9ca3af; margin-bottom: 5px;">ID ThreeJS</label>
                                                                            <code style="font-size: 14px; font-weight: 600;">${obj.three_js_name}</code>
                                                                        </div>
                                                                        <div style="background: #f9fafb; padding: 15px; border-radius: 12px; border: 1px solid #e5e7eb;">
                                                                            <label style="display: block; font-size: 11px; text-transform: uppercase; color: #9ca3af; margin-bottom: 5px;">Mesh associé</label>
                                                                            <span style="font-size: 14px; font-weight: 600;">${obj.mesh || 'N/A'}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div style="background: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb;">
                                                                        <label style="display: block; font-size: 11px; text-transform: uppercase; color: #9ca3af; margin-bottom: 10px;">Description</label>
                                                                        <div style="font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
                                                                            ${obj.description || '<i>Aucune description.</i>'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            `,
                                                            width: '800px',
                                                            showCloseButton: true,
                                                            showConfirmButton: true,
                                                            confirmButtonText: 'Fermer',
                                                            confirmButtonColor: '#6366f1',
                                                        });
                                                    }} style={{ padding: '6px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Eye size={16}/></button>
                                                    <button onClick={() => handleEditObject(obj)} style={{ padding: '6px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Edit2 size={16}/></button>
                                                    <button onClick={() => handleDeleteObject(obj.id)} style={{ padding: '6px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={16}/></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Sentinel pour le scroll infini */}
                    <div ref={sentinelRef} style={{ padding: '20px', textAlign: 'center' }}>
                        {loadingMore && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--dash-text-muted)' }}>
                                <Loader2 size={18} className="spin" /> Chargement...
                            </div>
                        )}
                        {currentPage >= lastPage && objects.length > 0 && (
                            <div style={{ fontSize: '12px', color: 'var(--dash-text-muted)' }}>
                                {totalObjects} objets — Tout chargé
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </App>
    );
};

export default AdminResourceDetail;

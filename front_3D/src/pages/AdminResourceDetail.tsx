import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, ArrowLeft, Plus, Edit2, Trash2, Save, X, Info, Eye, Loader2, Search } from 'lucide-react';
import App from '../components/layouts/App';
import { apiCall } from '../services/api';
import Swal from 'sweetalert2';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Composant isolé pour le renommage — évite de re-render le tableau entier pendant la frappe
 */
const ModelNameSection: React.FC<{ asset: any, onRenamed: () => void }> = ({ asset, onRenamed }) => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

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
            Swal.fire(t('Succès', 'Success'), t('Modèle renommé', 'Model renamed'), 'success');
        } catch (e) {
            Swal.fire(t('Erreur', 'Error'), t('Impossible de renommer', 'Unable to rename'), 'error');
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
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

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
    const [searchTerm, setSearchTerm] = useState('');

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
            if (!res || typeof res !== 'object' || (!res.name && !res.id)) {
                throw new Error('Format de données invalide');
            }
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
            Swal.fire(t('Erreur', 'Error'), t('Impossible de charger les détails.', 'Unable to load details.'), 'error');
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
            // Empêcher le chargement infini si on est en train de filtrer la vue (éviter boucle infinie)
            if (entries[0].isIntersecting && currentPage < lastPage && !loadingMore && !searchTerm) {
                loadMore();
            }
        }, { threshold: 0.1 });

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [currentPage, lastPage, loadingMore, loadMore, searchTerm]);

    useEffect(() => {
        fetchDetails();
    }, [id]);

    const handleEditModel = async () => {
        const { value: formValues } = await Swal.fire({
            title: t('Modifier le modèle', 'Edit model'),
            html: `
                <div style="text-align:left; display:flex; flex-direction:column; gap:14px;">
                    <div>
                        <label style="font-weight:600; font-size:14px; display:block; margin-bottom:4px;">${t('Nom', 'Name')}</label>
                        <input id="swal-edit-name" value="${asset.name}" style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid #d1d5db; font-size:15px;" />
                    </div>
                    <div>
                        <label style="font-weight:600; font-size:14px; display:block; margin-bottom:4px;">${t('Version', 'Version')}</label>
                        <input id="swal-edit-version" type="number" min="1" value="${asset.version_cache || 1}" style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid #d1d5db; font-size:15px;" />
                    </div>
                    <div style="border-top:1px solid #e5e7eb; padding-top:14px;">
                        <label style="font-weight:600; font-size:14px; display:block; margin-bottom:4px;">${t('Remplacer le fichier GLB', 'Replace GLB file')}</label>
                        <input id="swal-edit-file" type="file" accept=".glb" style="width:100%; padding:8px; border-radius:8px; border:1px solid #d1d5db; font-size:14px;" />
                        <span style="font-size:12px; color:#9ca3af; margin-top:4px; display:block;">${t('Optionnel — laissez vide pour conserver le fichier actuel', 'Optional — leave empty to keep the current file')}</span>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            cancelButtonText: t('Annuler', 'Cancel'),
            confirmButtonText: t('Enregistrer', 'Save'),
            confirmButtonColor: '#0ea5e9',
            preConfirm: () => {
                const name = (document.getElementById('swal-edit-name') as HTMLInputElement).value.trim();
                const version = parseInt((document.getElementById('swal-edit-version') as HTMLInputElement).value) || 1;
                const fileInput = document.getElementById('swal-edit-file') as HTMLInputElement;
                const file = fileInput.files?.[0] || null;
                if (!name) {
                    Swal.showValidationMessage(t('Le nom est requis', 'Name is required'));
                    return false;
                }
                return { name, version_cache: version, file };
            }
        });

        if (formValues) {
            try {
                Swal.fire({ title: t('Enregistrement...', 'Saving...'), allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                if (formValues.file) {
                    const token = localStorage.getItem('token');
                    const API_BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, '');
                    const fd = new FormData();
                    fd.append('_method', 'PUT');
                    fd.append('name', formValues.name);
                    fd.append('version_cache', String(formValues.version_cache));
                    fd.append('glb_file', formValues.file);
                    const res = await fetch(`${API_BASE_URL}/models-manager/${id}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json',
                            'Accept-Language': localStorage.getItem('app_lang') || 'fr',
                        },
                        body: fd,
                    });
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error((err as any).error || t('Échec de la mise à jour', 'Update failed'));
                    }
                    await res.json();
                } else {
                    await apiCall(`models-manager/${id}`, {
                        method: 'POST',
                        body: JSON.stringify({ _method: 'PUT', name: formValues.name, version_cache: formValues.version_cache })
                    });
                }
                Swal.fire(t('Succès', 'Success'), t('Modèle mis à jour', 'Model updated'), 'success');
                fetchDetails();
            } catch (e: any) {
                Swal.fire(t('Erreur', 'Error'), e?.message || t('Échec de la mise à jour', 'Update failed'), 'error');
            }
        }
    };

    const handleDeleteAsset = async () => {
        const { value: password } = await Swal.fire({
            title: t('Supprimer le modèle ?', 'Delete model?'),
            html: `
                <p style="margin-bottom: 16px">${t("Cette action supprimera le modèle et tous ses objets associés.", "This will delete the model and all associated objects.")}</p>
                <p style="font-weight:600; margin-bottom:8px">${t('Confirmez avec votre mot de passe', 'Confirm with your password')}</p>
                <input id="swal-delete-password" type="password" class="swal2-input" style="width:80%" placeholder="${t('Mot de passe', 'Password')}" />
            `,
            focusConfirm: false,
            preConfirm: () => {
                const pw = (document.getElementById('swal-delete-password') as HTMLInputElement).value;
                if (!pw) {
                    Swal.showValidationMessage(t('Mot de passe requis', 'Password required'));
                    return false;
                }
                return pw;
            },
            showCancelButton: true,
            cancelButtonText: t('Annuler', 'Cancel'),
            confirmButtonColor: '#f43f5e',
            confirmButtonText: t('Oui, supprimer', 'Yes, delete')
        });

        if (password) {
            try {
                await apiCall(`models-manager/${id}`, { method: 'POST', body: JSON.stringify({ _method: 'DELETE', password }) });
                Swal.fire(t('Supprimé', 'Deleted'), t('Le modèle a été supprimé.', 'The model has been deleted.'), 'success');
                navigate('/model');
            } catch (e: any) {
                Swal.fire(t('Erreur', 'Error'), e?.message || t('Suppression échouée', 'Deletion failed'), 'error');
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
            Swal.fire(t('Succès', 'Success'), t('Objet mis à jour', 'Object updated'), 'success');
        } catch (e) {
            Swal.fire(t('Erreur', 'Error'), t("Mise à jour de l'objet échouée", "Object update failed"), 'error');
        }
    };

    const handleSaveObjectFromModal = async (objId: number, data: any) => {
        try {
            await apiCall(`models-manager/objects/${objId}`, { method: 'POST', body: JSON.stringify({ ...data, _method: 'PUT' }) });
            setObjects(prev => prev.map(o => o.id === objId ? { ...o, ...data } : o));
            Swal.fire({
                icon: 'success',
                title: t('Succès', 'Success'),
                text: t('Objet mis à jour', 'Object updated'),
                timer: 2000,
                showConfirmButton: false
            });
        } catch (e) {
            Swal.fire(t('Erreur', 'Error'), t("Mise à jour de l'objet échouée", "Object update failed"), 'error');
        }
    };

    const handleDeleteObject = async (objId: number) => {
        const result = await Swal.fire({
            title: t('Supprimer cet objet ?', 'Delete this object?'),
            text: t("Cette action est irréversible.", "This action is irreversible."),
            icon: 'warning',
            showCancelButton: true,
            cancelButtonText: t('Annuler', 'Cancel'),
            confirmButtonColor: '#f43f5e',
            confirmButtonText: t('Oui, supprimer', 'Yes, delete')
        });

        if (result.isConfirmed) {
            try {
                await apiCall(`models-manager/objects/${objId}`, { method: 'POST', body: JSON.stringify({ _method: 'DELETE' }) });
                setObjects(prev => prev.filter(o => o.id !== objId));
                setTotalObjects(prev => prev - 1);
                Swal.fire(t('Supprimé', 'Deleted'), t('Objet retiré.', 'Object removed.'), 'success');
            } catch (e) {
                Swal.fire(t('Erreur', 'Error'), t('Suppression échouée', 'Deletion failed'), 'error');
            }
        }
    };


    const handleAddObject = async () => {
        let parentId: number | null = null;

        const { value: formValues } = await Swal.fire({
            title: t('Ajouter un objet', 'Add an object'),
            html: `
                <div style="text-align:left; display:flex; flex-direction:column; gap:20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <label style="font-size:12px; color:#64748b; font-weight:700; text-transform:uppercase;">${t('Nom de l\'objet', 'Object Name')}</label>
                            <input id="swal-input1" class="swal2-input" style="width:100%; margin:4px 0 0 0;" placeholder="${t('Ex: Bras, Avant-bras...', 'Ex: Arm, Forearm...')}">
                        </div>
                        <div>
                            <label style="font-size:12px; color:#64748b; font-weight:700; text-transform:uppercase;">${t('ID ThreeJS (Blender)', 'ThreeJS ID (Blender)')}</label>
                            <input id="swal-input2" class="swal2-input" style="width:100%; margin:4px 0 0 0;" placeholder="${t('ID exact du node Blender', 'Exact Blender node ID')}">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <label style="font-size:12px; color:#64748b; font-weight:700; text-transform:uppercase;">${t('Mesh (optionnel)', 'Mesh (optional)')}</label>
                            <input id="swal-input3" class="swal2-input" style="width:100%; margin:4px 0 0 0;" placeholder="${t('Nom du mesh si différent', 'Mesh name if different')}">
                        </div>
                        <div style="background:rgba(14, 165, 233, 0.03); padding:15px; border-radius:12px; border:1px solid #e2e8f0;">
                            <label style="font-size:12px; color:#64748b; font-weight:700; text-transform:uppercase;">${t('Parent Anatomique', 'Anatomical Parent')}</label>
                            <div style="display:flex; gap:8px; margin-top:4px;">
                                <input id="swal-parent-search" class="swal2-input" style="flex:1; margin:0; font-size:13px;" placeholder="${t('Rechercher...', 'Search...')}">
                                <button type="button" id="search-parent-btn" style="padding:0 12px; background:#0ea5e9; color:white; border:none; border-radius:8px; cursor:pointer;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button>
                            </div>
                            <input id="swal-input-parent-display" class="swal2-input" style="width:100%; margin:8px 0 0 0; background:#f8fafc; font-size:12px;" readonly placeholder="${t('Aucun parent sélectionné', 'No parent selected')}">
                            <div id="parent-results-container" style="max-height:80px; overflow-y:auto; margin-top:8px; font-size:12px;"></div>
                        </div>
                    </div>

                    <div>
                        <label style="font-size:12px; color:#64748b; font-weight:700; text-transform:uppercase;">${t('Description', 'Description')}</label>
                        <textarea id="swal-input4" class="swal2-textarea" style="width:100%; margin:4px 0 0 0; height:400px; font-size:15px; line-height: 1.6; border-radius: 12px;" placeholder="${t('Détails anatomiques...', 'Anatomical details...')}"></textarea>
                    </div>
                </div>
            `,
            width: '90%',
            showCloseButton: true,
            focusConfirm: false,
            didOpen: () => {
                const btn = document.getElementById('search-parent-btn');
                const searchInput = document.getElementById('swal-parent-search') as HTMLInputElement;
                const display = document.getElementById('swal-input-parent-display') as HTMLInputElement;
                const resultsContainer = document.getElementById('parent-results-container') as HTMLDivElement;

                btn?.addEventListener('click', async () => {
                    const query = searchInput.value.trim();
                    if (!query) return;
                    
                    resultsContainer.innerHTML = `<div style="padding:10px; color:#9ca3af;">${t('Recherche...', 'Searching...')}</div>`;
                    
                    try {
                        const results = await apiCall(`models-manager/${id}/search-objects?query=${query}`);
                        resultsContainer.innerHTML = '';
                        
                        if (results.length === 0) {
                            resultsContainer.innerHTML = `<div style="padding:10px; color:#f43f5e;">${t('Aucun résultat', 'No results')}</div>`;
                            return;
                        }

                        results.forEach((obj: any) => {
                            const item = document.createElement('div');
                            item.style.padding = '8px 10px';
                            item.style.borderBottom = '1px solid #f3f4f6';
                            item.style.cursor = 'pointer';
                            item.style.transition = '0.2s';
                            item.innerHTML = `<strong>${obj.name}</strong> <span style="color:#9ca3af; float:right;">ID: ${obj.id}</span>`;
                            
                            item.onmouseover = () => item.style.background = '#f0f9ff';
                            item.onmouseout = () => item.style.background = 'transparent';
                            
                            item.onclick = () => {
                                parentId = obj.id;
                                display.value = `${obj.name} (ID: ${obj.id})`;
                                resultsContainer.innerHTML = '';
                                searchInput.value = '';
                            };
                            resultsContainer.appendChild(item);
                        });
                    } catch (e) {
                        resultsContainer.innerHTML = `<div style="padding:10px; color:#f43f5e;">${t('Erreur', 'Error')}</div>`;
                    }
                });

                // Allow searching with Enter key in search box
                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        btn?.click();
                    }
                });
            },
            preConfirm: () => {
                const name = (document.getElementById('swal-input1') as HTMLInputElement).value.trim();
                const three_js_name = (document.getElementById('swal-input2') as HTMLInputElement).value.trim();
                if (!name || !three_js_name) {
                    Swal.showValidationMessage(t('Le nom et l\'ID ThreeJS sont requis', 'Name and ThreeJS ID are required'));
                    return false;
                }
                return {
                    name,
                    three_js_name,
                    mesh: (document.getElementById('swal-input3') as HTMLInputElement).value.trim(),
                    parent_id: parentId,
                    description: (document.getElementById('swal-input4') as HTMLTextAreaElement).value.trim()
                }
            }
        });

        if (formValues) {
            try {
                const res = await apiCall(`models-manager/${id}/objects`, { method: 'POST', body: JSON.stringify(formValues) });
                setObjects(prev => [res.object, ...prev]);
                setTotalObjects(prev => prev + 1);
                Swal.fire({
                    icon: 'success',
                    title: t('Succès', 'Success'),
                    text: t('Objet ajouté', 'Object added'),
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (e: any) {
                Swal.fire(t('Erreur', 'Error'), e?.message || t('Ajout échoué', 'Addition failed'), 'error');
            }
        }
    };

    const handleImportHierarchy = async () => {
        const { value: importType } = await Swal.fire({
            title: t('Importer la hiérarchie', 'Import hierarchy'),
            text: t("Choisissez le mode d'importation", "Choose import mode"),
            icon: 'question',
            showCancelButton: true,
            cancelButtonText: t('Annuler', 'Cancel'),
            confirmButtonText: t('Default JSON (Server)', 'Default JSON (Server)'),
            showDenyButton: true,
            denyButtonText: t('Importer un fichier', 'Upload File'),
            denyButtonColor: '#0ea5e9'
        });

        let jsonData: any = null;

        if (importType === true) {
            // Default JSON
            try {
                Swal.fire({ title: t('Chargement du JSON...', 'Loading JSON...'), allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                // On récupère d'abord le contenu pour previsualisation
                // On récupère d'abord le contenu pour previsualisation
                const res = await apiCall(`models-manager/${id}/import-hierarchy?preview=1`, { method: 'POST', body: JSON.stringify({ use_default: true }) });
                jsonData = res.data;
            } catch (e) {
                Swal.fire(t('Erreur', 'Error'), t('Impossible de lire le fichier par défaut', 'Unable to read the default file'), 'error');
                return;
            }
        } else if (importType === false) {
            // Upload File
            const { value: file } = await Swal.fire({
                title: t('Sélectionner le fichier JSON', 'Select JSON file'),
                input: 'file',
                inputAttributes: { 'accept': 'application/json' }
            });

            if (file) {
                try {
                    const text = await file.text();
                    jsonData = JSON.parse(text);
                } catch (e) {
                    Swal.fire(t('Erreur', 'Error'), t('Fichier JSON invalide', 'Invalid JSON file'), 'error');
                    return;
                }
            }
        }

        if (jsonData) {
            // PREVISUALISATION ET EDITION
            const result = await Swal.fire({
                title: t('Vérification et Édition des données', 'Data Verification and Editing'),
                html: `<div style="text-align:left; display:flex; flex-direction:column; gap:10px;">
                    <p style="font-size:14px; color:#666">${t('Vous pouvez modifier le JSON directement ci-dessous avant de valider.', 'You can modify the JSON directly below before validating.')}</p>
                    <div style="display:flex; align-items:center; gap:12px; background:#f9fafb; padding:10px 14px; border-radius:8px; border:1px solid #e5e7eb;">
                        <label style="font-weight:600; font-size:14px; white-space:nowrap;">${t('Version:', 'Version:')}</label>
                        <input id="swal-version-input" type="number" min="1" value="${asset.version_cache || 1}" style="flex:1; padding:6px 10px; border-radius:6px; border:1px solid #d1d5db; font-size:14px;" />
                        <span style="font-size:12px; color:#9ca3af; white-space:nowrap;">${t('(actuelle: ' + (asset.version_cache || 1) + ')', '(current: ' + (asset.version_cache || 1) + ')')}</span>
                    </div>
                    <textarea id="swal-json-editor" style="width:100%; height:400px; background:#1e1e1e; color:#d4d4d4; padding:15px; border-radius:8px; font-family:monospace; font-size:13px; line-height:1.5; outline:none; border:none;">${JSON.stringify(jsonData, null, 2)}</textarea>
                </div>`,
                width: '95%',
                showCancelButton: true,
                cancelButtonText: t('Annuler', 'Cancel'),
                confirmButtonText: t('Confirmer l\'importation', 'Confirm import'),
                preConfirm: () => {
                    const editor = document.getElementById('swal-json-editor') as HTMLTextAreaElement;
                    const versionInput = document.getElementById('swal-version-input') as HTMLInputElement;
                    try {
                        return {
                            objects: JSON.parse(editor.value),
                            version_cache: parseInt(versionInput.value) || 1
                        };
                    } catch (e) {
                        Swal.showValidationMessage(t('JSON invalide ! Veuillez corriger les erreurs de syntaxe.', 'Invalid JSON! Please correct syntax errors.'));
                        return false;
                    }
                }
            });

            if (result.isConfirmed) {
                try {
                    Swal.fire({ title: t('Importation en cours...', 'Importing...'), allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                    // Envoi effectif
                    const finalData = result.value;
                    await apiCall(`models-manager/${id}/import-hierarchy`, { 
                        method: 'POST', 
                        body: JSON.stringify({ 
                            objects: finalData.objects.objects || finalData.objects,
                            version_cache: finalData.version_cache 
                        }) 
                    });
                    Swal.fire(t('Succès', 'Success'), t('Importation réussie', 'Import successful'), 'success');
                    fetchDetails();
                } catch (e) {
                    Swal.fire(t('Erreur', 'Error'), t("L'importation a échoué", "Import failed"), 'error');
                }
            }
        }
    };

    if (loading) return <App title={t('Chargement...', 'Loading...')}><div style={{ padding: '40px', textAlign: 'center' }}>{t("Veuillez patienter...", "Please wait...")}</div></App>;
    if (!asset) return <App title={t("Erreur", "Error")}><div style={{ padding: '40px', textAlign: 'center' }}>{t("Modèle non trouvé.", "Model not found.")}</div></App>;

    return (
        <App breadcrumb={t("Administration / Modèles", "Administration / Models")} title={asset.name}>
            
            <div style={{ marginBottom: '24px' }}>
                <button 
                    onClick={() => navigate('/model')}
                    style={{ background: 'none', border: 'none', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, padding: 0, marginBottom: '20px' }}
                >
                    <ArrowLeft size={18} /> {t("Retour à la liste", "Back to list")}
                </button>

                <div style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ModelNameSection asset={asset} onRenamed={fetchDetails} />
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            onClick={handleEditModel}
                            style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', border: '1px solid #0ea5e950', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Edit2 size={18} /> {t("Modifier", "Edit")}
                        </button>
                        <button 
                            onClick={handleDeleteAsset}
                            style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid #f43f5e50', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Trash2 size={18} /> {t("Supprimer le modèle", "Delete model")}
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--dash-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700 }}>
                        <Info size={20} color="#f59e0b" /> {t("Objets Anatomiques", "Anatomical Objects")} ({totalObjects})
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleImportHierarchy} style={{ padding: '8px 16px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Save size={18} /> {t("Import JSON En Max", "Import JSON In Max")}
                        </button>
                        <button onClick={handleAddObject} style={{ padding: '8px 16px', background: '#34d399', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={18} /> {t("Ajouter un objet", "Add an object")}
                        </button>
                    </div>
                </div>

                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--dash-border)' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', color: 'var(--dash-text-muted)' }} />
                        <input 
                            type="text" 
                            placeholder={t("Rechercher dans les objets chargés...", "Search in loaded objects...")}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '10px 16px 10px 44px', borderRadius: '10px', border: '1px solid var(--dash-border)', background: 'transparent', color: 'var(--dash-text)', outline: 'none' }}
                        />
                    </div>
                </div>

                <div style={{ padding: '24px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--dash-border)', color: 'var(--dash-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                                <th style={{ padding: '12px' }}>{t("Nom", "Name")}</th>
                                <th style={{ padding: '12px' }}>{t("Parent ID", "Parent ID")}</th>
                                <th style={{ padding: '12px' }}>{t("ID ThreeJS", "ThreeJS ID")}</th>
                                <th style={{ padding: '12px' }}>{t("Mesh", "Mesh")}</th>
                                <th style={{ padding: '12px' }}>{t("Description", "Description")}</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>{t("Actions", "Actions")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const filtered = objects.filter(obj => 
                                    obj.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    obj.three_js_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    obj.id.toString().includes(searchTerm)
                                );
                                if (filtered.length === 0 && searchTerm) {
                                    return (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '60px', textAlign: 'center' }}>
                                                <div style={{ color: 'var(--dash-text-muted)', fontSize: '15px' }}>
                                                    <Search size={40} style={{ opacity: 0.1, display: 'block', margin: '0 auto 10px' }} />
                                                    {t("Aucun objet ne correspond à votre recherche.", "No objects match your search.")}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }
                                return filtered.map((obj: any) => (
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
                                            <span style={{ fontSize: '12px' }}>{obj.mesh || t('N/A', 'N/A')}</span>
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
                                                {obj.description || t('Aucune description', 'No description')}
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
                                                        let currentParentId = obj.parent_id;
                                                        Swal.fire({
                                                            title: `<div style="text-align: left; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px; font-weight: 800; font-size: 22px; color: #1e293b;">${t('Édition de l\'objet', 'Object Edition')}</div>`,
                                                            html: `
                                                                <div style="text-align: left; padding: 20px 0; display: flex; flex-direction: column; gap: 20px;">
                                                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                                                        <div>
                                                                            <label style="display: block; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 6px;">${t('Nom de l\'objet', 'Object Name')}</label>
                                                                            <input id="swal-edit-obj-name" class="swal2-input" style="width:100%; margin:0; font-size: 15px; font-weight: 600;" value="${obj.name || ''}">
                                                                        </div>
                                                                        <div>
                                                                            <label style="display: block; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 6px;">ID ThreeJS</label>
                                                                            <input id="swal-edit-obj-three" class="swal2-input" style="width:100%; margin:0; font-size: 14px; font-family: monospace;" value="${obj.three_js_name || ''}">
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                                                        <div>
                                                                            <label style="display: block; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 6px;">${t('Mesh associé', 'Associated Mesh')}</label>
                                                                            <input id="swal-edit-obj-mesh" class="swal2-input" style="width:100%; margin:0; font-size: 14px;" value="${obj.mesh || ''}">
                                                                        </div>
                                                                        <div>
                                                                            <label style="display: block; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 6px;">${t('Parent Anatomique', 'Anatomical Parent')}</label>
                                                                            <div style="display:flex; gap:8px;">
                                                                                <input id="swal-edit-obj-parent-search" class="swal2-input" style="flex:1; margin:0; font-size: 13px;" placeholder="${t('Rechercher...', 'Search...')}">
                                                                                <button type="button" id="edit-search-parent-btn" style="padding:0 12px; background:#0ea5e9; color:white; border:none; border-radius:8px; cursor:pointer;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button>
                                                                            </div>
                                                                            <input id="swal-edit-obj-parent-display" class="swal2-input" style="width:100%; margin:5px 0 0 0; background:#f8fafc; font-size:12px; color: #64748b;" readonly value="${obj.parent_id ? 'ID: ' + obj.parent_id : t('Aucun parent', 'No parent')}">
                                                                            <div id="edit-parent-results" style="max-height:80px; overflow-y:auto; margin-top:5px;"></div>
                                                                        </div>
                                                                    </div>

                                                                    <div>
                                                                        <label style="display: block; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 6px;">Description</label>
                                                                        <textarea id="swal-edit-obj-desc" class="swal2-textarea" style="width:100%; margin:0; height:400px; font-size: 15px; line-height: 1.6; border-radius: 12px; background: #fff;">${obj.description || ''}</textarea>
                                                                    </div>
                                                                </div>
                                                            `,
                                                            width: '90%',
                                                            showCloseButton: true,
                                                            showConfirmButton: true,
                                                            showCancelButton: true,
                                                            confirmButtonText: t('Enregistrer les modifications', 'Save Changes'),
                                                            cancelButtonText: t('Fermer', 'Close'),
                                                            confirmButtonColor: '#0ea5e9',
                                                            focusConfirm: false,
                                                            didOpen: () => {
                                                                const btn = document.getElementById('edit-search-parent-btn');
                                                                const searchInput = document.getElementById('swal-edit-obj-parent-search') as HTMLInputElement;
                                                                const display = document.getElementById('swal-edit-obj-parent-display') as HTMLInputElement;
                                                                const resultsContainer = document.getElementById('edit-parent-results') as HTMLDivElement;

                                                                if (btn) {
                                                                    btn.onclick = async () => {
                                                                        const query = searchInput.value.trim();
                                                                        if (!query) return;
                                                                        resultsContainer.innerHTML = '<div style="padding:5px; font-size:11px;">Loading...</div>';
                                                                        try {
                                                                            const results = await apiCall(`models-manager/${id}/search-objects?query=${query}`);
                                                                            resultsContainer.innerHTML = '';
                                                                            results.forEach((r: any) => {
                                                                                const div = document.createElement('div');
                                                                                div.style.padding = '5px 8px';
                                                                                div.style.cursor = 'pointer';
                                                                                div.style.borderBottom = '1px solid #f1f5f9';
                                                                                div.style.fontSize = '12px';
                                                                                div.innerHTML = `<strong>${r.name}</strong> <span style="color:#94a3b8; float:right;">ID: ${r.id}</span>`;
                                                                                div.onclick = () => {
                                                                                    currentParentId = r.id;
                                                                                    display.value = `${r.name} (ID: ${r.id})`;
                                                                                    resultsContainer.innerHTML = '';
                                                                                    searchInput.value = '';
                                                                                };
                                                                                resultsContainer.appendChild(div);
                                                                            });
                                                                        } catch { resultsContainer.innerHTML = 'Error'; }
                                                                    };
                                                                }
                                                            },
                                                            preConfirm: () => {
                                                                const name = (document.getElementById('swal-edit-obj-name') as HTMLInputElement).value.trim();
                                                                const three = (document.getElementById('swal-edit-obj-three') as HTMLInputElement).value.trim();
                                                                if (!name || !three) {
                                                                    Swal.showValidationMessage(t('Nom et ID ThreeJS requis', 'Name and ThreeJS ID required'));
                                                                    return false;
                                                                }
                                                                return {
                                                                    name,
                                                                    three_js_name: three,
                                                                    mesh: (document.getElementById('swal-edit-obj-mesh') as HTMLInputElement).value.trim(),
                                                                    parent_id: currentParentId,
                                                                    description: (document.getElementById('swal-edit-obj-desc') as HTMLTextAreaElement).value.trim()
                                                                };
                                                            }
                                                        }).then((result) => {
                                                            if (result.isConfirmed) {
                                                                handleSaveObjectFromModal(obj.id, result.value);
                                                            }
                                                        });
                                                    }} style={{ padding: '6px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Eye size={16}/></button>
                                                    <button onClick={() => handleEditObject(obj)} style={{ padding: '6px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Edit2 size={16}/></button>
                                                    <button onClick={() => handleDeleteObject(obj.id)} style={{ padding: '6px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={16}/></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))})()}
                        </tbody>
                    </table>

                    {/* Sentinel pour le scroll infini */}
                    <div ref={sentinelRef} style={{ padding: '20px', textAlign: 'center' }}>
                        {loadingMore && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--dash-text-muted)' }}>
                                <Loader2 size={18} className="spin" /> {t('Chargement...', 'Loading...')}
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

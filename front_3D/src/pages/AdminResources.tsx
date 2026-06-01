import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, CheckCircle, Database, Box, X, Monitor, Loader2 } from 'lucide-react';
import App from '../components/layouts/App';
import { apiCall } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const AdminResources: React.FC = () => {
    const { language } = useLanguage();
    const navigate = useNavigate();
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeSection, setActiveSection] = useState<'list' | 'import'>('list');

    // --- Import state ---
    const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'preview' | 'saving' | 'done'>('idle');
    const [previewData, setPreviewData] = useState<any>(null);
    const [previewObjects, setPreviewObjects] = useState<any[]>([]);
    const [assetName, setAssetName] = useState('');
    const [uploadError, setUploadError] = useState<string | null>(null);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const res = await apiCall('models-manager');
            setAssets(Array.isArray(res) ? res : []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => {
        if (activeSection === 'list') fetchAssets();
    }, [activeSection]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadPhase('uploading');
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('glb_file', file);

            const token = localStorage.getItem('token'); 
            const BASE = import.meta.env.VITE_API_URL;
            const res = await fetch(`${BASE}/models-manager/upload`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || (language === 'fr' ? 'Erreur lors du téléversement (Fichier trop gros ?)' : 'Upload error (File too large?)'));
            }

            const data = await res.json();
            setPreviewData(data);
            setPreviewObjects(data.objects || []);
            
            const pureName = file.name.split('.')[0] || '';
            const prettyName = pureName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            setAssetName(prettyName);

            setUploadPhase('preview');
        } catch (e: any) {
            setUploadError(e.message);
            setUploadPhase('idle');
        }
    };

    const handleConfirm = async () => {
        setUploadPhase('saving');
        try {
            const token = localStorage.getItem('token');
            const BASE = import.meta.env.VITE_API_URL;
            const res = await fetch(`${BASE}/models-manager/confirm`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    tmp_path: previewData.tmp_path, 
                    objects: previewObjects,
                    name: assetName 
                }),
            });
            if (!res.ok) throw new Error(language === 'fr' ? 'Erreur confirmation' : 'Confirmation error');
            setUploadPhase('done');
            setTimeout(() => { setActiveSection('list'); resetUpload(); }, 2000);
        } catch (e: any) {
            setUploadError(e.message);
            setUploadPhase('preview');
        }
    };

    const resetUpload = () => {
        setUploadPhase('idle'); 
        setPreviewData(null);
        setPreviewObjects([]); 
        setUploadError(null);
        setAssetName('');
    };

    return (
        <App breadcrumb={language === 'fr' ? 'Administration' : 'Administration'} title={language === 'fr' ? 'Ressources 3D' : '3D Resources'}>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', background: 'rgba(0,0,0,0.02)', padding: '6px', borderRadius: '12px', width: 'fit-content', border: '1px solid var(--dash-border)' }}>
                <button
                    onClick={() => setActiveSection('list')}
                    style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: activeSection === 'list' ? 'var(--dash-bg)' : 'transparent', color: activeSection === 'list' ? '#0ea5e9' : 'var(--dash-text-muted)', fontWeight: 700, cursor: 'pointer', boxShadow: activeSection === 'list' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Database size={16} /> {language === 'fr' ? 'Modèles existants' : 'Existing Models'}
                </button>
                <button
                    onClick={() => setActiveSection('import')}
                    style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: activeSection === 'import' ? 'var(--dash-bg)' : 'transparent', color: activeSection === 'import' ? '#f59e0b' : 'var(--dash-text-muted)', fontWeight: 700, cursor: 'pointer', boxShadow: activeSection === 'import' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <UploadCloud size={16} /> {language === 'fr' ? 'Importer un modèle' : 'Import a model'}
                </button>
            </div>

            {activeSection === 'list' && (
                <div style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '16px', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--dash-border)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Box size={18} color="#0ea5e9"/> {language === 'fr' ? 'Liste des modèles' : 'Models List'}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--dash-border)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--dash-text-muted)' }}>
                                    <th style={{ padding: '12px 20px', textAlign: 'left' }}>{language === 'fr' ? 'Nom / Fichier' : 'Name / File'}</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'center' }}>{language === 'fr' ? 'Objets' : 'Objects'}</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'right' }}>{language === 'fr' ? 'Date' : 'Date'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={3} style={{ padding: '40px', textAlign: 'center' }}>{language === 'fr' ? 'Chargement...' : 'Loading...'}</td></tr>
                                ) : assets.length === 0 ? (
                                    <tr><td colSpan={3} style={{ padding: '40px', textAlign: 'center' }}>{language === 'fr' ? 'Aucun modèle.' : 'No models.'}</td></tr>
                                ) : (
                                    assets.map(a => (
                                        <tr key={a.id} onClick={() => navigate(`/model/${a.id}`)} style={{ borderBottom: '1px solid var(--dash-border)', cursor: 'pointer', transition: '0.2s' }}>
                                            <td style={{ padding: '14px 20px' }}>
                                                <div style={{ fontWeight: 600, fontSize: '14px' }}>{a.name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--dash-text-muted)', fontFamily: 'monospace' }}>{a.url_glb.split('/').pop()}</div>
                                            </td>
                                            <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', fontSize: '12px', fontWeight: 700 }}>{a.objects}</span>
                                            </td>
                                            <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: '12px', color: 'var(--dash-text-muted)' }}>
                                                {new Date(a.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeSection === 'import' && (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    {uploadError && (
                        <div style={{ padding: '12px 16px', background: 'rgba(244,63,94,0.1)', border: '1px solid #f43f5e50', borderRadius: '10px', color: '#f43f5e', marginBottom: '16px', fontSize: '13px' }}>
                            {uploadError}
                        </div>
                    )}

                    {uploadPhase === 'done' ? (
                        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--dash-bg)', borderRadius: '24px', border: '1px solid var(--dash-border)' }}>
                            <CheckCircle size={64} color="#34d399" style={{ margin: '0 auto 24px' }} />
                            <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>{language === 'fr' ? 'Importation réussie !' : 'Import successful!'}</h3>
                            <p style={{ color: 'var(--dash-text-muted)' }}>{language === 'fr' ? 'Le modèle a été ajouté à votre bibliothèque.' : 'The model has been added to your library.'}</p>
                        </div>
                    ) : uploadPhase === 'uploading' ? (
                        <div style={{ textAlign: 'center', padding: '100px', background: 'var(--dash-bg)', borderRadius: '24px', border: '1px solid var(--dash-border)' }}>
                            <Loader2 size={48} color="#f59e0b" className="spin" style={{ margin: '0 auto 20px' }} />
                            <h3>{language === 'fr' ? 'Téléversement en cours...' : 'Uploading in progress...'}</h3>
                            <p style={{ color: 'var(--dash-text-muted)' }}>{language === 'fr' ? 'Veuillez patienter pendant le traitement du fichier.' : 'Please wait while the file is being processed.'}</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            
                            {uploadPhase === 'idle' && (
                                <div style={{ background: 'var(--dash-bg)', padding: '60px 40px', borderRadius: '24px', border: '2px dashed #f59e0b40', textAlign: 'center', transition: '0.3s' }} className="upload-zone">
                                    <div style={{ width: '80px', height: '80px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', margin: '0 auto 24px' }}>
                                        <Monitor size={40} />
                                    </div>
                                    <h2 style={{ marginBottom: '12px', fontSize: '22px' }}>{language === 'fr' ? 'Importer depuis votre appareil' : 'Import from your device'}</h2>
                                    <p style={{ fontSize: '15px', color: 'var(--dash-text-muted)', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
                                        {language === 'fr' 
                                            ? <span>Sélectionnez un fichier 3D au format <b>.glb</b> (ou une archive <b>.zip</b> contenant modèle et données).</span>
                                            : <span>Select a 3D file in <b>.glb</b> format (or a <b>.zip</b> archive containing model and data).</span>
                                        }
                                    </p>
                                    
                                    <label style={{ display: 'inline-flex', padding: '14px 32px', background: '#f59e0b', color: '#fff', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', gap: '10px', fontSize: '16px', boxShadow: '0 8px 20px rgba(245, 158, 11, 0.2)' }}>
                                        <UploadCloud size={20} /> {language === 'fr' ? 'Sélectionner le fichier' : 'Select file'}
                                        <input type="file" accept=".glb,.zip" onChange={handleFileUpload} style={{ display: 'none' }} />
                                    </label>
                                </div>
                            )}

                            {(uploadPhase === 'preview' || uploadPhase === 'saving') && (
                                <div style={{ background: '#0ea5e908', padding: '40px', borderRadius: '24px', border: '2px solid #0ea5e9' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '20px' }}>{language === 'fr' ? 'Finaliser l\'importation' : 'Finalize Import'}</h3>
                                            <p style={{ fontSize: '14px', color: 'var(--dash-text-muted)', marginTop: '4px' }}>{previewData?.filename}</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button onClick={resetUpload} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--dash-border)', background: 'var(--dash-bg)', color: 'var(--dash-text)', fontWeight: 600, cursor: 'pointer' }}>{language === 'fr' ? 'Annuler' : 'Cancel'}</button>
                                            <button onClick={handleConfirm} disabled={uploadPhase === 'saving' || !assetName} style={{ padding: '10px 24px', background: '#34d399', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)' }}>
                                                {uploadPhase === 'saving' ? (language === 'fr' ? 'Enregistrement...' : 'Saving...') : (language === 'fr' ? 'Valider et Ajouter' : 'Validate and Add')}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', color: 'var(--dash-text-muted)', letterSpacing: '0.05em' }}>{language === 'fr' ? 'Nom d\'affichage dans la bibliothèque' : 'Library display name'}</label>
                                        <input type="text" value={assetName} onChange={e => setAssetName(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #0ea5e940', background: 'var(--dash-bg)', color: 'var(--dash-text)', fontSize: '18px', fontWeight: 600, outline: 'none' }} />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', color: 'var(--dash-text-muted)', letterSpacing: '0.05em' }}>
                                            {language === 'fr' ? `Objets anatomiques détectés (${previewObjects.length})` : `Detected anatomical objects (${previewObjects.length})`}
                                        </label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '250px', overflowY: 'auto', padding: '4px' }}>
                                            {previewObjects.length > 0 ? previewObjects.map((obj, i) => (
                                                <div key={i} style={{ padding: '12px 16px', background: 'var(--dash-bg)', borderRadius: '12px', border: '1px solid var(--dash-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{obj.name}</span>
                                                    <button onClick={() => setPreviewObjects(prev => prev.filter((_, idx) => idx !== i))} style={{ color: '#f43f5e', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={16}/></button>
                                                </div>
                                            )) : (
                                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px', color: 'var(--dash-text-muted)', fontSize: '13px' }}>
                                                    {language === 'fr' ? 'Aucun objet automatique. Vous pourrez les ajouter manuellement plus tard.' : 'No automatic objects. You can add them manually later.'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <style>{`
                .spin { animation: spin 1.2s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .upload-zone:hover { border-color: #f59e0b !important; background: rgba(245, 158, 11, 0.02) !important; }
            `}</style>
        </App>
    );
};

export default AdminResources;

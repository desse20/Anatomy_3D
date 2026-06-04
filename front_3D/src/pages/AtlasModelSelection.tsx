import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import App from '../components/layouts/App';
import { apiCall, downloadWithProgress } from '../services/api';
import { offlineCache } from '../services/offlineCache';
import Swal from 'sweetalert2';
import { getSwalTheme } from '../services/swalTheme';
import { Box, Play, Info, Loader2, Download, CheckCircle, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const OFFLINE_KEY = 'offline_downloads';

function getDownloaded(): string[] {
    try { return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]'); }
    catch { return []; }
}

function markDownloaded(id: string) {
    const list = getDownloaded();
    if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem(OFFLINE_KEY, JSON.stringify(list));
    }
}

function unmarkDownloaded(id: string) {
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(getDownloaded().filter(x => x !== id)));
}

const AtlasModelSelection: React.FC = () => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

    const navigate = useNavigate();
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set(getDownloaded()));
    const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
    const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

    useEffect(() => {
        fetchAssets();
    }, []);

    useEffect(() => {
        setDownloadedIds(new Set(getDownloaded()));
    }, [assets]);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const res = await apiCall('models-manager');
            const data = Array.isArray(res) ? res : [];
            setAssets(data);
            setError(false);
        } catch (e) {
            console.warn("[Network] Impossible de charger les modèles depuis le serveur, tentative via le cache local...");
            try {
                const allCached = await offlineCache.getCachedAssets();
                const fullyCached = [];
                
                // Vérifier pour chaque asset s'il est vraiment complet (GLB + Hiérarchie)
                for (const a of allCached) {
                    const isOk = await offlineCache.isFullyCached(a.id);
                    if (isOk) fullyCached.push(a);
                }

                if (fullyCached.length > 0) {
                    setAssets(fullyCached.map(a => ({
                        id: a.id,
                        name: a.name,
                        objects: '?', 
                        url_glb: a.url_glb
                    })));
                    setError(false);
                } else {
                    setError(true);
                }
            } catch (cacheError) {
                console.error("Cache failure:", cacheError);
                setError(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = useCallback(async (asset: any) => {
        const assetId = asset.id;
        setDownloadingIds(prev => new Set(prev).add(assetId));
        setDownloadProgress(prev => ({ ...prev, [assetId]: 0 }));

        try {
            const token = localStorage.getItem('token');
            const endpoint = `models-manager/${assetId}/offline-package${token ? `?token=${token}` : ''}`;

            const zipBlob = await downloadWithProgress(endpoint, (pct) => {
                setDownloadProgress(prev => ({ ...prev, [assetId]: pct }));
            });

            setDownloadProgress(prev => ({ ...prev, [assetId]: 95 }));

            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${asset.name.replace(/[^a-zA-Z0-9_\-]/g, '_')}_offline.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 10000);

            markDownloaded(assetId);
            setDownloadedIds(prev => new Set(prev).add(assetId));

            Swal.fire({
                icon: 'success',
                title: t('Téléchargement terminé', 'Download complete'),
                text: t(
                    `Décompressez l'archive pour obtenir le dossier "${asset.name}" ouvrable hors-ligne.`,
                    `Extract the archive to get the "${asset.name}" folder, openable offline.`
                ),
                timer: 3000,
                showConfirmButton: false,
                ...getSwalTheme(),
            });
        } catch (e: any) {
            console.error('Download failed:', e);
            Swal.fire({
                icon: 'error',
                title: t('Téléchargement échoué', 'Download failed'),
                text: t(
                    'Réseau instable ou fichier trop volumineux. Veuillez réessayer.',
                    'Unstable network or file too large. Please try again.'
                ),
                ...getSwalTheme(),
            });
        } finally {
            setDownloadingIds(prev => {
                const next = new Set(prev);
                next.delete(assetId);
                return next;
            });
            setDownloadProgress(prev => {
                const next = { ...prev };
                delete next[assetId];
                return next;
            });
        }
    }, [t]);

    const handleClearDownload = useCallback((assetId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        unmarkDownloaded(assetId);
        setDownloadedIds(prev => {
            const next = new Set(prev);
            next.delete(assetId);
            return next;
        });
        Swal.fire({
            icon: 'info',
            title: t('Référence effacée', 'Reference cleared'),
            text: t(
                'La trace de téléchargement a été supprimée. Vous pouvez télécharger à nouveau.',
                'The download trace has been removed. You can download again.'
            ),
            timer: 1500,
            showConfirmButton: false,
            ...getSwalTheme(),
        });
    }, [t]);

    const handleClearAllCache = async () => {
        const result = await Swal.fire({
            title: t('Vider le cache local ?', 'Clear local cache?'),
            text: t('Cela supprimera tous les modèles stockés dans votre navigateur.', 'This will delete all models stored in your browser.'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: t('Oui, vider', 'Yes, clear'),
            cancelButtonText: t('Annuler', 'Cancel'),
            ...getSwalTheme()
        });

        if (result.isConfirmed) {
            await offlineCache.clearAll();
            localStorage.removeItem('offline_downloads');
            setDownloadedIds(new Set());
            fetchAssets();
            Swal.fire({
                title: t('Cache vidé', 'Cache cleared'),
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                ...getSwalTheme()
            });
        }
    };

    if (loading) {
        return (
            <App title={t('Chargement Atlas', 'Loading Atlas')}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '40px', justifyContent: 'center' }}>
                    <Loader2 className="spin" size={48} color="#0ea5e9" />
                </div>
            </App>
        );
    }

    return (
        <App breadcrumb={t('Atlas / Sélection', 'Atlas / Selection')} title={t('Choisir un Modèle Anatomique', 'Choose an Anatomical Model')}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <button 
                    onClick={handleClearAllCache}
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '8px 16px', 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        color: '#ef4444', 
                        border: '1px solid rgba(239, 68, 68, 0.2)', 
                        borderRadius: '10px', 
                        fontSize: '13px', 
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    <Trash2 size={14} /> {t('Vider le cache local', 'Clear local cache')}
                </button>
            </div>
            <div className="atlas-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px', padding: '20px 0' }}>
                {assets.map(asset => {
                    const isDownloaded = downloadedIds.has(asset.id);
                    const isDownloading = downloadingIds.has(asset.id);
                    const progress = downloadProgress[asset.id] || 0;

                    return (
                        <div 
                            key={asset.id} 
                            style={{ 
                                background: 'var(--dash-bg)', 
                                border: '1px solid var(--dash-border)', 
                                borderRadius: '20px', 
                                overflow: 'hidden',
                                transition: 'transform 0.3s, box-shadow 0.3s',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                            onClick={() => navigate(`/atlas/viewer?asset=${asset.id}`)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-5px)';
                                e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div className="atlas-card-image" style={{ height: '250px', background: `url('https://i.pinimg.com/1200x/ff/2e/1f/ff2e1f842669f12ca6c2a4d513c3755a.jpg') center/cover no-repeat`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                <Box size={64} style={{ opacity: 0.8 }} />
                                {isDownloaded && (
                                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#22c55e', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CheckCircle size={18} color="white" />
                                    </div>
                                )}
                            </div>
                            <div className="atlas-card-content" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <h3 className="atlas-card-title" style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.name}</h3>
                                <p className="atlas-card-desc" style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--dash-text-muted)', flex: 1 }}>
                                    {asset.objects || 0} {t('objets anatomiques répertoriés.', 'anatomical objects listed.')}
                                </p>

                                {isDownloading && (
                                    <div style={{ marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--dash-text-muted)', marginBottom: '4px' }}>
                                            <span>{t('Préparation du pack hors-ligne...', 'Preparing offline pack...')}</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div style={{ height: '6px', background: 'var(--dash-border)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${progress}%`, background: '#0ea5e9', borderRadius: '3px', transition: 'width 0.3s' }} />
                                        </div>
                                    </div>
                                )}

                                <button 
                                    className="atlas-card-button"
                                    style={{ 
                                        width: '100%', 
                                        padding: '12px', 
                                        backgroundColor: '#0ea5e9', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '12px', 
                                        fontWeight: 700, 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        gap: '10px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Play size={18} fill="currentColor" /> {t('Explorer en 3D', 'Explore in 3D')}
                                </button>

                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                    {!isDownloading && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDownload(asset); }}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                background: isDownloaded ? 'var(--dash-accent-hover)' : 'transparent',
                                                color: isDownloaded ? 'var(--dash-text-muted)' : 'var(--dash-text-main)',
                                                border: '1px solid var(--dash-border)',
                                                borderRadius: '10px',
                                                fontWeight: 600,
                                                fontSize: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                            }}
                                            title={t('Télécharger le pack hors-ligne (HTML + GLB + JSON)', 'Download offline pack (HTML + GLB + JSON)')}
                                        >
                                            <Download size={14} />
                                            {t('Pack hors-ligne', 'Offline pack')}
                                        </button>
                                    )}
                                    {isDownloaded && !isDownloading && (
                                        <button
                                            onClick={(e) => handleClearDownload(asset.id, e)}
                                            style={{
                                                padding: '10px',
                                                background: 'transparent',
                                                color: '#ef4444',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                borderRadius: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                            }}
                                            title={t('Effacer la référence', 'Clear reference')}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {assets.length === 0 && !error && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--dash-text-muted)' }}>
                        <Box size={48} style={{ marginBottom: '16px', opacity: 0.1 }} />
                        <p style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{t('Aucun modèle disponible', 'No models available')}</p>
                        <p style={{ fontSize: '14px' }}>{t('La bibliothèque est vide pour le moment.', 'The library is currently empty.')}</p>
                    </div>
                )}

                {error && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#ef4444' }}>
                        <Info size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{t('Erreur de connexion', 'Connection Error')}</p>
                        <p style={{ fontSize: '14px' }}>{t('Impossible de charger les modèles. Vérifiez votre connexion.', 'Unable to load models. Check your connection.')}</p>
                        <button onClick={fetchAssets} style={{ marginTop: '20px', padding: '10px 20px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{t('Réessayer', 'Retry')}</button>
                    </div>
                )}
            </div>
            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .atlas-card-image { position: relative; }
                @media (max-width: 768px) {
                    .atlas-grid {
                        grid-template-columns: 1fr !important;
                        padding: 10px 0 !important;
                        gap: 16px !important;
                    }
                    .atlas-card-image {
                        height: 180px !important;
                    }
                    .atlas-card-title {
                        font-size: 14px !important;
                    }
                    .atlas-card-desc {
                        font-size: 12px !important;
                    }
                    .atlas-card-content {
                        padding: 16px !important;
                    }
                    .atlas-card-button {
                        padding: 10px !important;
                        font-size: 13px !important;
                    }
                }
            `}</style>
        </App>
    );
};

export default AtlasModelSelection;

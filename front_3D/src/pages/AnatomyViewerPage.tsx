import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import AnatomyViewer from '../components/AnatomyViewer';
import App from '../components/layouts/App';
import { apiCall } from '../services/api';
import { offlineCache } from '../services/offlineCache';
import { useLanguage } from '../contexts/LanguageContext';
import { WifiOff, CloudOff, Loader2 } from 'lucide-react';

interface AnatomyItem {
  id: number;
  name: string;
  three_js_name: string;
  parent_id?: number | null;
  type: string;
  description?: string;
}

const AnatomyViewerPage: React.FC = () => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

    const [searchParams] = useSearchParams();
    const assetId = searchParams.get('asset');
    const [assetName, setAssetName] = useState<string>(t('Modèle 3D', '3D Model'));
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [cachedHierarchy, setCachedHierarchy] = useState<AnatomyItem[] | null>(null);
    const [cachedGlbUrl, setCachedGlbUrl] = useState<string | null>(null);
    const [needsInitialConnection, setNeedsInitialConnection] = useState(false);
    const [checkingCache, setCheckingCache] = useState(true);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (assetId) {
            apiCall(`models-manager/${assetId}`)
                .then(data => {
                    if (data && data.name) setAssetName(data.name);
                })
                .catch(() => {
                    if (cachedHierarchy) {
                        const asset = cachedHierarchy[0];
                        if (asset) setAssetName(String(asset.id));
                    }
                });
        }
    }, [assetId, cachedHierarchy]);

    useEffect(() => {
        if (!assetId) {
            setCheckingCache(false);
            return;
        }
        if (isOffline) {
            loadFromCache();
        } else {
            setCachedHierarchy(null);
            if (cachedGlbUrl) {
                URL.revokeObjectURL(cachedGlbUrl);
                setCachedGlbUrl(null);
            }
            setNeedsInitialConnection(false);
            setCheckingCache(false);
        }
    }, [isOffline, assetId]);

    const loadFromCache = async () => {
        setCheckingCache(true);
        setNeedsInitialConnection(false);
        try {
            const cached = await offlineCache.isFullyCached(assetId!);
            if (cached) {
                const [hierarchy, glbData] = await Promise.all([
                    offlineCache.getHierarchy(assetId!),
                    offlineCache.getGlb(assetId!),
                ]);
                if (hierarchy && glbData) {
                    const blob = new Blob([glbData], { type: 'model/gltf-binary' });
                    const blobUrl = URL.createObjectURL(blob);
                    setCachedHierarchy(hierarchy as AnatomyItem[]);
                    setCachedGlbUrl(blobUrl);
                } else {
                    setNeedsInitialConnection(true);
                }
            } else {
                setNeedsInitialConnection(true);
            }
        } catch (e) {
            console.error('Erreur chargement cache:', e);
            setNeedsInitialConnection(true);
        } finally {
            setCheckingCache(false);
        }
    };

    useEffect(() => {
        return () => {
            if (cachedGlbUrl) URL.revokeObjectURL(cachedGlbUrl);
        };
    }, [cachedGlbUrl]);

    const breadcrumb = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to="/atlas" style={{ color: 'var(--dash-text-muted)', textDecoration: 'none' }}>{t('Atlas 3D', '3D Atlas')}</Link>
            <span style={{ color: 'var(--dash-text-muted)' }}>/</span>
            <span style={{ color: 'var(--dash-text-main)', fontWeight: 600 }}>{assetName}</span>
        </div>
    );

    const showOfflineBanner = isOffline && !checkingCache && !needsInitialConnection && cachedHierarchy;
    const showNoCacheScreen = isOffline && !checkingCache && needsInitialConnection;
    const showLoading = checkingCache;

    return (
        <App title={assetName} breadcrumb={breadcrumb}>
            {showOfflineBanner && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    marginBottom: '12px',
                    background: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: '12px',
                    color: '#eab308',
                    fontSize: '13px',
                    fontWeight: 600,
                }}>
                    <WifiOff size={16} />
                    {t('Mode hors-ligne — Données chargées depuis le cache.', 'Offline mode — Data loaded from cache.')}
                </div>
            )}

            {showLoading && (
                <div style={{
                    height: 'calc(100vh - 180px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '24px',
                    border: '1px solid var(--dash-border)',
                    background: 'var(--dash-bg)',
                }}>
                    <Loader2 className="spin" size={48} color="#0ea5e9" />
                </div>
            )}

            {showNoCacheScreen && (
                <div style={{
                    height: 'calc(100vh - 180px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    borderRadius: '24px',
                    border: '1px solid var(--dash-border)',
                    background: 'var(--dash-bg)',
                    color: 'var(--dash-text-muted)',
                }}>
                    <CloudOff size={64} style={{ opacity: 0.5 }} />
                    <h2 style={{ margin: 0, color: 'var(--dash-text-main)' }}>
                        {t('Aucune donnée en cache', 'No cached data')}
                    </h2>
                    <p style={{ textAlign: 'center', maxWidth: '400px', lineHeight: 1.6 }}>
                        {t(
                            'Vous êtes hors-ligne et ce modèle anatomique n\'a pas été téléchargé. Veuillez vous connecter à Internet, puis téléchargez-le depuis l\'atlas pour le rendre disponible hors-ligne.',
                            'You are offline and this anatomical model has not been downloaded. Please connect to the Internet, then download it from the atlas to make it available offline.'
                        )}
                    </p>
                    <Link
                        to="/atlas"
                        style={{
                            padding: '12px 24px',
                            background: '#0ea5e9',
                            color: 'white',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            fontWeight: 700,
                        }}
                    >
                        {t('Retour à l\'atlas', 'Back to atlas')}
                    </Link>
                </div>
            )}

            {!showLoading && !showNoCacheScreen && (
                <div style={{ 
                    height: 'calc(100vh - 180px)', 
                    position: 'relative', 
                    overflow: 'hidden', 
                    borderRadius: '24px', 
                    border: '1px solid var(--dash-border)',
                    background: 'var(--dash-bg)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ height: '100%' }}>
                        <AnatomyViewer 
                            key={isOffline ? 'offline' : 'online'}
                            assetId={assetId || undefined} 
                            modelPath={cachedGlbUrl || undefined}
                            initialAnatomicalData={cachedHierarchy || undefined}
                            isOffline={isOffline}
                        />
                    </div>
                </div>
            )}
        </App>
    );
};

export default AnatomyViewerPage;

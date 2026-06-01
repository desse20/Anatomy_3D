import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AnatomyViewer from '../components/AnatomyViewer';
import { apiCall } from '../services/api';
import { offlineCache } from '../services/offlineCache';
import { useLanguage } from '../contexts/LanguageContext';
import { Loader2 } from 'lucide-react';

interface AnatomyItem { id: number; name: string; three_js_name: string; parent_id?: number | null; type: string; description?: string; }

const AnatomyViewerPage: React.FC = () => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;
    const [searchParams] = useSearchParams();
    const assetParam = searchParams.get('asset');
    const viewId = searchParams.get('view');

    const [resolvedAssetId, setResolvedAssetId] = useState<string | null>(null);
    const [sharedViewData, setSharedViewData] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [cachedHierarchy, setCachedHierarchy] = useState<AnatomyItem[] | null>(null);
    const [cachedGlbUrl, setCachedGlbUrl] = useState<string | null>(null);
    const [needsInit, setNeedsInit] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [modelName, setModelName] = useState('');

    useEffect(() => {
        const on = () => setIsOffline(false);
        const off = () => setIsOffline(true);
        window.addEventListener('online', on); window.addEventListener('offline', off);
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }, []);

    // Phase 1 : résoudre l'assetId (via view partagée ou paramètre direct)
    useEffect(() => {
        if (viewId) {
            apiCall(`labs/shared-views/${viewId}`).then((d: any) => {
                if (d?.data) {
                    setResolvedAssetId(d.data.asset_3d_id);
                    setSharedViewData(d.data);
                }
            }).catch(() => {}).finally(() => setInitializing(false));
        } else {
            setResolvedAssetId(assetParam);
            setSharedViewData(null);
            setInitializing(false);
        }
    }, []);

    // Phase 2 : charger le nom du modèle
    useEffect(() => {
        if (resolvedAssetId) {
            apiCall(`models-manager/${resolvedAssetId}`).then((d: any) => { if (d?.name) setModelName(d.name); }).catch(() => {});
        }
    }, [resolvedAssetId]);

    // Phase 3 : vérifier le cache offline
    useEffect(() => {
        if (!resolvedAssetId || initializing) return;
        if (isOffline) { loadCache(); } else { setCachedHierarchy(null); if (cachedGlbUrl) { URL.revokeObjectURL(cachedGlbUrl); setCachedGlbUrl(null); } setNeedsInit(false); }
    }, [isOffline, resolvedAssetId, initializing]);

    async function loadCache() {
        setNeedsInit(false);
        try {
            const ok = await offlineCache.isFullyCached(resolvedAssetId!);
            if (ok) {
                const [h, g] = await Promise.all([offlineCache.getHierarchy(resolvedAssetId!), offlineCache.getGlb(resolvedAssetId!)]);
                if (h && g) {
                    const blob = new Blob([g], { type: 'model/gltf-binary' });
                    setCachedHierarchy(h as AnatomyItem[]); setCachedGlbUrl(URL.createObjectURL(blob));
                } else { setNeedsInit(true); }
            } else { setNeedsInit(true); }
        } catch { setNeedsInit(true); }
    }

    useEffect(() => () => { if (cachedGlbUrl) URL.revokeObjectURL(cachedGlbUrl); }, [cachedGlbUrl]);

    if (initializing) return <div className="viewer-fullscreen" style={{display:'flex',alignItems:'center',justifyContent:'center'}}><Loader2 className="spin" size={48} color="#0ea5e9" /></div>;
    if (needsInit) return (
        <div className="viewer-fullscreen" style={{display:'flex',alignItems:'center',justifyContent:'center',color:'var(--dash-text-muted)'}}>
            <div style={{textAlign:'center'}}><h2 style={{margin:'0 0 8px',color:'var(--dash-text-main)'}}>{t('Aucune donnée en cache','No cached data')}</h2>
            <p>{t('Connectez-vous à Internet pour télécharger le modèle.','Connect to the Internet to download the model.')}</p></div>
        </div>
    );

    return (
        <div className="viewer-fullscreen">
            <AnatomyViewer key={isOffline ? 'off' : 'on'} assetId={resolvedAssetId || undefined} modelPath={cachedGlbUrl || undefined}
                initialAnatomicalData={cachedHierarchy || undefined} isOffline={isOffline} modelName={modelName || undefined}
                viewId={viewId || undefined} sharedViewData={sharedViewData} readOnly={!!viewId} />
        </div>
    );
};

export default AnatomyViewerPage;

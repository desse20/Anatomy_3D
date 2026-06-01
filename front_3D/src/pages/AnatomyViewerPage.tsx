import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import AnatomyViewer from '../components/AnatomyViewer';
import App from '../components/layouts/App';
import { apiCall } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const AnatomyViewerPage: React.FC = () => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

    const [searchParams] = useSearchParams();
    const assetId = searchParams.get('asset');
    const [assetName, setAssetName] = useState<string>(t('Modèle 3D', '3D Model'));

    useEffect(() => {
        if (assetId) {
            apiCall(`models-manager/${assetId}`)
                .then(data => {
                    if (data && data.name) setAssetName(data.name);
                })
                .catch(err => console.error("Erreur chargement asset name:", err));
        }
    }, [assetId]);

    const breadcrumb = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to="/atlas" style={{ color: 'var(--dash-text-muted)', textDecoration: 'none' }}>{t('Atlas 3D', '3D Atlas')}</Link>
            <span style={{ color: 'var(--dash-text-muted)' }}>/</span>
            <span style={{ color: 'var(--dash-text-main)', fontWeight: 600 }}>{assetName}</span>
        </div>
    );

    return (
        <App title={assetName} breadcrumb={breadcrumb}>
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
                    <AnatomyViewer assetId={assetId || undefined} />
                </div>
            </div>
        </App>
    );
};

export default AnatomyViewerPage;

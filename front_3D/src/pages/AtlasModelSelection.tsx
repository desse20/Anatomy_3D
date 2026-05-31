import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import App from '../components/layouts/App';
import { apiCall } from '../services/api';
import { Box, Play, Info, Loader2 } from 'lucide-react';

const AtlasModelSelection: React.FC = () => {
    const navigate = useNavigate();
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            const res = await apiCall('models-manager');
            setAssets(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <App title="Chargement Atlas">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '40px', justifyContent: 'center' }}>
                    <Loader2 className="spin" size={48} color="#0ea5e9" />
                </div>
            </App>
        );
    }

    return (
        <App breadcrumb="Atlas / Sélection" title="Choisir un Modèle Anatomique">
            <div className="atlas-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px', padding: '20px 0' }}>
                {assets.map(asset => (
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
                        </div>
                        <div className="atlas-card-content" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h3 className="atlas-card-title" style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.name}</h3>
                            <p className="atlas-card-desc" style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--dash-text-muted)', flex: 1 }}>
                                {asset.objects || 0} objets anatomiques répertoriés.
                            </p>
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
                                <Play size={18} fill="currentColor" /> Explorer en 3D
                            </button>
                        </div>
                    </div>
                ))}

                {assets.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--dash-text-muted)' }}>
                        <Info size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p>Aucun modèle n'est disponible pour le moment.</p>
                    </div>
                )}
            </div>
            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
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

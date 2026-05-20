import React, { useState, useEffect } from 'react';
import { UploadCloud, Database, Cpu } from 'lucide-react';
import App from '../components/layouts/App';
import { useLanguage } from '../contexts/LanguageContext';
import { apiCall } from '../services/api';

const TechManagement: React.FC = () => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;
    const [dbSize, setDbSize] = useState<number | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await apiCall('/system/stats');
                setDbSize(data.database_size_mb || 0);
            } catch (err) {
                console.error("Failed to load db stats", err);
                setDbSize(0);
            }
        };
        fetchStats();
    }, []);

    return (
        <App breadcrumb={t("Gestion Technique", "Technical Management")} title={t("Console de Gestion Technique", "Technical Management Console")}>
            
            <div className="dash-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                
                {/* Section Upload GLB */}
                <div style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', background: 'rgba(14, 165, 233, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#0ea5e9' }}>
                        <UploadCloud size={32} />
                    </div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '20px' }}>{t("Mise à jour des Actifs 3D", "Update 3D Assets")}</h3>
                    <p style={{ color: 'var(--dash-text-muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                        {t("Importez des modèles GLB optimisés (Draco). Taille maximale autorisée : 5 Mo pour garantir la fluidité sur le réseau local.", 
                           "Upload optimized GLB models (Draco). Max size allowed: 5 MB to ensure smoothness on local network.")}
                    </p>
                    
                    <div style={{ padding: '24px', border: '2px dashed var(--dash-border)', borderRadius: '12px', background: 'rgba(0,0,0,0.02)', marginBottom: '24px' }}>
                        <input type="file" id="glb-upload" style={{ display: 'none' }} accept=".glb" />
                        <label htmlFor="glb-upload" style={{ cursor: 'pointer', color: '#0ea5e9', fontWeight: 700 }}>
                            {t("Cliquez pour sélectionner un fichier .glb", "Click to select a .glb file")}
                        </label>
                    </div>

                    <div style={{ fontSize: '12px', color: '#f87171', fontWeight: 600, background: 'rgba(248,113,113,0.1)', padding: '10px', borderRadius: '8px' }}>
                        {t("Règle Métier : Rejet automatique des fichiers volumineux (> 5Mo)", "Business Rule: Automatic rejection of large files (> 5MB)")}
                    </div>
                </div>

                {/* Section Performance & Cache */}
                <div style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '16px', padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <Cpu size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px' }}>{t("Optimisation Système", "System Optimization")}</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '10px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("Compression Draco", "Draco Compression")}</span>
                            <span style={{ fontSize: '12px', padding: '4px 10px', background: '#34d399', color: 'white', borderRadius: '100px', fontWeight: 700 }}>{t("ACTIF", "ACTIVE")}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '10px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("Mise en cache Redis", "Redis Caching")}</span>
                            <span style={{ fontSize: '12px', padding: '4px 10px', background: '#34d399', color: 'white', borderRadius: '100px', fontWeight: 700 }}>{t("ACTIF", "ACTIVE")}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '10px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("Pré-rendu des textures", "Texture Pre-rendering")}</span>
                            <span style={{ fontSize: '12px', padding: '4px 10px', background: '#94a3b8', color: 'white', borderRadius: '100px', fontWeight: 700 }}>{t("AUTO", "AUTO")}</span>
                        </div>
                    </div>
                </div>

                {/* Section Base de Données */}
                <div style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '16px', padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                            <Database size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px' }}>{t("Base de Données", "Database Status")}</h3>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                            <span style={{ color: 'var(--dash-text-muted)' }}>{t("Espace utilisé", "Space Used")}</span>
                            <span style={{ fontWeight: 700 }}>
                                {dbSize === null ? (
                                    <div className="skeleton-line" style={{ width: '80px', height: '14px' }}></div>
                                ) : (
                                    `${dbSize} MB / 100 MB`
                                )}
                            </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--dash-border)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${dbSize === null ? 0 : Math.min((dbSize / 100) * 100, 100)}%`, height: '100%', background: '#6366f1', transition: 'width 1s ease-in-out' }}></div>
                        </div>
                    </div>

                    <button style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid var(--dash-border)', borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', cursor: 'pointer' }}>
                        {t("Nettoyer les logs temporaires", "Clear Temporary Logs")}
                    </button>
                </div>
            </div>

            <style>{`
                .skeleton-line {
                    background: var(--dash-border);
                    height: 12px;
                    border-radius: 6px;
                    position: relative;
                    overflow: hidden;
                    opacity: 0.6;
                }
            `}</style>
        </App>
    );
};

export default TechManagement;

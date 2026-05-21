import React, { useState, useEffect } from 'react';
import { UploadCloud, Database, Cpu, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import App from '../components/layouts/App';
import { useLanguage } from '../contexts/LanguageContext';
import { apiCall } from '../services/api';

interface DbTable {
    name: string;
    rows_count: number;
    size_mb: number;
}

const TechManagement: React.FC = () => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;
    const [dbSize, setDbSize] = useState<number | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await apiCall('/system/stats');
                setDbSize(data.total_size_mb || 0);
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
            </div>

            {/* Info de Base de Données Hors Cadre en bas */}
            <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--dash-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '48px', height: '48px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                            <Database size={24} />
                        </div>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600 }}>{t("Stockage Base de Données", "Database Storage")}</h3>
                            <div style={{ color: 'var(--dash-text-muted)', fontSize: '14px' }}>
                                {t("Espace utilisé :", "Space used :")} <strong style={{ color: 'var(--dash-text)', fontSize: '16px' }}>{dbSize === null ? '...' : dbSize} MB</strong> / 500 MB
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--dash-border)', borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', cursor: 'pointer', transition: 'background 0.2s' }}>
                            {t("Nettoyer les logs", "Clear Logs")}
                        </button>
                        <button 
                            onClick={() => navigate('/database')}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#6366f1', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: 'white', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)' }}>
                            {t("Gérer les tables", "Manage Tables")} <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

                <div style={{ width: '100%', height: '6px', background: 'var(--dash-border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${dbSize === null ? 0 : Math.min((dbSize / 500) * 100, 100)}%`, height: '100%', background: '#6366f1', transition: 'width 1s ease-in-out' }}></div>
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

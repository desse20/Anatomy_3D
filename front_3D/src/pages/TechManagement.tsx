import React, { useState, useEffect } from 'react';
import { Database } from 'lucide-react';
import App from '../components/layouts/App';
import { useLanguage } from '../contexts/LanguageContext';
import { apiCall } from '../services/api';


const TechManagement: React.FC = () => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;
    const [dbSize, setDbSize] = useState<number | null>(null);
    const [counts, setCounts] = useState<any>(null);
    const [tables, setTables] = useState<any[]>([]);


    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await apiCall('/system/stats');
                setDbSize(data.total_size_mb || 0);
                setCounts(data.counts);
                setTables(data.tables || []);
            } catch (err) {
                console.error("Failed to load db stats", err);
                setDbSize(0);
            }
        };
        fetchStats();
    }, []);

    return (
        <App breadcrumb={t("Gestion Technique", "Technical Management")} title={t("Console de Gestion Technique", "Technical Management Console")}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                {/* Section Données & Statistiques */}
                <div style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '16px', padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                            <Database size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px' }}>{t("Vue d'ensemble des données", "Data Overview")}</h3>
                    </div>

                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                        {!counts ? (
                            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                                <div className="skeleton-line" style={{ width: '33%' }}></div>
                                <div className="skeleton-line" style={{ width: '33%' }}></div>
                                <div className="skeleton-line" style={{ width: '33%' }}></div>
                            </div>
                        ) : (
                            <>
                                <div style={{ flex: 1, minWidth: '150px', padding: '16px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--dash-text-muted)', marginBottom: '4px' }}>{t("Utilisateurs", "Users")}</div>
                                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#6366f1' }}>{counts.users}</div>
                                </div>
                                <div style={{ flex: 1, minWidth: '150px', padding: '16px', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.05)', border: '1px solid rgba(14, 165, 233, 0.1)' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--dash-text-muted)', marginBottom: '4px' }}>{t("Modèles 3D", "3D Models")}</div>
                                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#0ea5e9' }}>{counts.assets_3d}</div>
                                </div>
                                <div style={{ flex: 1, minWidth: '150px', padding: '16px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--dash-text-muted)', marginBottom: '4px' }}>{t("Objets Anatomiques", "Anatomical Objects")}</div>
                                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b' }}>{counts.anatomical_objects}</div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Liste des Tables détaillées */}
            <div style={{ marginTop: '48px', background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '20px', padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '44px', height: '44px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                            <Database size={22} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{t("Structure des Tables", "Table Structure")}</h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--dash-text-muted)' }}>{t("Détail de l'occupation disque par entité", "Detailed disk usage per entity")}</p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--dash-text)' }}>{dbSize === null ? '...' : dbSize} MB</div>
                        <div style={{ fontSize: '12px', color: 'var(--dash-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t("Espace Total Utilisé", "Total Space Used")}</div>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--dash-border)' }}>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t("Table", "Table")}</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t("Enregistrements", "Records")}</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>{t("Taille", "Size")}</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>{t("Utilisation", "Usage")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!tables.length ? (
                                <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--dash-text-muted)' }}>Chargement des données...</td></tr>
                            ) : (
                                tables.map((table, idx) => {
                                    const percentage = dbSize ? (table.size / dbSize) * 100 : 0;
                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--dash-border)', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '20px 16px' }}>
                                                <div style={{ fontWeight: 700, fontSize: '14px' }}>{table.label_fr || table.name}</div>
                                                <code style={{ background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: 'var(--dash-text-muted)' }}>{table.name}</code>
                                            </td>
                                            <td style={{ padding: '20px 16px', fontWeight: 600 }}>{table.rows.toLocaleString()}</td>
                                            <td style={{ padding: '20px 16px', textAlign: 'right', fontWeight: 700 }}>{table.size} MB</td>
                                            <td style={{ padding: '20px 16px', textAlign: 'right', width: '200px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ flex: 1, height: '6px', background: 'var(--dash-border)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${Math.max(percentage, 2)}%`, height: '100%', background: '#6366f1' }}></div>
                                                    </div>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-muted)', width: '35px' }}>{Math.round(percentage)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer simple */}
                <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: 'var(--dash-text-muted)' }}>
                        {t("Dernière mise à jour : il y a quelques secondes", "Last updated: few seconds ago")}
                    </div>
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

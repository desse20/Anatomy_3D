import React, { useState, useEffect } from 'react';
import App from '../components/layouts/App';
import { useLanguage } from '../contexts/LanguageContext';
import { apiCall } from '../services/api';
import { Database, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DbTable {
    name: string;
    rows_count: number;
    size_mb: number;
}

const DatabaseManagement: React.FC = () => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;
    const [dbSize, setDbSize] = useState<number | null>(null);
    const [dbTables, setDbTables] = useState<DbTable[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await apiCall('/system/stats');
                setDbSize(data.total_size_mb || 0);
                setDbTables(data.tables || []);
            } catch (err) {
                console.error("Failed to load db stats", err);
                setDbSize(0);
            }
        };
        fetchStats();
    }, []);

    return (
        <App breadcrumb={t("Base de Données", "Database Status")} title={t("Gestion de la Base de Données", "Database Management")}>
            
            <div style={{ paddingBottom: '20px' }}>
                <button 
                    onClick={() => navigate('/tech')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--dash-text-muted)', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
                >
                    <ArrowLeft size={16} /> {t("Retour à la console technique", "Back to technical console")}
                </button>
            </div>

            <div style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '16px', padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ width: '40px', height: '40px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                        <Database size={20} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>{t("État Global de la Base de Données", "Global Database Status")}</h3>
                </div>

                <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--dash-text-muted)' }}>{t("Espace total utilisé", "Total Space Used")}</span>
                        <span style={{ fontWeight: 700 }}>
                            {dbSize === null ? (
                                <div className="skeleton-line" style={{ width: '80px', height: '14px' }}></div>
                            ) : (
                                `${dbSize} MB`
                            )}
                        </span>
                    </div>
                    <div style={{ width: '100%', height: '12px', background: 'var(--dash-border)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${dbSize === null ? 0 : Math.min((dbSize / 500) * 100, 100)}%`, height: '100%', background: '#6366f1', transition: 'width 1s ease-in-out' }}></div>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--dash-text-muted)', marginTop: '8px', display: 'block' }}>{t("Basé sur un quota de 500 MB", "Based on 500 MB quota")}</span>
                </div>

                {dbTables.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '14px', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ color: 'var(--dash-text-muted)', borderBottom: '2px solid var(--dash-border)' }}>
                                    <th style={{ padding: '12px 0' }}>{t("Nom de la Table", "Table Name")}</th>
                                    <th style={{ padding: '12px 0', textAlign: 'right' }}>{t("Enregistrements", "Records (Rows)")}</th>
                                    <th style={{ padding: '12px 0', textAlign: 'right' }}>{t("Taille (MB)", "Size (MB)")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dbTables.map(table => (
                                    <tr key={table.name} style={{ borderBottom: '1px solid var(--dash-border)' }}>
                                        <td style={{ padding: '12px 0', fontWeight: 600 }}>{table.name}</td>
                                        <td style={{ padding: '12px 0', textAlign: 'right' }}>
                                            <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                                                {table.rows_count.toLocaleString()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 0', textAlign: 'right', color: 'var(--dash-text-muted)', fontWeight: 500 }}>{table.size_mb} MB</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style>{`
                .skeleton-line {
                    background: var(--dash-border);
                    height: 14px;
                    border-radius: 6px;
                    position: relative;
                    overflow: hidden;
                    opacity: 0.6;
                }
            `}</style>
        </App>
    );
};

export default DatabaseManagement;

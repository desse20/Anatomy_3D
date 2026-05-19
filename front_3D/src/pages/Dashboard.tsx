import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import App from '../components/layouts/App';
import { useLanguage } from '../contexts/LanguageContext';
import { apiCall } from '../services/api';
import '../styles/dashboard.css';

const ArrowLg = () => (
    <svg width="33" height="33" viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0.433594" y="0.171875" width="32" height="32" rx="16" fill="currentColor" opacity="0.18"/>
        <path d="M12.0226 19.5929C11.7492 19.8663 11.7492 20.3095 12.0226 20.5829C12.296 20.8562 12.7392 20.8562 13.0126 20.5829L12.0226 19.5929ZM21.05 12.2554C21.05 11.8688 20.7366 11.5554 20.35 11.5554L14.05 11.5554C13.6634 11.5554 13.35 11.8688 13.35 12.2554C13.35 12.642 13.6634 12.9554 14.05 12.9554L19.65 12.9554L19.65 18.5554C19.65 18.942 19.9634 19.2554 20.35 19.2554C20.7366 19.2554 21.05 18.942 21.05 18.5554L21.05 12.2554ZM13.0126 20.5829L20.845 12.7504L19.8551 11.7604L12.0226 19.5929L13.0126 20.5829Z" fill="currentColor"/>
    </svg>
);

const RadarChart: React.FC<{ data: { label: string, value: number, max: number }[] }> = ({ data }) => {
    // Pure SVG Radar Chart implementation
    const size = 300;
    const center = size / 2;
    const radius = size * 0.35;
    const angleStep = (Math.PI * 2) / Math.max(data.length, 3);
    
    // Draw concentric levels at 20%, 40%, 60%, 80%, 100%
    const levels = [0.2, 0.4, 0.6, 0.8, 1];
    
    return (
        <svg width="100%" height="320px" viewBox={`0 0 ${size} ${size}`}>
            {/* Background grid */}
            {levels.map(level => (
                <polygon
                    key={level}
                    points={data.map((_, i) => {
                        const x = center + radius * level * Math.cos(i * angleStep - Math.PI / 2);
                        const y = center + radius * level * Math.sin(i * angleStep - Math.PI / 2);
                        return `${x},${y}`;
                    }).join(' ')}
                    fill="none" stroke="var(--dash-border)" strokeWidth="1" strokeDasharray="3 3"
                    style={{ opacity: 0.5 }}
                />
            ))}
            
            {/* Axes */}
            {data.map((_, i) => {
                const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
                const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
                return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="var(--dash-border)" strokeWidth="1" />;
            })}
            
            {/* Data shape */}
            <motion.polygon
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                style={{ transformOrigin: "center" }}
                points={data.map((d, i) => {
                    const normalized = Math.max(d.value / d.max, 0.05); // Give a tiny baseline to always see shape
                    const x = center + radius * normalized * Math.cos(i * angleStep - Math.PI / 2);
                    const y = center + radius * normalized * Math.sin(i * angleStep - Math.PI / 2);
                    return `${x},${y}`;
                }).join(' ')}
                fill="rgba(14, 165, 233, 0.3)" stroke="#0ea5e9" strokeWidth="2"
            />
            
            {/* Data points and labels */}
            {data.map((d, i) => {
                const normalized = Math.max(d.value / d.max, 0.05);
                const px = center + radius * normalized * Math.cos(i * angleStep - Math.PI / 2);
                const py = center + radius * normalized * Math.sin(i * angleStep - Math.PI / 2);
                
                const lx = center + (radius + 25) * Math.cos(i * angleStep - Math.PI / 2);
                const ly = center + (radius + 20) * Math.sin(i * angleStep - Math.PI / 2);
                
                let textAnchor: "start" | "middle" | "end" = "middle";
                if (lx > center + 10) textAnchor = "start";
                else if (lx < center - 10) textAnchor = "end";
                
                return (
                    <g key={i}>
                        <circle cx={px} cy={py} r="4" fill="#34d399" />
                        <text x={lx} y={ly} textAnchor={textAnchor} fill="var(--dash-text-muted)" fontSize="10" dominantBaseline="middle">
                            {d.label.substring(0, 15)}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

// ... MiniCalendar inside Dashboard.tsx
const MiniCalendar = ({ language, upcomingCount }: { language: string, upcomingCount: number }) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // Calculate days in month and starting day offset
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDayIndex = new Date(year, month, 1).getDay() - 1; 
    if (firstDayIndex === -1) firstDayIndex = 6; // Start week on Monday
    
    const daysArray = [];
    for (let i = 0; i < firstDayIndex; i++) daysArray.push(null);
    for (let i = 1; i <= daysInMonth; i++) daysArray.push(i);
    
    const weekDaysFr = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const weekDaysEn = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const weekDays = language === 'fr' ? weekDaysFr : weekDaysEn;
    
    const monthNamesFr = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const monthNamesEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthName = language === 'fr' ? monthNamesFr[month] : monthNamesEn[month];
    
    return (
        <div className="mini-calendar">
            <div className="mc-header">
                <span className="mc-month">{monthName} {year}</span>
            </div>
            <div className="mc-grid">
                {weekDays.map((d, i) => <div key={i} className="mc-weekday">{d}</div>)}
                {daysArray.map((day, i) => {
                    if (!day) return <div key={i} className="mc-day empty" />;
                    const isToday = day === today.getDate();
                    // Just pseudo-randomly highlight upcoming days if we have weak notions to review
                    const hasReview = upcomingCount > 0 && (day === today.getDate() + 1 || day === today.getDate() + 3);
                    return (
                        <div key={i} className={`mc-day ${isToday ? 'today' : ''} ${hasReview ? 'has-review' : ''}`}>
                            <span>{day}</span>
                            {hasReview && <div className="mc-dot" />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const Dashboard: React.FC = () => {
    const { language } = useLanguage();
    const [stats, setStats] = useState<any>(null);
    const [roots, setRoots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            apiCall('mastery/stats').catch(() => null),
            apiCall('anatomy/roots').catch(() => ({ roots: [] }))
        ])
        .then(([statsRes, rootsRes]) => {
            setStats(statsRes);
            setRoots(rootsRes?.roots || []);
        })
        .finally(() => setLoading(false));
    }, []);

    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

    const renderNotionsList = (list: any[], emptyMsg: string, isWeak: boolean) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '180px', paddingRight: '8px' }}>
            {list.length === 0 ? (
                <p style={{ color: 'var(--dash-text-muted)', fontSize: '14px', margin: 'auto', paddingTop: '40px' }}>{emptyMsg}</p>
            ) : (
                list.slice(0, 4).map((n, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--dash-bg)', borderRadius: '10px', border: '1px solid var(--dash-border)' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.name}</span>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '12px', fontWeight: 700 }}>
                            <span style={{ color: '#34d399' }}>✓ {n.success}</span>
                            {isWeak && <span style={{ color: '#f87171' }}>✗ {n.failure}</span>}
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    // Compute global mastery mapped onto actual anatomy roots
    const computeRadarData = () => {
        if (!roots.length || !stats) return [];
        
        const knownLevels: Record<string, number> = {};
        [...(stats.weak_notions || []), ...(stats.strong_notions || [])].forEach((n: any) => {
            knownLevels[n.name.toLowerCase()] = n.mastery_level || 0;
        });

        return roots.map(root => {
            const rName = root.name.toLowerCase();
            const level = knownLevels[rName] !== undefined ? knownLevels[rName] : 0;
            return {
                label: root.name,
                value: level,
                max: 5
            };
        });
    };

    const radarData = computeRadarData();
    const globalProgress = radarData.length > 0 
        ? Math.round((radarData.reduce((acc, curr) => acc + curr.value, 0) / (radarData.length * 5)) * 100) 
        : 0;

    return (
        <App breadcrumb={t('Tableau de bord', 'Dashboard')} title={t('Tableau de bord', 'Dashboard')}>
            <Link to="/" className="dash-home-link-hero" style={{ marginBottom: '30px' }}>
                <span className="home-link-text">{t("Retour au portail d'accueil", "Back to Home Portal")}</span>
                <ArrowLg />
            </Link>
            
            {loading ? (
                <div style={{ padding: '40px', color: 'var(--dash-text-muted)' }}>{t('Chargement des données biométriques...', 'Loading biometric data...')}</div>
            ) : (
                <>
                    {/* BARRE DE PROGRESSION COMPLÈTEMENT EN HAUT */}
                    <div className="dash-card" style={{ padding: '24px 30px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--dash-text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {t('Compétence globale en anatomie', 'Global Anatomy Competence')}
                            </span>
                            <span style={{ fontSize: '20px', fontWeight: 800, color: '#0ea5e9' }}>{globalProgress}%</span>
                        </div>
                        <div style={{ width: '100%', height: '12px', background: 'var(--dash-border)', borderRadius: '100px', overflow: 'hidden' }}>
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${globalProgress}%` }}
                                transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                                style={{ height: '100%', background: 'linear-gradient(90deg, #0ea5e9, #34d399)', borderRadius: '100px', boxShadow: '0 0 10px rgba(52, 211, 153, 0.4)' }}
                            />
                        </div>
                    </div>

                    <div className="dash-grid">
                        {/* Cadre 1 : Calendrier */}
                    <div className="dash-card custom-card">
                        <div className="card-header">
                            <span className="card-icon"><Calendar size={20} strokeWidth={2.5}/></span>
                            <h3>{t('Calendrier de révisions', 'Review Calendar')}</h3>
                        </div>
                        <div className="card-content">
                            <MiniCalendar language={language} upcomingCount={stats?.weak_notions?.length || 0} />
                            
                            {stats && stats.weak_notions.length > 0 && (
                                <Link to="/quiz" className="mini-btn mt-auto">{t('Lancer un Quiz', 'Start Quiz')} →</Link>
                            )}
                        </div>
                    </div>

                    {/* Cadre 2 : Non maîtrisées (À améliorer) */}
                    <div className="dash-card custom-card">
                        <div className="card-header">
                            <span className="card-icon" style={{ background: '#f8717120', color: '#f87171' }}>
                                <AlertTriangle size={20} strokeWidth={2.5}/>
                            </span>
                            <h3>{t('À améliorer', 'Needs Improvement')}</h3>
                        </div>
                        <div className="card-content">
                            {renderNotionsList(stats ? stats.weak_notions : [], t('Aucune lacune détectée.', 'No weak spots detected.'), true)}
                        </div>
                    </div>

                    {/* Cadre 3 : Maîtrisées */}
                    <div className="dash-card custom-card">
                        <div className="card-header">
                            <span className="card-icon" style={{ background: '#34d39920', color: '#34d399' }}>
                                <CheckCircle size={20} strokeWidth={2.5}/>
                            </span>
                            <h3>{t('Notions maîtrisées', 'Mastered Notions')}</h3>
                        </div>
                        <div className="card-content">
                            {renderNotionsList(stats ? stats.strong_notions : [], t('Acquérez de l\'expérience pour la voir ici.', 'Gain experience to see it here.'), false)}
                        </div>
                    </div>

                    {/* Cadre 4 : Courbe Radiale + Progression globale */}
                    <div className="dash-card full-width custom-card-bottom">
                        <div className="card-header" style={{ marginBottom: '16px' }}>
                            <span className="card-icon" style={{ background: '#0ea5e920', color: '#0ea5e9' }}>
                                <Activity size={22} strokeWidth={2.5}/>
                            </span>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px' }}>{t('Cartographie & Compétence Globale', 'Global Mastery & Mapping')}</h3>
                                <p style={{ fontSize: '13px', color: 'var(--dash-text-muted)', margin: '4px 0 0 0' }}>
                                    {t("Analyse de la complétion absolue sur l'ensemble de l'anatomie.", 'Absolute completion analysis across all anatomy.')}
                                </p>
                            </div>
                        </div>
                        
                        <div className="radar-layout">
                            <div className="radar-gfx">
                                {radarData.length > 0 ? (
                                    <RadarChart data={radarData} />
                                ) : (
                                    <p className="empty-text" style={{ textAlign: 'center', margin: '40px 0' }}>{t('Impossible de charger la cartographie.', 'Failed to load mapping.')}</p>
                                )}
                            </div>
                            
                            <div className="radar-metrics">
                                <div className="radar-stat-box accent">
                                    <span className="rm-val">{globalProgress}%</span>
                                    <span className="rm-label">{t('Complétion', 'Completion')}</span>
                                </div>
                                <div className="radar-stat-box">
                                    <span className="rm-val">{roots.length}</span>
                                    <span className="rm-label">{t('Systèmes du corps', 'Body Systems')}</span>
                                </div>
                                <div className="radar-stat-box">
                                    <span className="rm-val">{stats ? stats.total_attempts : 0}</span>
                                    <span className="rm-label">{t('Examens tentés', 'Attempted Exams')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        )}

            <style>{`
                .custom-card {
                    display: flex; flex-direction: column; gap: 16px;
                    padding: 24px; min-height: 280px;
                }
                .custom-card-bottom {
                    padding: 30px;
                }
                .card-header {
                    display: flex; align-items: center; gap: 14px;
                }
                .card-header h3 {
                    margin: 0; font-size: 15px; font-weight: 700; color: var(--dash-text);
                    text-transform: uppercase; letter-spacing: 0.5px;
                }
                .card-icon {
                    width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
                    background: var(--dash-bg); color: var(--dash-text);
                    border-radius: 12px; border: 1px solid var(--dash-border);
                }
                .card-content {
                    flex: 1; display: flex; flex-direction: column;
                }
                .empty-text {
                    color: var(--dash-text-muted); font-size: 14px; margin: auto;
                }
                
                /* Mini Calendar */
                .mini-calendar {
                    background: var(--dash-bg); border-radius: 10px;
                    border: 1px solid var(--dash-border); padding: 12px;
                    font-family: inherit;
                }
                .mc-header {
                    text-align: center; font-weight: 700; font-size: 13px;
                    margin-bottom: 8px; color: var(--dash-text);
                }
                .mc-grid {
                    display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
                    text-align: center; font-size: 11px;
                }
                .mc-weekday {
                    font-weight: 700; color: var(--dash-text-muted); margin-bottom: 2px;
                }
                .mc-day {
                    position: relative;
                    height: 22px; display: flex; align-items: center; justify-content: center;
                    border-radius: 4px; font-weight: 600; color: var(--dash-text);
                }
                .mc-day.today {
                    background: #0ea5e9; color: white;
                }
                .mc-dot {
                    position: absolute; bottom: 1px; width: 3px; height: 3px;
                    border-radius: 50%; background: #fb923c;
                }
                
                .mini-btn {
                    display: inline-block; text-align: center; margin-top: 16px;
                    padding: 10px; background: color-mix(in srgb, #0ea5e9 12%, transparent);
                    color: #0ea5e9; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 700;
                    transition: 0.2s;
                }
                .mini-btn:hover { background: color-mix(in srgb, #0ea5e9 20%, transparent); }                /* Radar Layout */
                .radar-layout {
                    display: flex; gap: 40px; align-items: center; justify-content: center;
                }
                .radar-gfx { flex: 1; max-width: 500px; }
                
                .radar-metrics {
                    display: flex; flex-direction: column; gap: 16px; width: 220px;
                }
                .radar-stat-box {
                    background: var(--dash-bg);
                    border: 1px solid var(--dash-border);
                    border-radius: 12px; padding: 20px;
                    display: flex; flex-direction: column; gap: 4px;
                    text-align: center;
                }
                .radar-stat-box.accent {
                    border-color: rgba(14, 165, 233, 0.4);
                    background: color-mix(in srgb, #0ea5e9 5%, var(--dash-bg));
                }
                .rm-val { font-size: 32px; font-weight: 800; color: var(--dash-text); line-height: 1; }
                .radar-stat-box.accent .rm-val { color: #0ea5e9; }
                .rm-label { font-size: 12px; color: var(--dash-text-muted); font-weight: 600; text-transform: uppercase; }
                
                @media (max-width: 800px) {
                    .radar-layout { flex-direction: column; }
                    .radar-metrics { width: 100%; flex-direction: row; flex-wrap: wrap; }
                    .radar-stat-box { flex: 1; min-width: 120px; }
                }
            `}</style>
        </App>
    );
};

export default Dashboard;

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { motion } from 'framer-motion';
import { Calendar, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import App from '../components/layouts/App';
import { useLanguage } from '../contexts/LanguageContext';
import { apiCall, analyticsService } from '../services/api';
import '../styles/dashboard.css';
import { 
    ArrowUpRight, 
    ArrowDownRight, 
    Box,
    MessageSquare,
    Cpu,
    Trash2,
    Edit3,
    TrendingUp,
    Users,
    User
} from 'lucide-react';
import { reviewService, aiCacheService } from '../services/api';

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




type EvolutionPoint = { date: string; role: string; count: number };

const normalizeEvolution = (raw: unknown[]): EvolutionPoint[] =>
    (raw || []).map((row: any) => ({
        date: String(row.date ?? '').slice(0, 10),
        role: String(row.role ?? ''),
        count: Number(row.count) || 0,
    })).filter(p => p.date);

const toDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const buildDateAxis = (rangeDays: number): string[] => {
    const days = Math.max(1, rangeDays);
    const out: string[] = [];
    const end = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(end);
        d.setDate(end.getDate() - i);
        out.push(toDateKey(d));
    }
    return out;
};

const countFor = (data: EvolutionPoint[], date: string, role: string) =>
    data.filter(d => d.date === date && d.role === role).reduce((s, d) => s + d.count, 0);

const CHART_LINES = [
    { key: 'total', color: '#e2e8f0', dash: undefined, strokeWidth: 3.5 },
    { key: 'student', color: '#34d399', dash: undefined, strokeWidth: 3 },
    { key: 'teacher', color: '#0ea5e9', dash: '10 5', strokeWidth: 3 },
    { key: 'admin', color: '#6366f1', dash: '4 4', strokeWidth: 3 },
    { key: 'connected', color: '#f59e0b', dash: '3 3', strokeWidth: 2.5 },
] as const;

/** Graduations Y entières uniques (évite 0, 1, 1, 2) */
const buildYAxis = (dataMax: number): { ticks: number[]; max: number } => {
    const max = Math.max(1, Math.ceil(dataMax));
    if (max <= 8) {
        return { ticks: Array.from({ length: max + 1 }, (_, i) => i), max };
    }
    const step = max <= 20 ? 5 : max <= 50 ? 10 : max <= 100 ? 20 : Math.ceil(max / 5);
    const ticks: number[] = [0];
    for (let v = step; v < max; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] !== max) ticks.push(max);
    return { ticks, max };
};

const PremiumCombinedChart: React.FC<{
    data: unknown[];
    range: string;
    labels: { total: string; student: string; teacher: string; admin: string; connected?: string };
    connectedData?: unknown[];
}> = ({ data, range, labels, connectedData }) => {
    const wrapRef = useRef<HTMLDivElement>(null);
    const [chartWidth, setChartWidth] = useState(960);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const update = () => setChartWidth(Math.max(400, el.clientWidth));
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const rangeDays = Math.max(1, parseInt(range, 10) || 30);
    const normalized = normalizeEvolution(data);
    const connectedNormalized = (connectedData || []).map((row: any) => ({
        date: String(row.date ?? '').slice(0, 10),
        role: 'connected',
        count: Number(row.count) || 0,
    })).filter(p => p.date);
    const allNormalized = [...normalized, ...connectedNormalized];
    const dates = buildDateAxis(rangeDays);

    const totalSeries = dates.map(date =>
        allNormalized.filter(d => d.date === date && d.role !== 'connected').reduce((s, d) => s + d.count, 0)
    );
    const roleSeries = CHART_LINES.filter(l => l.key !== 'total').map(({ key }) =>
        dates.map(date => countFor(allNormalized, date, key))
    );
    const allValues = [...totalSeries, ...roleSeries.flat()];
    const dataMax = Math.max(0, ...allValues);
    const { ticks: yTicks, max: maxVal } = buildYAxis(dataMax);

    const seriesByKey: Record<string, number[]> = {
        total: totalSeries,
        student: dates.map(date => countFor(allNormalized, date, 'student')),
        teacher: dates.map(date => countFor(allNormalized, date, 'teacher')),
        admin: dates.map(date => countFor(allNormalized, date, 'admin')),
        connected: dates.map(date => countFor(allNormalized, date, 'connected')),
    };

    const height = 280;
    const padL = 52;
    const padR = 20;
    const legendH = 36;
    const padTop = legendH + 16;
    const padBottom = 44;
    const chartW = chartWidth - padL - padR;
    const chartH = height - padTop - padBottom;

    const xAt = (i: number) => {
        if (dates.length <= 1) return padL + chartW / 2;
        return padL + (i / (dates.length - 1)) * chartW;
    };
    const yAt = (v: number) => padTop + chartH - (v / maxVal) * chartH;

    const labelStep = rangeDays <= 7 ? 1 : rangeDays <= 90 ? Math.ceil(rangeDays / 6) : Math.ceil(rangeDays / 8);

    const getXLabel = (dateStr: string, index: number) => {
        if (index % labelStep !== 0 && index !== dates.length - 1) return '';
        const d = new Date(`${dateStr}T12:00:00`);
        if (rangeDays <= 7) return ['L', 'M', 'M', 'J', 'V', 'S', 'D'][(d.getDay() + 6) % 7];
        if (rangeDays <= 90) return String(d.getDate());
        return d.toLocaleDateString('fr', { month: 'short', day: 'numeric' });
    };

    const hasAnyData = allNormalized.some(d => d.count > 0);

    if (!hasAnyData) {
        return (
            <div ref={wrapRef} className="growth-chart-wrap" style={{ width: '100%', minHeight: 280 }}>
                <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.55)', fontSize: '14px', gap: '8px' }}>
                    <span>Aucune inscription sur cette période</span>
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>Les courbes apparaîtront dès que des comptes seront créés</span>
                </div>
            </div>
        );
    }

    const lineLabels: Record<string, string> = {
        total: labels.total,
        student: labels.student,
        teacher: labels.teacher,
        admin: labels.admin,
        connected: labels.connected || 'Connectés',
    };

    const legendGap = (chartWidth - padL - padR) / CHART_LINES.length;

    return (
        <div ref={wrapRef} className="growth-chart-wrap" style={{ width: '100%' }}>
            <svg
                width={chartWidth}
                height={height}
                viewBox={`0 0 ${chartWidth} ${height}`}
                role="img"
                aria-label="Graphique d'évolution des inscriptions"
                style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}
            >
                <g transform={`translate(${padL}, 8)`}>
                    {CHART_LINES.map(({ key, color, dash, strokeWidth }, i) => (
                        <g key={key} transform={`translate(${i * legendGap}, 0)`}>
                            <line x1="0" y1="14" x2="26" y2="14" stroke={color} strokeWidth={strokeWidth} strokeDasharray={dash} strokeLinecap="round" />
                            <text x="32" y="18" fill="#fff" fontSize="12" fontWeight="700">
                                {lineLabels[key]}
                            </text>
                        </g>
                    ))}
                </g>

                <rect x={padL} y={padTop} width={chartW} height={chartH} fill="rgba(255,255,255,0.04)" rx="8" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

                {yTicks.map(tick => (
                    <g key={tick}>
                        <line
                            x1={padL} y1={yAt(tick)} x2={padL + chartW} y2={yAt(tick)}
                            stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="5 5"
                        />
                        <text x={padL - 12} y={yAt(tick) + 5} textAnchor="end" fill="rgba(255,255,255,0.6)" fontSize="12" fontWeight="600">
                            {tick}
                        </text>
                    </g>
                ))}

                <line x1={padL} y1={padTop + chartH} x2={padL + chartW} y2={padTop + chartH} stroke="rgba(255,255,255,0.45)" strokeWidth="2" />

                {CHART_LINES.map(({ key, color, dash, strokeWidth }) => {
                    const values = seriesByKey[key];
                    const pts = values.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
                    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const showDots = key !== 'total';
                    return (
                        <g key={key}>
                            <path
                                d={linePath}
                                fill="none"
                                stroke={color}
                                strokeWidth={strokeWidth}
                                strokeDasharray={dash}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={key === 'total' ? 0.9 : 1}
                            />
                            {showDots && pts.map((p, i) => values[i] > 0 && (
                                <circle key={i} cx={p.x} cy={p.y} r="5" fill={color} stroke="#fff" strokeWidth="2" />
                            ))}
                        </g>
                    );
                })}

                {dates.map((date, i) => {
                    const label = getXLabel(date, i);
                    if (!label) return null;
                    return (
                        <text key={date} x={xAt(i)} y={height - 14} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="12" fontWeight="600">
                            {label}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
};



const MiniCalendar = ({ language, dueDays }: { language: string, dueDays: number[] }) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDayIndex = new Date(year, month, 1).getDay() - 1; 
    if (firstDayIndex === -1) firstDayIndex = 6;
    
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
                    const hasReview = dueDays.includes(day);
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

const readUserRole = (): string => {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}').role || 'student';
    } catch {
        return 'student';
    }
};

const SectionCollapseHeading: React.FC<{
    title: string;
    open: boolean;
    onToggle: () => void;
}> = ({ title, open, onToggle }) => (
    <div
        className={`full-width-heading collapsible ${open ? 'open' : ''}`}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
    >
        <span>{title}</span>
        <span className="heading-line" aria-hidden />
        <div className="collapse-arrow" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
            </svg>
        </div>
    </div>
);

const Dashboard: React.FC = () => {
    const { language, t } = useLanguage();
    const [stats, setStats] = useState<any>(null);
    const [roots, setRoots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adminStats, setAdminStats] = useState<any>(null);
    const [usageStats, setUsageStats] = useState<any>({ objects: null, models: null, summary: null });
    const [teacherStats, setTeacherStats] = useState<any>(null);
    const [statRange, setStatRange] = useState('30');
    const [showTeacherSection, setShowTeacherSection] = useState(() => readUserRole() === 'teacher');
    const [showStudentSection, setShowStudentSection] = useState(() => readUserRole() === 'student');

    // New states for feedback and cache management
    const [latestReviews, setLatestReviews] = useState<any[]>([]);
    const [latestCache, setLatestCache] = useState<any[]>([]);
    const [activeAiModels, setActiveAiModels] = useState<any[]>([]);
    const [activeView, setActiveView] = useState<'main' | 'reviews' | 'cache' | 'analytics_objects' | 'user_analytics' | 'user_detail'>('main');
    const [analyticsUsers, setAnalyticsUsers] = useState<any[]>([]);
    const [selectedUserStats, setSelectedUserStats] = useState<any>(null);
    const [viewFilter, setViewFilter] = useState('all');
    const [ratingFilter, setRatingFilter] = useState('all');
    const [cacheModelFilter, setCacheModelFilter] = useState('all');
    const [cacheSortFilter, setCacheSortFilter] = useState('latest');
    const [modalData, setModalData] = useState<any[]>([]);
    const [managementResponse, setManagementResponse] = useState<any>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [userSearchQuery, setUserSearchQuery] = useState('');

    const fetchLatestReviews = async () => {
        try {
            const res = await reviewService.list({ limit: 3 });
            setLatestReviews(res.data || []);
        } catch (err) { console.error("Latest reviews failed", err); }
    };

    const fetchLatestCache = async () => {
        try {
            const res = await aiCacheService.list({ limit: 3 });
            setLatestCache(res.data || []);
        } catch (err) { console.error("Latest cache failed", err); }
    };

    const [activeAiModelsResponse, setActiveAiModelsResponse] = useState<any>(null);

    const fetchActiveAiModels = async () => {
        try {
            const res = await aiCacheService.getActiveModels();
            setActiveAiModelsResponse(res);
            setActiveAiModels(res?.data || []);
        } catch (err) { console.error("Active AI models failed", err); }
    };

    const fetchManagementData = async (type: 'reviews' | 'cache', filter?: string, page: number = 1, rFilter?: string, cModel?: string, cSort?: string) => {
        setModalLoading(page === 1);
        const currentTypeFilter = filter || viewFilter;
        const currentRatingFilter = rFilter || ratingFilter;
        const currentCacheModel = cModel || cacheModelFilter;
        const currentCacheSort = cSort || cacheSortFilter;

        try {
            if (type === 'reviews') {
                const params: any = { limit: 50, page };
                if (currentTypeFilter !== 'all') params.type = currentTypeFilter;
                if (currentRatingFilter === 'positive') params.min_rating = 3;
                else if (currentRatingFilter === 'negative') params.max_rating = 3;
                
                const res = await reviewService.list(params);
                setManagementResponse(res);
                if (page === 1) setModalData(res.data || []);
                else setModalData(prev => [...prev, ...(res.data || [])]);
            } else {
                const params: any = { limit: 50, page };
                if (currentCacheModel !== 'all') params.ai_model = currentCacheModel;
                if (currentCacheSort === 'most_used') params.sort = 'most_used';
                
                const res = await aiCacheService.list(params);
                setManagementResponse(res);
                if (page === 1) setModalData(res.data || []);
                else setModalData(prev => [...prev, ...(res.data || [])]);
            }
        } catch (err) { console.error("Fetch management data failed", err); }
        setModalLoading(false);
    };

    const fetchAdminUsageAnalytics = async (range: string) => {
        try {
            const r = parseInt(range, 10);
            const [s, o, m] = await Promise.all([
                analyticsService.getSummary(r),
                analyticsService.getObjects(r),
                analyticsService.getModels(r)
            ]);
            setUsageStats({ summary: s, objects: o, models: m });
        } catch (err) {
            console.error("Analytics fetch failed", err);
        }
    };

    const fetchAnalyticsUsers = async () => {
        try {
            const res = await analyticsService.getUsers();
            setAnalyticsUsers(res);
        } catch (err) { console.error("Fetch analytics users failed", err); }
    };

    const fetchUserStatsDetail = async (userId: string) => {
        setModalLoading(true);
        try {
            const res = await analyticsService.getUserDetails(userId);
            setSelectedUserStats(res);
            setActiveView('user_detail');
        } catch (err) { console.error("Fetch user details failed", err); }
        setModalLoading(false);
    };

    const fetchAdminStats = async (range: string) => {
        try {
            const data = await apiCall(`/system/stats?range=${range}`);
            setAdminStats(data);
        } catch (err) {
            console.error("Admin stats failed", err);
        }
    };

    const handleDeleteReview = async (id: string) => {
        const result = await Swal.fire({
            title: t('Supprimer ?', 'Delete?'),
            text: t('Voulez-vous vraiment supprimer cet avis ?', 'Are you sure you want to delete this review?'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: t('Supprimer', 'Delete'),
            cancelButtonText: t('Annuler', 'Cancel'),
            background: 'var(--dash-bg)',
            color: 'var(--dash-text-main)'
        });

        if (!result.isConfirmed) return;

        try {
            await reviewService.delete(id);
            setModalData(prev => prev.filter(r => r.id !== id));
            fetchLatestReviews();
            Swal.fire({
                title: t('Supprimé', 'Deleted'),
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: 'var(--dash-bg)',
                color: 'var(--dash-text-main)'
            });
        } catch (err) { 
            Swal.fire({
                title: 'Error',
                text: t('Erreur lors de la suppression', 'Error during deletion'),
                icon: 'error',
                background: 'var(--dash-bg)',
                color: 'var(--dash-text-main)'
            });
        }
    };

    const handleDeleteCache = async (id: string) => {
        const result = await Swal.fire({
            title: t('Supprimer ?', 'Delete?'),
            text: t('Voulez-vous vraiment supprimer cette entrée ?', 'Are you sure you want to delete this entry?'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: t('Supprimer', 'Delete'),
            cancelButtonText: t('Annuler', 'Cancel'),
            background: 'var(--dash-bg)',
            color: 'var(--dash-text-main)'
        });

        if (!result.isConfirmed) return;

        try {
            await aiCacheService.delete(id);
            setModalData(prev => prev.filter(c => c.id !== id));
            fetchLatestCache();
            Swal.fire({
                title: t('Supprimé', 'Deleted'),
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: 'var(--dash-bg)',
                color: 'var(--dash-text-main)'
            });
        } catch (err) { 
            Swal.fire({
                title: 'Error',
                text: t('Erreur lors de la suppression', 'Error during deletion'),
                icon: 'error',
                background: 'var(--dash-bg)',
                color: 'var(--dash-text-main)'
            });
        }
    };

    const handleUpdateCache = async (id: string, data: any) => {
        try {
            await aiCacheService.update(id, data);
            setEditingItem(null);
            fetchManagementData('cache');
            fetchLatestCache();
            Swal.fire({
                title: t('Mis à jour', 'Updated'),
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: 'var(--dash-bg)',
                color: 'var(--dash-text-main)'
            });
        } catch (err) { 
            Swal.fire({
                title: 'Error',
                text: t('Erreur lors de la mise à jour', 'Error during update'),
                icon: 'error',
                background: 'var(--dash-bg)',
                color: 'var(--dash-text-main)'
            });
        }
    };

    useEffect(() => {
        setLoading(true);
        const userJson = localStorage.getItem('user');
        const user = userJson ? JSON.parse(userJson) : null;
        const role = user?.role || 'student';

        const promises: Promise<any>[] = [
            apiCall('anatomy/roots').catch(() => ({ roots: [] }))
        ];

        if (role === 'admin') {
            promises.push(apiCall(`/system/stats?range=${statRange}`).catch(() => null));
            promises.push(apiCall('labs').catch(() => ({ data: [] })));
            promises.push(apiCall('mastery/stats').catch(() => null));
            fetchAdminUsageAnalytics(statRange);
            fetchLatestReviews();
            fetchLatestCache();
            fetchActiveAiModels();
            if (activeView !== 'main') {
                if (activeView === 'user_analytics') fetchAnalyticsUsers();
                else fetchManagementData(activeView === 'reviews' ? 'reviews' : 'cache', viewFilter);
            }
        } else if (role === 'teacher') {
            promises.push(apiCall('labs').catch(() => ({ data: [] })));
            promises.push(apiCall('mastery/stats').catch(() => null));
        } else {
            promises.push(apiCall('mastery/stats').catch(() => null));
        }

        Promise.all(promises)
        .then((results) => {
            const rootsRes = results[0];
            setRoots(rootsRes?.roots || []);
            if (role === 'admin') {
                setAdminStats(results[1]);
                setTeacherStats(results[2]);
                setStats(results[3]);
            } else if (role === 'teacher') {
                setTeacherStats(results[1]);
                setStats(results[2]);
            } else {
                setStats(results[1]);
            }
        })
        .finally(() => setLoading(false));
    }, [language]);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role !== 'admin') return;
        
        // On ne recharge ici que si le loading initial est terminé
        if (!loading) {
            fetchAdminStats(statRange);
            fetchAdminUsageAnalytics(statRange);
        }
    }, [statRange, loading]);


    const navigate = useNavigate();

    const renderNotionsList = (list: any[], emptyMsg: string) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '260px', paddingRight: '8px' }}>
            {list.length === 0 ? (
                <p style={{ color: 'var(--dash-text-muted)', fontSize: '14px', margin: 'auto', paddingTop: '40px' }}>{emptyMsg}</p>
            ) : (
                list.slice(0, 8).map((n, i) => (
                    <div
                        key={i}
                        onClick={() => navigate('/quiz', { state: { system: n.name } })}
                        style={{ display: 'flex', flexDirection: 'column', padding: '10px 14px', background: 'var(--dash-bg)', borderRadius: '10px', border: '1px solid var(--dash-border)', gap: '4px', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'var(--dash-accent-hover)'}
                        onMouseOut={e => e.currentTarget.style.background = 'var(--dash-bg)'}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.name}</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: n.mastery_level >= 3 ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)', color: n.mastery_level >= 3 ? '#34d399' : '#f87171' }}>Lvl {n.mastery_level}/5</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '10px', fontSize: '12px', fontWeight: 700 }}>
                                <span style={{ color: '#34d399' }}>✓ {n.success}</span>
                                {(n.failure > 0) && <span style={{ color: '#f87171' }}>✗ {n.failure}</span>}
                                <span style={{ color: n.net_score >= 5 ? '#34d399' : '#94a3b8' }}>∑ {n.net_score ?? n.success - n.failure}</span>
                            </div>
                            {n.next_review && (
                                <span style={{ fontSize: '10px', color: 'var(--dash-text-muted)', fontStyle: 'italic' }}>{n.next_review}</span>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderNotionsListCultivees = (list: any[], emptyMsg: string) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '260px', paddingRight: '8px' }}>
            {list.length === 0 ? (
                <p style={{ color: 'var(--dash-text-muted)', fontSize: '14px', margin: 'auto', paddingTop: '40px' }}>{emptyMsg}</p>
            ) : (
                list.slice(0, 8).map((n, i) => (
                    <div
                        key={i}
                        onClick={() => navigate('/chat', { state: { system: n.name } })}
                        style={{ display: 'flex', flexDirection: 'column', padding: '10px 14px', background: 'var(--dash-bg)', borderRadius: '10px', border: '1px solid var(--dash-border)', gap: '4px', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'var(--dash-accent-hover)'}
                        onMouseOut={e => e.currentTarget.style.background = 'var(--dash-bg)'}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#a78bfa', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.name}</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>🤖 Chat</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '10px', fontSize: '12px', fontWeight: 700 }}>
                                <span style={{ color: '#34d399' }}>✓ {n.success}</span>
                                {(n.failure > 0) && <span style={{ color: '#f87171' }}>✗ {n.failure}</span>}
                                <span style={{ color: '#34d399' }}>∑ {n.net_score}</span>
                            </div>
                            {n.next_review && (
                                <span style={{ fontSize: '10px', color: 'var(--dash-text-muted)', fontStyle: 'italic' }}>{n.next_review}</span>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    // Collect due review days from ALL items with next_review_ts
    const dueReviewDays: number[] = React.useMemo(() => {
        if (!stats) return [];
        const days = new Set<number>();
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        const allItems = [
            ...(stats.due_notions || []),
            ...(stats.en_cours || []),
            ...(stats.maitrisees || []),
            ...(stats.totalement_maitrisees || []),
            ...(stats.cultivees || []),
        ];
        allItems.forEach((n: any) => {
            if (n.next_review_ts) {
                const d = new Date(n.next_review_ts * 1000);
                // Only future dates (next review, not overdue)
                if (d > now && d.getMonth() === month && d.getFullYear() === year) {
                    days.add(d.getDate());
                }
            }
        });
        return Array.from(days);
    }, [stats]);

    // Compute global mastery mapped onto actual anatomy roots
    const computeRadarData = () => {
        if (!roots.length || !stats) return [];
        
        const knownLevels: Record<string, number> = {};
        [...(stats.learning_notions || []), ...(stats.mastered_notions || []), ...(stats.due_notions || []), ...(stats.not_started || [])].forEach((n: any) => {
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

    // User data
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : { role: 'student' };
    const userRole = user.role || 'student';
    const isStudent = userRole === 'student';
    const isAdmin = userRole === 'admin';
    const isTeacher = userRole === 'teacher';

    return (
        <App breadcrumb={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <span>{t('Tableau de bord', 'Dashboard')}</span>
                {!loading && (
                    <div className="competence-bar-container" style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '250px', marginLeft: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            <span>{t('Compétence globale', 'Global Competence')}</span>
                            <span style={{ color: '#0ea5e9', fontWeight: 800 }}>{globalProgress}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'var(--dash-border)', borderRadius: '100px', overflow: 'hidden' }}>
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${globalProgress}%` }}
                                transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                                style={{ height: '100%', background: 'linear-gradient(90deg, #0ea5e9, #34d399)', borderRadius: '100px' }}
                            />
                        </div>
                    </div>
                )}
            </div>
        }>
            {loading ? (
                <div style={{ padding: '40px', color: 'var(--dash-text-muted)' }}>{t('Chargement des données biométriques...', 'Loading biometric data...')}</div>
            ) : activeView !== 'main' ? (
                <div className="secondary-view">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%', marginBottom: '25px' }}>
                        <button className="back-btn-dash" onClick={() => {
                            if (activeView === 'user_detail') setActiveView('user_analytics');
                            else setActiveView('main');
                        }}>
                            ← {activeView === 'user_detail' ? t('Retour à la liste', 'Back to list') : t('Retour au Dashboard', 'Back to Dashboard')}
                        </button>
                        <h2 style={{ margin: 0 }}>
                            {activeView === 'reviews' ? t('Gestion des Avis', 'Reviews Management') : 
                             activeView === 'cache' ? t('Gestion du Cache IA', 'AI Cache Management') :
                             activeView === 'user_analytics' ? t('Utilisateurs & Analytics', 'Users & Analytics') :
                             activeView === 'user_detail' ? t('Détails Utilisateur', 'User Details') :
                             t('Statistiques d\'Utilisation', 'Usage Statistics')}
                        </h2>
                        {activeView === 'reviews' && (
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                                <select 
                                    value={viewFilter} 
                                    onChange={(e) => { setViewFilter(e.target.value); fetchManagementData('reviews', e.target.value, 1, ratingFilter); }}
                                        style={{ background: 'var(--dash-bg)', color: 'var(--dash-text-main)', border: '1px solid var(--dash-border)', borderRadius: '8px', padding: '5px 10px', fontSize: '11px' }}
                                    >
                                        <option value="all">{t('Toutes cibles', 'All targets')}</option>
                                        <option value="platform">{t('Plateforme', 'Platform')}</option>
                                        <option value="object">{t('Objets anatomiques', 'Anatomy objects')}</option>
                                    </select>
                                    <select 
                                        value={ratingFilter} 
                                        onChange={(e) => { setRatingFilter(e.target.value); fetchManagementData('reviews', viewFilter, 1, e.target.value); }}
                                        style={{ background: 'var(--dash-bg)', color: 'var(--dash-text-main)', border: '1px solid var(--dash-border)', borderRadius: '8px', padding: '5px 10px', fontSize: '11px' }}
                                >
                                    <option value="all">{t('Toutes les notes', 'All ratings')}</option>
                                    <option value="positive">{t('Positifs (≥ 3★)', 'Positive (≥ 3★)')}</option>
                                    <option value="negative">{t('Négatifs (< 3★)', 'Negative (< 3★)')}</option>
                                </select>
                            </div>
                        )}
                        {activeView === 'cache' && (
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                                <select 
                                    value={cacheModelFilter} 
                                    onChange={(e) => { setCacheModelFilter(e.target.value); fetchManagementData('cache', 'all', 1, 'all', cacheModelFilter, cacheSortFilter); }}
                                        style={{ background: 'var(--dash-bg)', color: 'var(--dash-text-main)', border: '1px solid var(--dash-border)', borderRadius: '8px', padding: '5px 10px', fontSize: '11px' }}
                                    >
                                        <option value="all">{t('Tous les modèles', 'All models')}</option>
                                        {activeAiModels.map(m => (
                                            <option key={m.ai_model} value={m.ai_model}>{m.ai_model}</option>
                                        ))}
                                    </select>
                                    <select 
                                        value={cacheSortFilter} 
                                        onChange={(e) => { setCacheSortFilter(e.target.value); fetchManagementData('cache', 'all', 1, 'all', cacheModelFilter, e.target.value); }}
                                        style={{ background: 'var(--dash-bg)', color: 'var(--dash-text-main)', border: '1px solid var(--dash-border)', borderRadius: '8px', padding: '5px 10px', fontSize: '11px' }}
                                >
                                    <option value="latest">{t('Plus récents', 'Latest')}</option>
                                    <option value="most_used">{t('Plus utilisés', 'Most used')}</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '0px' }}>
                        {modalLoading ? (
                            <div style={{ textAlign: 'center', padding: '100px', color: 'var(--dash-text-muted)' }}>{t('Chargement...', 'Loading...')}</div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
                                {modalData.map((item: any) => (
                                    <div key={item.id} className="secondary-item-card" style={{ padding: '24px', background: 'var(--dash-card-bg)', borderRadius: '20px', border: '1px solid var(--dash-border)', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                                        <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '8px' }}>
                                            {activeView === 'cache' && (
                                                <button onClick={() => setEditingItem(item)} className="action-icon-btn"><Edit3 size={16} /></button>
                                            )}
                                            <button onClick={() => activeView === 'reviews' ? handleDeleteReview(item.id) : handleDeleteCache(item.id)} className="action-icon-btn delete"><Trash2 size={16} /></button>
                                        </div>

                                        {activeView === 'reviews' ? (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                                        <User size={20} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 800, fontSize: '15px' }}>{item.user?.firstname} {item.user?.lastname}</div>
                                                        <div style={{ fontSize: '12px', color: '#f59e0b', letterSpacing: '1px' }}>{'★'.repeat(item.rating)}{'☆'.repeat(5-item.rating)}</div>
                                                    </div>
                                                </div>
                                                {item.comment ? (
                                                    <div style={{ fontSize: '15px', lineHeight: '1.6', color: 'var(--dash-text-main)', marginBottom: '16px', fontStyle: 'italic', opacity: 0.9 }}>"{item.comment}"</div>
                                                ) : (
                                                    <div style={{ fontSize: '13px', marginBottom: '16px', color: 'var(--dash-text-muted)', fontStyle: 'italic' }}>({t('Sans commentaire', 'No comment')})</div>
                                                )}
                                                <div style={{ padding: '12px', background: 'var(--dash-bg)', borderRadius: '12px', border: '1px solid var(--dash-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                                        <span style={{ color: 'var(--dash-text-muted)' }}>{t('Cible', 'Target')}</span>
                                                        <span style={{ fontWeight: 700 }}>{item.type === 'platform' ? 'Platform' : item.anatomical_object?.name}</span>
                                                    </div>
                                                    {item.anatomical_object?.asset3d && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                                            <span style={{ color: 'var(--dash-text-muted)' }}>{t('Modèle', 'Model')}</span>
                                                            <span style={{ fontWeight: 700 }}>{item.anatomical_object.asset3d.name}</span>
                                                        </div>
                                                    )}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderTop: '1px solid var(--dash-border)', paddingTop: '6px', marginTop: '4px' }}>
                                                        <span style={{ color: 'var(--dash-text-muted)' }}>{t('Soumis le', 'Submitted on')}</span>
                                                        <span>{new Date(item.created_at).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontWeight: 800, fontSize: '15px', color: '#a78bfa', marginBottom: '12px', paddingRight: '60px', lineHeight: 1.4 }}>{item.question}</div>
                                                <div style={{ fontSize: '13px', background: 'var(--dash-accent-hover)', padding: '15px', borderRadius: '12px', marginBottom: '15px', color: 'var(--dash-text-main)', border: '1px solid var(--dash-border)', opacity: 0.8 }}>{item.response}</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                    <div className="mini-stat-info">
                                                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--dash-text-muted)' }}>IA Model</div>
                                                        <div style={{ fontSize: '12px', fontWeight: 700 }}>{item.ai_model}</div>
                                                    </div>
                                                    <div className="mini-stat-info">
                                                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--dash-text-muted)' }}>{t('Utilisations', 'Uses')}</div>
                                                        <div style={{ fontSize: '12px', fontWeight: 700 }}>{item.use_count}</div>
                                                    </div>
                                                    <div className="mini-stat-info">
                                                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--dash-text-muted)' }}>{t('Langue', 'Lang')}</div>
                                                        <div style={{ fontSize: '12px', fontWeight: 700 }}>{item.language}</div>
                                                    </div>
                                                    <div className="mini-stat-info">
                                                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--dash-text-muted)' }}>{t('Date', 'Date')}</div>
                                                        <div style={{ fontSize: '11px' }}>{new Date(item.created_at).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {modalData.length === 0 && !['user_analytics', 'analytics_objects', 'user_detail'].includes(activeView) && (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', opacity: 0.5 }}>
                                        <Activity size={48} style={{ marginBottom: '15px', opacity: 0.2 }} />
                                        <div>{managementResponse?.empty_message || t('Aucune donnée trouvée', 'No data found')}</div>
                                    </div>
                                )}
                                {managementResponse?.current_page < managementResponse?.last_page && (
                                    <div style={{ gridColumn: '1 / -1', padding: '20px', display: 'flex', justifyContent: 'center' }}>
                                        <button 
                                            onClick={() => fetchManagementData(activeView as any, viewFilter, (managementResponse.current_page || 1) + 1, ratingFilter, cacheModelFilter, cacheSortFilter)}
                                            className="mini-btn"
                                            style={{ margin: 0, padding: '12px 30px', borderRadius: '15px' }}
                                        >
                                            {t('Charger plus...', 'Load more...')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeView === 'analytics_objects' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                <div className="table-card-dash top" style={{ height: 'auto' }}>
                                    <h3 style={{ fontSize: '20px', marginBottom: '24px' }}><ArrowUpRight color="#34d399" size={20} /> {t('Classement Complet - Plus consultés', 'Full Ranking - Most visited')}</h3>
                                    <div className="list-dash" style={{ gap: '15px' }}>
                                        {(usageStats.objects?.top || []).map((obj: any, i: number) => (
                                            <div key={obj.id} className="list-item-dash" style={{ padding: '15px' }}>
                                                <span className="rank-dash" style={{ fontSize: '18px' }}>#{i+1}</span>
                                                <div className="info-dash">
                                                    <span className="name-dash" style={{ fontSize: '16px' }}>{obj.name}</span>
                                                    <span className="sub-dash">{obj.model_name}</span>
                                                </div>
                                                <span className="val-dash" style={{ fontSize: '18px' }}>{obj.visit_count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="table-card-dash flop" style={{ height: 'auto' }}>
                                    <h3 style={{ fontSize: '20px', marginBottom: '24px' }}><ArrowDownRight color="#f87171" size={20} /> {t('Moins consultés', 'Least visited')}</h3>
                                    <div className="list-dash" style={{ gap: '15px' }}>
                                        {(usageStats.objects?.flop || []).map((obj: any) => (
                                            <div key={obj.id} className="list-item-dash" style={{ padding: '15px' }}>
                                                <div className="info-dash">
                                                    <span className="name-dash" style={{ fontSize: '16px' }}>{obj.name}</span>
                                                    <span className="sub-dash">{obj.model_name}</span>
                                                </div>
                                                <span className="val-dash" style={{ fontSize: '18px' }}>{obj.visit_count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeView === 'user_analytics' && (
                            <div className="table-card-dash" style={{ height: 'auto', padding: '0', overflow: 'hidden' }}>
                                <div style={{ padding: '24px', borderBottom: '1px solid var(--dash-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                    <h3 style={{ fontSize: '20px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Users color="#3b82f6" size={24} /> {t('Activité des Utilisateurs', 'User Activity')}
                                    </h3>
                                    <div style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
                                        <input 
                                            type="text" 
                                            placeholder={t('Rechercher un utilisateur...', 'Search a user...')}
                                            value={userSearchQuery}
                                            onChange={(e) => setUserSearchQuery(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 15px',
                                                borderRadius: '12px',
                                                background: 'var(--dash-bg)',
                                                border: '1px solid var(--dash-border)',
                                                color: 'var(--dash-text-main)',
                                                fontSize: '14px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                    <span style={{ fontSize: '13px', color: 'var(--dash-text-muted)', fontWeight: 600 }}>{analyticsUsers.length} {t('utilisateurs enregistrés', 'registered users')}</span>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--dash-border)' }}>
                                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t('Utilisateur', 'User')}</th>
                                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t('Email', 'Email')}</th>
                                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--dash-text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>{t('Visites', 'Visits')}</th>
                                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t('Dernier accès', 'Last access')}</th>
                                                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--dash-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>{t('Actions', 'Actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analyticsUsers.filter(u => {
                                                const q = userSearchQuery.toLowerCase();
                                                return (u.firstname || '').toLowerCase().includes(q) || 
                                                       (u.lastname || '').toLowerCase().includes(q) || 
                                                       (u.email || '').toLowerCase().includes(q);
                                            }).map((u) => (
                                                <tr key={u.id} style={{ borderBottom: '1px solid var(--dash-border)', transition: 'background 0.2s' }} className="table-row-hover">
                                                    <td style={{ padding: '16px 24px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <User size={18} />
                                                            </div>
                                                            <span style={{ fontWeight: 700, fontSize: '14px' }}>{u.firstname} {u.lastname}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--dash-text-muted)' }}>{u.email}</td>
                                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                        <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontWeight: 800, fontSize: '13px' }}>
                                                            {u.total_visits}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '16px 24px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{u.last_visit ? new Date(u.last_visit).toLocaleDateString() : t('Jamais', 'Never')}</span>
                                                            {u.last_visit && <span style={{ fontSize: '10px', color: 'var(--dash-text-muted)' }}>{new Date(u.last_visit).toLocaleTimeString()}</span>}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                        <button onClick={() => fetchUserStatsDetail(u.id)} className="mini-btn" style={{ padding: '6px 12px', fontSize: '11px' }}>
                                                            {t('Détails', 'Details')} →
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeView === 'user_detail' && selectedUserStats && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                <div className="user-profile-header" style={{ padding: '30px', background: 'var(--dash-bg)', borderRadius: '20px', border: '1px solid var(--dash-border)', display: 'flex', gap: '30px', alignItems: 'center' }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <User size={40} />
                                    </div>
                                    <div>
                                        <h1 style={{ margin: 0, fontSize: '28px' }}>{selectedUserStats.user.name}</h1>
                                        <div style={{ color: 'var(--dash-text-muted)', display: 'flex', gap: '15px', marginTop: '5px' }}>
                                            <span>{selectedUserStats.user.email}</span>
                                            <span>•</span>
                                            <span style={{ textTransform: 'uppercase', fontWeight: 700, color: '#3b82f6' }}>{selectedUserStats.user.role}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                    <div className="table-card-dash top" style={{ height: 'auto' }}>
                                        <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>
                                            <ArrowUpRight color="#34d399" size={20} /> {t('Ses Objets les plus visités', 'Most visited objects')}
                                        </h3>
                                        <div className="list-dash" style={{ gap: '15px' }}>
                                            {selectedUserStats.top.map((obj: any, i: number) => (
                                                <div key={obj.id} className="list-item-dash" style={{ padding: '15px' }}>
                                                    <span className="rank-dash" style={{ fontSize: '18px' }}>#{i+1}</span>
                                                    <div className="info-dash">
                                                        <span className="name-dash" style={{ fontSize: '16px' }}>{obj.name}</span>
                                                        <span className="sub-dash">{obj.model_name}</span>
                                                    </div>
                                                    <span className="val-dash" style={{ fontSize: '18px' }}>{obj.visit_count}</span>
                                                </div>
                                            ))}
                                            {selectedUserStats.top.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--dash-text-muted)', fontSize: '14px' }}>{t('aucun objet visité', 'no object visited')}</div>}
                                        </div>
                                    </div>
                                    <div className="table-card-dash flop" style={{ height: 'auto' }}>
                                        <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>
                                            <ArrowDownRight color="#f87171" size={20} /> {t('Ses Objets les moins visités', 'Least visited objects')}
                                        </h3>
                                        <div className="list-dash" style={{ gap: '15px' }}>
                                            {selectedUserStats.flop.map((obj: any) => (
                                                <div key={obj.id} className="list-item-dash" style={{ padding: '15px' }}>
                                                    <div className="info-dash">
                                                        <span className="name-dash" style={{ fontSize: '16px' }}>{obj.name}</span>
                                                        <span className="sub-dash">{obj.model_name}</span>
                                                    </div>
                                                    <span className="val-dash" style={{ fontSize: '18px' }}>{obj.visit_count}</span>
                                                </div>
                                            ))}
                                            {selectedUserStats.flop.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--dash-text-muted)', fontSize: '14px' }}>{t('aucun objet visité', 'no object visited')}</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="dash-grid">
                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
                        <h1 style={{ margin: 0 }}>{t('Tableau de bord', 'Dashboard')}</h1>
                        <Link to="/" className="dash-home-link-hero" style={{ margin: 0 }}>
                            <span className="home-link-text">{t("Retour au portail d'accueil", "Back to Home Portal")}</span>
                            <ArrowLg />
                        </Link>
                    </div>

                    {/* --- ADMIN VIEW (ALWAYS PRIMARY) --- */}
                    {isAdmin && (
                        <>
                            <div className="full-width-heading"><span>{t('Contrôle Administrateur', 'Administrator Control')}</span></div>

                            <div className="full-width-heading" style={{ marginTop: '0' }}>
                                <span>{t('Utilisation des Objets Anatomiques', 'Anatomical Objects Usage')}</span>
                            </div>

                            <div className="full-width" style={{ marginBottom: '30px' }}>
                                <div className="comparison-grid-dash">
                                    <div className="table-card-dash top">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                            <h3 style={{ margin: 0 }}><ArrowUpRight color="#34d399" size={16} /> {t('Plus consultés', 'Most visited')}</h3>
                                            {(usageStats.objects?.top?.length > 3) && (
                                                <button onClick={() => setActiveView('analytics_objects')} className="mini-btn-flat">{t('Voir tout', 'View all')}</button>
                                            )}
                                        </div>
                                        <div className="list-dash">
                                            {(usageStats.objects?.top || []).slice(0, 3).map((obj: any, i: number) => (
                                                <div key={obj.id} className="list-item-dash">
                                                    <span className="rank-dash">#{i+1}</span>
                                                    <div className="info-dash">
                                                        <span className="name-dash">{obj.name}</span>
                                                        <span className="sub-dash">{obj.model_name}</span>
                                                    </div>
                                                    <span className="val-dash">{obj.visit_count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="table-card-dash" style={{ height: '360px', overflow: 'hidden' }}>
                                        <div className="card-header" style={{ marginBottom: '10px', padding: 0 }}>
                                            <span className="card-icon" style={{ width: '28px', height: '28px' }}><TrendingUp size={16} color="#34d399"/></span>
                                            <h3 style={{ margin: 0, fontSize: '12px' }}>{t('Analyse de Croissance', 'Growth Analytics')}</h3>
                                            <div style={{ display: 'flex', gap: '3px', marginLeft: 'auto' }}>
                                                {[{v:'7', l:'7J'}, {v:'30', l:'1M'}, {v:'90', l:'3M'}, {v:'365', l:'1A'}, {v:'730', l:'2A'}].map(r => (
                                                    <button key={r.v} onClick={() => setStatRange(r.v)} style={{
                                                        padding: '2px 5px', fontSize: '9px', fontWeight: 800, border: '1px solid var(--dash-border)', borderRadius: '4px', cursor: 'pointer',
                                                        background: statRange === r.v ? 'var(--dash-primary)' : 'var(--dash-bg)',
                                                        color: statRange === r.v ? '#fff' : 'var(--dash-text-muted)',
                                                        transition: '0.2s'
                                                    }}>{r.l}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ height: '280px' }}>
                                            <PremiumCombinedChart
                                                data={adminStats?.user_evolution || []}
                                                connectedData={adminStats?.connected_evolution || []}
                                                range={statRange}
                                                labels={{
                                                    total: t('Total', 'Total'),
                                                    student: t('Utilisateur', 'User'),
                                                    teacher: t('Prof', 'Teacher'),
                                                    admin: t('Admin', 'Admin'),
                                                    connected: t('Connectés', 'Connected'),
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="full-width-heading" style={{ marginTop: '0' }}>
                                <span>{t('Statut & Santé du Système', 'System Status & Health')}</span>
                            </div>

                            <div className="dash-card custom-card">
                                <div className="card-header">
                                    <span className="card-icon"><Box size={16} color="#34d399"/></span>
                                    <h3>{usageStats.models?.title || t('Top Modèles 3D', 'Top 3D Models')}</h3>
                                </div>
                                <div className="card-content">
                                    {(usageStats.models?.models || []).slice(0, 5).map((m: any) => (
                                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid var(--dash-border)' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                                                <div style={{ height: '3px', background: 'var(--dash-border)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', background: '#0ea5e9', width: `${Math.min((m.visit_count / (usageStats.models?.total || 1)) * 100, 100)}%` }}></div>
                                                </div>
                                            </div>
                                            <span style={{ fontWeight: 800, color: '#0ea5e9', fontSize: '13px', flexShrink: 0 }}>{m.visit_count}</span>
                                        </div>
                                    ))}
                                    {(!usageStats.models?.models || usageStats.models.models.length === 0) && (
                                        <div style={{ textAlign: 'center', padding: '20px', opacity: 0.5, fontSize: '12px' }}>
                                            {usageStats.models?.empty_message || t('Aucun modèle 3D consulté', 'No 3D models visited')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="dash-card custom-card">
                                <div className="card-header">
                                    <span className="card-icon"><Activity size={20} color="#0ea5e9"/></span>
                                    <h3>{t('Utilisateurs & Assets', 'Users & Assets')}</h3>
                                </div>
                                <div className="card-content" style={{ gap: '12px', marginTop: '10px' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div style={{ textAlign: 'center', flex: 1, padding: '10px 0', background: 'var(--dash-accent-hover)', borderRadius: '12px', border: '1px solid var(--dash-border)' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 800 }}>{adminStats?.counts?.users || 0}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t('Membres', 'Members')}</div>
                                        </div>
                                        <div style={{ textAlign: 'center', flex: 1, padding: '10px 0', background: 'var(--dash-accent-hover)', borderRadius: '12px', border: '1px solid var(--dash-border)' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 800 }}>{adminStats?.counts?.assets_3d || 0}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t('Modèles', 'Models')}</div>
                                        </div>
                                        <div style={{ textAlign: 'center', flex: 1, padding: '10px 0', background: 'var(--dash-accent-hover)', borderRadius: '12px', border: '1px solid var(--dash-border)' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#34d399', lineHeight: 1 }}>{adminStats?.active_sessions || 0}</div>
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>{t('Sessions Actives', 'Active Sessions')}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                        <button onClick={() => { setActiveView('user_analytics'); fetchAnalyticsUsers(); }} className="mini-btn" style={{ flex: 1, margin: 0, border: 'none', cursor: 'pointer', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>{t('Analytics', 'Analytics')} →</button>
                                        <Link to="/utilisateurs" className="mini-btn" style={{ flex: 1, margin: 0, background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t('Gérer', 'Manage')} →</Link>
                                    </div>
                                </div>
                            </div>

                            <div className="dash-card custom-card">
                                <div className="card-header">
                                    <span className="card-icon"><Calendar size={20} color="#f59e0b"/></span>
                                    <h3>{t('Actions Rapides', 'Quick Actions')}</h3>
                                </div>
                                <div className="card-content" style={{ gap: '12px' }}>
                                    <Link to="/model" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '12px', background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-main)', transition: 'all 0.2s' }}>
                                        <span>{t('Importer un nouvel asset', 'Import new asset')}</span>
                                        <ArrowLg />
                                    </Link>
                                    <Link to="/utilisateurs" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '12px', background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-main)', transition: 'all 0.2s' }}>
                                        <span>{t('Gérer les utilisateurs', 'Manage users')}</span>
                                        <ArrowLg />
                                    </Link>
                                    <div onClick={() => { setActiveView('reviews'); setViewFilter('all'); fetchManagementData('reviews', 'all'); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '12px', background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-main)', transition: 'all 0.2s' }}>
                                        <span>{t('Gestion des avis', 'Manage reviews')}</span>
                                        <ArrowLg />
                                    </div>
                                    <div onClick={() => { setActiveView('cache'); fetchManagementData('cache'); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '12px', background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-main)', transition: 'all 0.2s' }}>
                                        <span>{t('Gestion du cache IA', 'Manage AI Cache')}</span>
                                        <ArrowLg />
                                    </div>
                                </div>
                            </div>


                            <div className="full-width-heading">
                                <span>{t('Performance des Modèles 3D & Avis', '3D Models Performance & Reviews')}</span>
                            </div>

                            <div className="dash-card custom-card">
                                <div className="card-header">
                                    <span className="card-icon"><MessageSquare size={20} color="#0ea5e9"/></span>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: 0 }}>{t('Derniers Avis', 'Latest Reviews')}</h3>
                                        <div style={{ fontSize: '11px', color: 'var(--dash-text-muted)' }}>{usageStats.summary?.labels?.rating || t('Note Moyenne', 'Avg Rating')}: <strong style={{ color: '#f59e0b' }}>{usageStats.summary?.avg_rating || 'N/A'}/5</strong></div>
                                    </div>
                                    <button onClick={() => { setActiveView('reviews'); setViewFilter('all'); fetchManagementData('reviews', 'all'); }} className="mini-btn">
                                        {t('Voir tout', 'View all')}
                                    </button>
                                </div>
                                <div className="card-content" style={{ gap: '10px', marginTop: '10px' }}>
                                    {latestReviews.length === 0 ? (
                                        <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>{t('Aucun avis', 'No reviews')}</div>
                                    ) : latestReviews.map((rev: any) => (
                                        <div key={rev.id} style={{ padding: '10px', background: 'var(--dash-bg)', borderRadius: '10px', border: '1px solid var(--dash-border)', fontSize: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 800 }}>{rev.user?.firstname} {rev.user?.lastname}</span>
                                                <span style={{ color: '#f59e0b', fontWeight: 900 }}>{rev.rating}/5</span>
                                            </div>
                                            <div style={{ color: rev.comment ? 'var(--dash-text-main)' : 'var(--dash-text-muted)', fontStyle: 'italic', marginBottom: '6px', fontSize: rev.comment ? '12px' : '11px' }}>
                                                {rev.comment ? `"${rev.comment}"` : `(${t('Sans commentaire', 'No comment')})`}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                                                <span style={{ color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>
                                                    {rev.type === 'platform' ? 'Platform' : (rev.anatomical_object?.name + ' (' + rev.anatomical_object?.asset3d?.name + ')')}
                                                </span>
                                                <span style={{ color: 'var(--dash-text-muted)' }}>{new Date(rev.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="dash-card custom-card">
                                <div className="card-header">
                                    <span className="card-icon"><Cpu size={20} color="#a78bfa"/></span>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: 0 }}>{t('Cache IA Récent', 'Recent AI Cache')}</h3>
                                        <div style={{ fontSize: '11px', color: 'var(--dash-text-muted)' }}><strong style={{ color: '#a78bfa' }}>{usageStats.summary?.ai_cached_responses || 0}</strong> {usageStats.summary?.labels?.cache || t('entrées actives', 'active entries')}</div>
                                    </div>
                                    <button onClick={() => { setActiveView('cache'); fetchManagementData('cache'); }} className="mini-btn">
                                        {t('Gérer', 'Manage')}
                                    </button>
                                </div>
                                <div className="card-content" style={{ gap: '10px', marginTop: '10px' }}>
                                    {latestCache.length === 0 ? (
                                        <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>{t('Cache vide', 'Empty cache')}</div>
                                    ) : latestCache.map((c: any) => (
                                        <div key={c.id} style={{ padding: '10px', background: 'rgba(167, 139, 250, 0.05)', borderRadius: '10px', border: '1px solid rgba(167, 139, 250, 0.1)', fontSize: '12px' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--dash-text-main)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                Q: {c.question}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--dash-text-muted)' }}>
                                                <span>Modèle: <strong>{c.ai_model || 'N/A'}</strong></span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Activity size={10} /> {c.use_count} uses</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>



                            <div className="dash-card custom-card">
                                <div className="card-header">
                                    <span className="card-icon"><TrendingUp size={16} color="#34d399"/></span>
                                    <h3>{t('Modèles IA actifs', 'Active AI Models')}</h3>
                                </div>
                                <div className="card-content">
                                    {activeAiModels.map((m: any) => (
                                        <div key={m.ai_model} style={{ padding: '8px 10px', background: 'var(--dash-bg)', borderRadius: '8px', border: '1px solid var(--dash-border)' }}>
                                            <div style={{ fontWeight: 800, fontSize: '12px', color: '#34d399', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.ai_model || 'Inconnu'}</div>
                                            <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                                                <span><strong>{m.cache_count}</strong> <span style={{ color: 'var(--dash-text-muted)' }}>Cache</span></span>
                                                <span><strong>{m.total_uses}</strong> <span style={{ color: 'var(--dash-text-muted)' }}>{t('Uses', 'Uses')}</span></span>
                                            </div>
                                        </div>
                                    ))}
                                    {activeAiModels.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '20px', opacity: 0.5, fontSize: '12px' }}>
                                            {activeAiModelsResponse?.empty_message || t('Aucun modèle IA utilisé', 'No AI models used yet')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Analytics Section — full width */}
                            {/* Removed Growth Analytics from here as it was moved up */}
                        </>
                    )}

                    {/* --- TEACHER VIEW (Teacher or Admin) --- */}
                    {(isTeacher || (isAdmin && teacherStats)) && (
                        <>
                            {isAdmin && (
                                <SectionCollapseHeading
                                    title={t('Espace Pédagogique (Hérité du Professeur)', 'Pedagogy Space (Inherited from Teacher)')}
                                    open={showTeacherSection}
                                    onToggle={() => setShowTeacherSection(v => !v)}
                                />
                            )}
                            {isTeacher && (
                                <div className="full-width-heading">
                                    <span>{t('Espace Pédagogique', 'Teaching Space')}</span>
                                </div>
                            )}

                            {(isTeacher || showTeacherSection) && (
                                <>
                                    <div className="dash-card custom-card">
                                        <div className="card-header">
                                            <span className="card-icon"><Calendar size={20} color="#0ea5e9"/></span>
                                            <h3>{t('Mes Salles de Cours', 'My Labs')}</h3>
                                        </div>
                                        <div className="card-content">
                                            <div style={{ fontSize: '32px', fontWeight: 800, margin: '10px 0' }}>{teacherStats?.data?.length || 0}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--dash-text-muted)' }}>{t('Salles virtuelles actives', 'Active virtual labs')}</div>
                                            <Link to="/labs" className="mini-btn mt-auto">{t('Gérer mes salles', 'Manage my labs')} →</Link>
                                        </div>
                                    </div>

                                    <div className="dash-card custom-card">
                                        <div className="card-header">
                                            <span className="card-icon"><Activity size={20} color="#34d399"/></span>
                                            <h3>{t('Vues Partagées', 'Shared Views')}</h3>
                                        </div>
                                        <div className="card-content">
                                            <div style={{ fontSize: '32px', fontWeight: 800, margin: '10px 0' }}>{teacherStats?.data?.reduce((acc: number, l: any) => acc + (l.shared_views?.length || 0), 0) || 0}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--dash-text-muted)' }}>{t('Points d\'intérêt partagés', 'Shared points of interest')}</div>
                                            <Link to="/my-views" className="mini-btn mt-auto" style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399' }}>{t('Catalogue de vues', 'Views Catalog')} →</Link>
                                        </div>
                                    </div>

                                    <div className="dash-card custom-card">
                                        <div className="card-header">
                                            <span className="card-icon"><CheckCircle size={20} color="#6366f1"/></span>
                                            <h3>{t('Participation', 'Engagement')}</h3>
                                        </div>
                                        <div className="card-content">
                                            <div style={{ fontSize: '32px', fontWeight: 800, margin: '10px 0' }}>{teacherStats?.data?.reduce((acc: number, l: any) => acc + (l.total_participants || 0), 0) || 0}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--dash-text-muted)' }}>{t('Étudiants ont rejoint vos salles', 'Students joined your labs')}</div>
                                            <p style={{ marginTop: 'auto', fontSize: '12px', fontStyle: 'italic', color: 'var(--dash-text-muted)' }}>{t('Les statistiques sont mises à jour en temps réel.', 'Stats are updated in real-time.')}</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                    
                    {/* --- STUDENT VIEW (Student, Teacher or Admin) --- */}
                    {(isStudent || isTeacher || (isAdmin && stats)) && (
                        <>
                            {(isTeacher || isAdmin) && (
                                <SectionCollapseHeading
                                    title={isAdmin
                                        ? t('Aperçu côté Étudiant (Autogéré)', 'Student Side Overview (Self-managed)')
                                        : t('Mon parcours d\'apprentissage', 'My Learning Journey')}
                                    open={showStudentSection}
                                    onToggle={() => setShowStudentSection(v => !v)}
                                />
                            )}

                            {(isStudent || showStudentSection) && (
                                <>
                                    <div className="student-overview-row">
                                        <div className="dash-card custom-card">
                                            <div className="card-header">
                                                <span className="card-icon"><Calendar size={20} strokeWidth={2.5}/></span>
                                                <h3>{t('Calendrier de révisions', 'Review Calendar')}</h3>
                                            </div>
                                            <div className="card-content">
                                                <MiniCalendar language={language} dueDays={dueReviewDays} />
                                                {stats && (stats.due_notions?.length > 0 || stats.en_cours?.length > 0) && (
                                                    <Link to="/quiz" className="mini-btn mt-auto">{t('Lancer un Quiz', 'Start Quiz')} →</Link>
                                                )}
                                            </div>
                                        </div>

                                        <div className="dash-card custom-card">
                                            <div className="card-header">
                                                <span className="card-icon" style={{ background: '#f8717120', color: '#f87171' }}>
                                                    <AlertTriangle size={20} strokeWidth={2.5}/>
                                                </span>
                                                <h3>{t('Prochaines révisions', 'Upcoming Reviews')}</h3>
                                            </div>
                                            <div className="card-content">
                                                {renderNotionsList(stats?.due_notions || [], t('Aucune révision due.', 'No reviews due.'))}
                                            </div>
                                        </div>

                                        <div className="dash-card custom-card">
                                            <div className="card-header">
                                                <span className="card-icon" style={{ background: '#f9731620', color: '#f97316' }}>
                                                    <Activity size={20} strokeWidth={2.5}/>
                                                </span>
                                                <h3>{t('En cours (∑ ≤ 0)', 'In Progress (∑ ≤ 0)')}</h3>
                                            </div>
                                            <div className="card-content">
                                                {renderNotionsList(stats?.en_cours || [], t('Commencez un quiz !', 'Start a quiz!'))}
                                            </div>
                                        </div>

                                        <div className="dash-card custom-card">
                                            <div className="card-header">
                                                <span className="card-icon" style={{ background: '#22d3ee20', color: '#22d3ee' }}>
                                                    <CheckCircle size={20} strokeWidth={2.5}/>
                                                </span>
                                                <h3>{t('Maîtrisées (∑ 1-4)', 'Mastered (∑ 1-4)')}</h3>
                                            </div>
                                            <div className="card-content">
                                                {renderNotionsList(stats?.maitrisees || [], t('Encore aucune.', 'None yet.'))}
                                            </div>
                                        </div>

                                        <div className="dash-card custom-card">
                                            <div className="card-header">
                                                <span className="card-icon" style={{ background: '#34d39920', color: '#34d399' }}>
                                                    <CheckCircle size={20} strokeWidth={2.5}/>
                                                </span>
                                                <h3>{t('Total. maîtrisées (∑ ≥ 5)', 'Totally Mastered (∑ ≥ 5)')}</h3>
                                            </div>
                                            <div className="card-content">
                                                {renderNotionsList(stats?.totalement_maitrisees || [], t('Encore aucun score ≥ 5.', 'No score ≥ 5 yet.'))}
                                            </div>
                                        </div>

                                        <div className="dash-card custom-card">
                                            <div className="card-header">
                                                <span className="card-icon" style={{ background: '#a78bfa20', color: '#a78bfa' }}>
                                                    <Activity size={20} strokeWidth={2.5}/>
                                                </span>
                                                <h3>{t('Cultivées (∑ ≥ 5, peu d\'échecs)', 'Cultivated (∑ ≥ 5, few fails)')}</h3>
                                            </div>
                                            <div className="card-content">
                                                {renderNotionsListCultivees(stats?.cultivees || [], t('Atteignez ∑ ≥ 5 avec ≤ 2 échecs.', 'Reach ∑ ≥ 5 with ≤ 2 failures.'))}
                                            </div>
                                        </div>
                                    </div>

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
                                </>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* AI Cache Edit Modal */}
            {editingItem && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--dash-bg)', padding: '24px', borderRadius: '24px', width: '100%', maxWidth: '500px', border: '1px solid var(--dash-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>{t('Modifier Cache IA', 'Edit AI Cache')}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px', color: 'var(--dash-text-muted)' }}>Question</label>
                                <textarea 
                                    defaultValue={editingItem.question}
                                    style={{ width: '100%', background: 'var(--dash-accent-hover)', color: 'var(--dash-text-main)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '12px', minHeight: '80px', fontSize: '13px' }}
                                    onChange={(e: any) => editingItem._newTitle = e.target.value}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px', color: 'var(--dash-text-muted)' }}>Réponse</label>
                                <textarea 
                                    defaultValue={editingItem.response}
                                    style={{ width: '100%', background: 'var(--dash-accent-hover)', color: 'var(--dash-text-main)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '12px', minHeight: '120px', fontSize: '13px' }}
                                    onChange={(e: any) => editingItem._newResponse = e.target.value}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                <button onClick={() => setEditingItem(null)} className="mini-btn" style={{ margin: 0, background: 'transparent', color: 'var(--dash-text-muted)' }}>{t('Annuler', 'Cancel')}</button>
                                <button 
                                    onClick={() => handleUpdateCache(editingItem.id, { question: editingItem._newTitle || editingItem.question, response: editingItem._newResponse || editingItem.response })} 
                                    className="mini-btn" 
                                    style={{ margin: 0, background: 'linear-gradient(135deg, #6366f1, #a78bfa)', color: '#fff', border: 'none' }}
                                >
                                    {t('Enregistrer', 'Save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `

                .custom-card {
                    display: flex; flex-direction: column; gap: 12px;
                    padding: 15px !important; height: 260px; overflow: hidden;
                }
                .custom-card-bottom {
                    padding: 20px !important;
                }
                .card-header {
                    display: flex; align-items: center; gap: 10px; margin-bottom: 5px;
                }
                .card-header h3 {
                    margin: 0; font-size: 13px; font-weight: 700; color: var(--dash-text);
                    text-transform: uppercase; letter-spacing: 0.5px;
                }
                .card-icon {
                    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
                    background: var(--dash-bg); color: var(--dash-text);
                    border-radius: 10px; border: 1px solid var(--dash-border);
                }
                .card-icon svg { width: 16px; height: 16px; }
                .card-content {
                    flex: 1; display: flex; flex-direction: column; overflow-y: auto; gap: 8px;
                    scrollbar-width: thin;
                    scrollbar-color: var(--dash-border) transparent;
                }
                .card-content::-webkit-scrollbar { width: 4px; }
                .card-content::-webkit-scrollbar-thumb { background: var(--dash-border); border-radius: 10px; }
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
                .mini-btn:hover { background: color-mix(in srgb, #0ea5e9 20%, transparent); }
                .mini-btn-flat {
                    background: transparent; border: 1px solid var(--dash-border); color: #0ea5e9;
                    padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;
                    transition: all 0.2s;
                }
                .mini-btn-flat:hover {
                    background: #0ea5e9; color: white; border-color: #0ea5e9;
                }
                /* Radar Layout */
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

                /* Skeleton Styles */
                .skeleton-line {
                    background: var(--dash-border);
                    height: 12px;
                    border-radius: 6px;
                    position: relative;
                    overflow: hidden;
                    opacity: 0.6;
                }
                .skeleton-line::after {
                    content: "";
                    position: absolute;
                    top: 0; right: 0; bottom: 0; left: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
                    animation: shimmer 2s infinite;
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                
                .full-width-heading {
                    grid-column: 1 / -1;
                    padding: 20px 0 10px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .full-width-heading span {
                    font-size: 11px;
                    font-weight: 800;
                    color: var(--dash-text-muted);
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    white-space: nowrap;
                }
                .full-width-heading::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: var(--dash-border);
                    opacity: 0.5;
                }
                .full-width-heading.collapsible::after {
                    display: none;
                }
                .full-width-heading .heading-line {
                    flex: 1;
                    height: 1px;
                    background: var(--dash-border);
                    opacity: 0.5;
                    margin: 0 12px;
                }
                
                .full-width-heading.collapsible {
                    cursor: pointer;
                    user-select: none;
                    transition: all 0.2s;
                    border-radius: 8px;
                    padding: 20px 10px 10px;
                    margin-left: -10px;
                }
                .full-width-heading.collapsible:hover {
                    background: var(--dash-accent-hover);
                }
                .collapse-arrow {
                    flex-shrink: 0;
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    border: 1px solid var(--dash-border);
                    background: var(--dash-bg);
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s, border-color 0.2s;
                    color: var(--dash-text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .full-width-heading.collapsible:hover .collapse-arrow {
                    border-color: var(--dash-primary);
                    color: var(--dash-primary);
                }
                .full-width-heading.open .collapse-arrow {
                    transform: rotate(180deg);
                    color: var(--dash-primary);
                    border-color: rgba(14, 165, 233, 0.45);
                    background: color-mix(in srgb, #0ea5e9 12%, var(--dash-bg));
                }
                
                .premium-chart-card {
                    overflow: visible !important;
                    padding: 15px !important;
                    margin-top: 30px;
                }
                .full-width {
                    grid-column: 1 / -1;
                    width: 100%;
                }
                .student-overview-row {
                    grid-column: 1 / -1;
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                    width: 100%;
                }
                .student-overview-row .dash-card {
                    min-width: 0;
                    min-height: 220px;
                    padding: 16px;
                }
                .student-overview-row .card-content {
                    overflow: hidden;
                }
                @media (max-width: 640px) {
                    .student-overview-row {
                        grid-template-columns: 1fr;
                    }
                }
                .chart-container-inner {
                    min-height: 320px;
                    width: 100%;
                }
                .growth-chart-wrap {
                    width: 100%;
                }
                .growth-chart-wrap svg {
                    vertical-align: top;
                }
                
                /* Usage Analytics Dash Styles */
                .comparison-grid-dash { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; width: 100%; }
                .table-card-dash { background: var(--dash-card-bg); padding: 18px; border-radius: 16px; border: 1px solid var(--dash-border); }
                .table-card-dash h3 { font-size: 13px; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
                .list-dash { display: flex; flex-direction: column; gap: 10px; }
                .list-item-dash { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 10px; background: var(--dash-bg); border: 1px solid var(--dash-border); }
                .rank-dash { font-weight: 800; color: #0ea5e9; font-size: 11px; min-width: 20px; }
                .info-dash { flex: 1; display: flex; flex-direction: column; min-width: 0; }
                .name-dash { font-weight: 600; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--dash-text); }
                .sub-dash { font-size: 10px; color: var(--dash-text-muted); }
                .val-dash { font-weight: 800; color: #0ea5e9; font-size: 12px; }
                
                .models-grid-dash { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; width: 100%; }
                .model-mini-stat { background: var(--dash-bg); padding: 12px; border-radius: 10px; border: 1px solid var(--dash-border); }

                .table-row-hover:hover { background: rgba(59, 130, 246, 0.05); }
                .table-row-hover td { transition: all 0.2s; }

                .stat-card-material {
                    position: relative;
                    padding: 15px 20px !important;
                    display: flex;
                    flex-direction: column;
                }
                .stat-icon-box {
                    position: absolute;
                    top: -20px;
                    left: 20px;
                    width: 60px;
                    height: 60px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 20px 0 rgba(0,0,0,0.14), 0 7px 10px -5px rgba(0,0,0,0.4);
                }
                .stat-content {
                    text-align: right;
                    margin-bottom: 10px;
                }
                .stat-title {
                    font-size: 14px;
                    color: var(--dash-text-muted);
                    margin: 0;
                }
                .stat-value {
                    font-size: 24px;
                    font-weight: 800;
                    margin: 5px 0 0;
                    color: var(--dash-text-main);
                }
                .stat-divider {
                    border: none;
                    border-top: 1px solid var(--dash-border);
                    margin: 10px 0;
                    opacity: 0.5;
                }
                .stat-footer {
                    font-size: 12px;
                    color: var(--dash-text-muted);
                    margin: 0;
                }
                
                .dash-grid { gap: 6px !important; }
                .dash-card { padding: 8px !important; }
                .full-width-heading { padding: 2px 0 !important; margin: 2px 0 !important; border-bottom: 1px solid var(--dash-border); }
                .full-width-heading span { font-size: 10px !important; letter-spacing: 0.5px; opacity: 0.7; font-weight: 800; }
                .card-header h3 { font-size: 11px !important; }

                @media (max-width: 1000px) {
                    .dash-grid { grid-template-columns: 1fr; }
                }

                .secondary-view {
                    animation: fadeIn 0.4s ease-out;
                }
                .back-btn-dash {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 14px;
                    background: var(--dash-bg);
                    border: 1px solid var(--dash-border);
                    border-radius: 8px;
                    color: var(--dash-text-main);
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .back-btn-dash:hover {
                    background: var(--dash-accent-hover);
                    border-color: var(--dash-primary);
                    color: var(--dash-primary);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            ` }} />
        </App>
    );
};

export default Dashboard;

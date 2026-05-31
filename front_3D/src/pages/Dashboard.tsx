import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, AlertTriangle, CheckCircle, Activity, Database } from 'lucide-react';
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

const RoleDonut: React.FC<{ roleCounts: {admin:number, teacher:number, student:number} | null }> = ({ roleCounts }) => {
    const counts = roleCounts || { admin: 0, teacher: 0, student: 0 };
    const total = counts.admin + counts.teacher + counts.student;
    const items = [
        { label: 'Admin',    val: counts.admin,   color: '#6366f1' },
        { label: 'Prof',     val: counts.teacher,  color: '#0ea5e9' },
        { label: 'Étudiant', val: counts.student, color: '#34d399' },
    ];
    const size = 160, r = 55, stroke = 18, cx = size / 2, cy = size / 2;
    let offset = 0;
    const circ = 2 * Math.PI * r;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
                {total === 0 ? (
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
                ) : items.map((d, i) => {
                    const dash = (d.val / total) * circ;
                    const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color}
                        strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeDashoffset={-offset}
                        strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />;
                    offset += dash;
                    return el;
                })}
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                    style={{ fill: '#fff', fontSize: '20px', fontWeight: 800, transform: 'rotate(90deg)', transformOrigin: `${cx}px ${cy}px` }}>{total}</text>
            </svg>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {items.map(d => (
                    <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        <span>{d.label}</span>
                        <span style={{ opacity: 0.6 }}>({d.val})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ChartCard: React.FC<{ title: string, subtitle: string, children: React.ReactNode, color: string }> = ({ title, subtitle, children, color }) => (
    <>
        <div className="chart-container-inner" style={{ 
            background: color || 'var(--dash-accent-hover)', 
            borderRadius: '12px', 
            padding: '16px 12px', 
            marginTop: '-25px', 
            boxShadow: '0 10px 30px -12px rgba(0,0,0,0.42), 0 4px 25px 0px rgba(0,0,0,0.12), 0 8px 10px -5px rgba(0,0,0,0.2)',
            marginBottom: '15px',
            width: '100%',
            boxSizing: 'border-box',
        }}>
            {children}
        </div>
        <div style={{ padding: '0 5px' }}>
            <h4 style={{ margin: '0 0 5px', fontSize: '16px', fontWeight: 700, color: 'var(--dash-text-main)' }}>{title}</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--dash-text-muted)' }}>{subtitle}</p>
            <hr style={{ border: 'none', borderTop: '1px solid var(--dash-border)', margin: '15px 0 10px', opacity: 0.5 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--dash-text-muted)', fontStyle: 'italic' }}>
                <span>Données synchronisées</span>
            </div>
        </div>
    </>
);

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
    labels: { total: string; student: string; teacher: string; admin: string };
}> = ({ data, range, labels }) => {
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
    const dates = buildDateAxis(rangeDays);

    const totalSeries = dates.map(date =>
        normalized.filter(d => d.date === date).reduce((s, d) => s + d.count, 0)
    );
    const roleSeries = CHART_LINES.filter(l => l.key !== 'total').map(({ key }) =>
        dates.map(date => countFor(normalized, date, key))
    );
    const allValues = [...totalSeries, ...roleSeries.flat()];
    const dataMax = Math.max(0, ...allValues);
    const { ticks: yTicks, max: maxVal } = buildYAxis(dataMax);

    const seriesByKey: Record<string, number[]> = {
        total: totalSeries,
        student: dates.map(date => countFor(normalized, date, 'student')),
        teacher: dates.map(date => countFor(normalized, date, 'teacher')),
        admin: dates.map(date => countFor(normalized, date, 'admin')),
    };

    const height = 340;
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

    const hasAnyData = normalized.some(d => d.count > 0);

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



const DonutChart: React.FC<{ roleCounts: any, t: any }> = ({ roleCounts, t }) => {
    if (!roleCounts) return <div style={{height:'150px'}} />;
    const data = [
        { label: 'Admin', val: roleCounts.admin || 0, color: '#fff' },
        { label: 'Prof', val: roleCounts.teacher || 0, color: 'rgba(255,255,255,0.7)' },
        { label: 'Etudiant', val: roleCounts.student || 0, color: 'rgba(255,255,255,0.4)' }
    ];
    const total = data.reduce((a, b) => a + b.val, 0);
    const size = 150;
    const r = 50, w = 12, center = size / 2;
    let acc = -Math.PI / 2;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
                {total === 0 ? (
                    <circle cx={center} cy={center} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={w} />
                ) : data.map((d, i) => {
                    if (d.val === 0) return null;
                    const angle = (d.val / total) * Math.PI * 2;
                    const x1 = center + r * Math.cos(acc), y1 = center + r * Math.sin(acc);
                    const x2 = center + r * Math.cos(acc + angle), y2 = center + r * Math.sin(acc + angle);
                    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${angle > Math.PI ? 1 : 0} 1 ${x2} ${y2}`;
                    const res = <motion.path key={i} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} d={path} fill="none" stroke={d.color} strokeWidth={w} strokeLinecap="round" />;
                    acc += angle;
                    return res;
                })}
                <text x={center} y={center} textAnchor="middle" dominantBaseline="middle" style={{ fill: '#fff', fontSize: '18px', fontWeight: 800 }}>{total}</text>
            </svg>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', fontSize: '10px', fontWeight: 700, flexWrap: 'wrap', justifyContent: 'center' }}>
                {data.map(d => (
                    <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fff' }}>
                        <div style={{ width: '6px', height: '6px', background: d.color, borderRadius: '50%' }} />
                        <span>{d.label === 'Admin' ? t('Admin', 'Admin') : d.label === 'Prof' ? t('Prof', 'Teacher') : t('Etudiant', 'Student')}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
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
    const { language } = useLanguage();
    const [stats, setStats] = useState<any>(null);
    const [roots, setRoots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adminStats, setAdminStats] = useState<any>(null);
    const [teacherStats, setTeacherStats] = useState<any>(null);
    const [statRange, setStatRange] = useState('30');
    const [showTeacherSection, setShowTeacherSection] = useState(() => readUserRole() === 'teacher');
    const [showStudentSection, setShowStudentSection] = useState(() => readUserRole() === 'student');
    const adminStatsRangeReady = useRef(false);

    const fetchAdminStats = async (range: string) => {
        try {
            const data = await apiCall(`/system/stats?range=${range}`);
            setAdminStats(data);
        } catch (err) {
            console.error("Admin stats failed", err);
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
            promises.push(apiCall('/system/stats?range=30').catch(() => null));
            promises.push(apiCall('labs').catch(() => ({ created: [] })));
            promises.push(apiCall('mastery/stats').catch(() => null));
        } else if (role === 'teacher') {
            promises.push(apiCall('labs').catch(() => ({ created: [] })));
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
    }, []);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role !== 'admin' || loading) return;
        if (!adminStatsRangeReady.current) {
            adminStatsRangeReady.current = true;
            return;
        }
        fetchAdminStats(statRange);
    }, [statRange, loading]);

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
                {!loading && (isStudent || isTeacher) && (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
                <h1 style={{ margin: 0 }}>{t('Tableau de bord', 'Dashboard')}</h1>
                <Link to="/" className="dash-home-link-hero" style={{ margin: 0 }}>
                    <span className="home-link-text">{t("Retour au portail d'accueil", "Back to Home Portal")}</span>
                    <ArrowLg />
                </Link>
            </div>

            {loading ? (
                <div style={{ padding: '40px', color: 'var(--dash-text-muted)' }}>{t('Chargement des données biométriques...', 'Loading biometric data...')}</div>
            ) : (
                <div className="dash-grid">
                    {/* --- ADMIN VIEW (ALWAYS PRIMARY) --- */}
                    {isAdmin && (
                        <>
                            <div className="full-width-heading"><span>{t('Contrôle Administrateur', 'Administrator Control')}</span></div>

                            {/* Top 3 cards */}
                            <div className="dash-card custom-card">
                                <div className="card-header">
                                    <span className="card-icon"><Database size={20} color="#6366f1"/></span>
                                    <h3>{t('Statut Système', 'System Status')}</h3>
                                </div>
                                <div className="card-content">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span>{t('Stockage utilisé', 'Used Storage')}</span>
                                            <strong style={{ color: '#6366f1' }}>{adminStats?.total_size_mb || 0} MB</strong>
                                        </div>
                                        <div style={{ width: '100%', height: '6px', background: 'var(--dash-border)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ width: `${Math.min(((adminStats?.total_size_mb || 0) / 500) * 100, 100)}%`, height: '100%', background: '#6366f1', transition: 'width 1s' }}></div>
                                        </div>
                                        <div style={{ marginTop: '6px', fontSize: '12px' }}>
                                            <div style={{ color: 'var(--dash-text-muted)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase' }}>{t('Top Tables', 'Top Tables')}</div>
                                            {adminStats?.top_tables?.slice(0, 3).map((tt: any, idx: number) => (
                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--dash-border)', opacity: 0.8 }}>
                                                    <span style={{ fontWeight: 600 }}>{tt.name}</span>
                                                    <span style={{ color: 'var(--dash-text-muted)' }}>{tt.rows} {t('lignes', 'rows')}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <Link to="/tech" className="mini-btn" style={{ marginTop: 'auto' }}>{t("Gérer l'infra", 'Manage Infra')} →</Link>
                                    </div>
                                </div>
                            </div>

                            <div className="dash-card custom-card">
                                <div className="card-header">
                                    <span className="card-icon"><Activity size={20} color="#0ea5e9"/></span>
                                    <h3>{t('Utilisateurs & Assets', 'Users & Assets')}</h3>
                                </div>
                                <div className="card-content" style={{ gap: '16px', marginTop: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div style={{ textAlign: 'center', flex: 1 }}>
                                            <div style={{ fontSize: '20px', fontWeight: 800 }}>{adminStats?.counts?.users || 0}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t('Membres', 'Members')}</div>
                                        </div>
                                        <div style={{ width: '1px', height: '30px', background: 'var(--dash-border)' }}></div>
                                        <div style={{ textAlign: 'center', flex: 1 }}>
                                            <div style={{ fontSize: '20px', fontWeight: 800 }}>{adminStats?.counts?.assets_3d || 0}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--dash-text-muted)', textTransform: 'uppercase' }}>{t('Modèles', 'Models')}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '15px', background: 'var(--dash-accent-hover)', borderRadius: '12px', border: '1px solid var(--dash-border)' }}>
                                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#34d399', lineHeight: 1 }}>{adminStats?.active_sessions || 0}</div>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dash-text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>{t('Sessions Actives', 'Active Sessions')}</div>
                                    </div>
                                    <Link to="/utilisateurs" className="mini-btn" style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}>{t('Console Admin', 'Admin Console')} →</Link>
                                </div>
                            </div>

                            <div className="dash-card custom-card">
                                <div className="card-header">
                                    <span className="card-icon"><Calendar size={20} color="#f59e0b"/></span>
                                    <h3>{t('Actions Rapides', 'Quick Actions')}</h3>
                                </div>
                                <div className="card-content" style={{ gap: '12px' }}>
                                    <Link to="/model" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', borderRadius: '12px', background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', fontSize: '14px', fontWeight: 700, color: 'var(--dash-text-main)', transition: 'all 0.2s' }}>
                                        <span>{t('Importer un nouvel asset', 'Import new asset')}</span>
                                        <ArrowLg />
                                    </Link>
                                    <Link to="/utilisateurs" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', borderRadius: '12px', background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', fontSize: '14px', fontWeight: 700, color: 'var(--dash-text-main)', transition: 'all 0.2s' }}>
                                        <span>{t('Gérer les utilisateurs', 'Manage users')}</span>
                                        <ArrowLg />
                                    </Link>
                                </div>
                            </div>

                            {/* Analytics Section — full width */}
                            <div className="full-width-heading" style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    <span>{t('Analyse de Croissance', 'Growth Analytics')}</span>
                                    <div style={{ display: 'flex', gap: '4px', background: 'var(--dash-border)', padding: '3px', borderRadius: '8px' }}>
                                        {[{v:'7', l:'7J'}, {v:'30', l:'1M'}, {v:'90', l:'3M'}, {v:'365', l:'1A'}, {v:'730', l:'2A'}].map(r => (
                                            <button key={r.v} onClick={() => setStatRange(r.v)} style={{
                                                padding: '4px 12px', fontSize: '11px', fontWeight: 800, border: 'none', borderRadius: '6px', cursor: 'pointer',
                                                background: statRange === r.v ? 'var(--dash-bg)' : 'transparent',
                                                color: statRange === r.v ? 'var(--dash-primary)' : 'var(--dash-text-muted)',
                                                transition: '0.2s'
                                            }}>{r.l}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="full-width" style={{ marginBottom: '30px' }}>
                                <ChartCard title={t("Analyse de Croissance", "Growth Analytics")} subtitle={t("4 courbes : Total + Utilisateur, Prof, Admin", "4 curves: Total + User, Teacher, Admin")} color="linear-gradient(135deg, #1e293b, #334155)">
                                    <PremiumCombinedChart
                                        data={adminStats?.user_evolution || []}
                                        range={statRange}
                                        labels={{
                                            total: t('Total', 'Total'),
                                            student: t('Utilisateur', 'User'),
                                            teacher: t('Prof', 'Teacher'),
                                            admin: t('Admin', 'Admin'),
                                        }}
                                    />
                                </ChartCard>
                            </div>
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
                                            <div style={{ fontSize: '32px', fontWeight: 800, margin: '10px 0' }}>{teacherStats?.created?.length || 0}</div>
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
                                            <div style={{ fontSize: '32px', fontWeight: 800, margin: '10px 0' }}>{teacherStats?.created?.reduce((acc: number, l: any) => acc + (l.shared_views?.length || 0), 0) || 0}</div>
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
                                            <div style={{ fontSize: '32px', fontWeight: 800, margin: '10px 0' }}>{teacherStats?.created?.reduce((acc: number, l: any) => acc + (l.total_participants || 0), 0) || 0}</div>
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
                                                <MiniCalendar language={language} upcomingCount={stats?.weak_notions?.length || 0} />
                                                {stats && stats.weak_notions.length > 0 && (
                                                    <Link to="/quiz" className="mini-btn mt-auto">{t('Lancer un Quiz', 'Start Quiz')} →</Link>
                                                )}
                                            </div>
                                        </div>

                                        <div className="dash-card custom-card">
                                            <div className="card-header">
                                                <span className="card-icon" style={{ background: '#6366f120', color: '#6366f1' }}>
                                                    <Activity size={20} strokeWidth={2.5}/>
                                                </span>
                                                <h3>{t('Mes Sessions', 'My Sessions')}</h3>
                                            </div>
                                            <div className="card-content">
                                                <div style={{ fontSize: '32px', fontWeight: 800, margin: '10px 0' }}>{stats?.labs_joined_count || 0}</div>
                                                <div style={{ fontSize: '13px', color: 'var(--dash-text-muted)' }}>{t('Laboratoires et salles rejoints', 'Labs and rooms joined')}</div>
                                                <Link to="/labs" className="mini-btn mt-auto" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>{t('Accéder aux cours', 'Access Courses')} →</Link>
                                            </div>
                                        </div>

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
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                    width: 100%;
                }
                .student-overview-row .dash-card {
                    min-width: 0;
                }
                @media (max-width: 1200px) {
                    .student-overview-row {
                        grid-template-columns: repeat(2, 1fr);
                    }
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
                
                @media (max-width: 1000px) {
                    .dash-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </App>
    );
};

export default Dashboard;

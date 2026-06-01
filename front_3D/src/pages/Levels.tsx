import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import App from '../components/layouts/App';
import { apiCall } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

interface MasteryLevel {
    level: number;
    count: number;
}

interface NotionStat {
    name: string;
    success: number;
    failure: number;
    mastery_level: number;
    last_review?: string;
    next_review?: string;
    net_score?: number;
}

interface MasteryStats {
    has_data: boolean;
    global_score: number;
    total_attempts: number;
    total_notions: number;
    not_started: NotionStat[];
    en_cours: NotionStat[];
    maitrisees: NotionStat[];
    totalement_maitrisees: NotionStat[];
    cultivees: NotionStat[];
    due_notions: NotionStat[];
    mastery_levels: MasteryLevel[];
}

const LEVEL_META = [
    { label: 'Débutant',       labelEn: 'Beginner',      color: '#f87171', bg: '#f8717120' },
    { label: 'Novice',         labelEn: 'Novice',         color: '#fb923c', bg: '#fb923c20' },
    { label: 'Intermédiaire',  labelEn: 'Intermediate',   color: '#fbbf24', bg: '#fbbf2420' },
    { label: 'Avancé',         labelEn: 'Advanced',       color: '#34d399', bg: '#34d39920' },
    { label: 'Expert',         labelEn: 'Expert',         color: '#22d3ee', bg: '#22d3ee20' },
    { label: 'Maître',         labelEn: 'Master',         color: '#a78bfa', bg: '#a78bfa20' },
];

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
    const r = 52;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
    return (
        <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={r} fill="none" stroke="var(--dash-border)" strokeWidth="10"/>
            <circle
                cx="70" cy="70" r={r} fill="none"
                stroke={color} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 70 70)"
                style={{ transition: 'stroke-dashoffset 1.2s ease, stroke 0.5s' }}
            />
            <text x="70" y="65" textAnchor="middle" fill="currentColor" style={{ color: 'var(--dash-text)' }} fontSize="22" fontWeight="700">
                {score}%
            </text>
            <text x="70" y="84" textAnchor="middle" fill="currentColor" style={{ color: 'var(--dash-text-muted)' }} fontSize="11">
                global
            </text>
        </svg>
    );
};

const MasteryBar: React.FC<{ notion: NotionStat; variant: 'weak' | 'strong' }> = ({ notion, variant }) => {
    const total = notion.success + notion.failure;
    const pct   = total > 0 ? Math.round((notion.success / total) * 100) : 0;
    const meta  = LEVEL_META[Math.min(notion.mastery_level, 5)];
    const barColor = variant === 'weak' ? '#f87171' : '#34d399';
    const netScore = notion.net_score ?? notion.success - notion.failure;
    return (
        <div className="lv-notion-row">
            <div className="lv-notion-header">
                <span className="lv-notion-name">{notion.name}</span>
                <span className="lv-notion-badge" style={{ background: meta.bg, color: meta.color }}>
                    {meta.label}
                </span>
            </div>
            <div className="lv-bar-track">
                <motion.div
                    className="lv-bar-fill"
                    style={{ background: barColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </div>
            <div className="lv-notion-stats">
                <span style={{ color: '#34d399' }}>✓ {notion.success}</span>
                <span style={{ color: '#f87171' }}>✗ {notion.failure}</span>
                <span style={{ color: netScore >= 5 ? '#34d399' : 'var(--dash-text-muted)' }}>∑ {netScore}</span>
                <span style={{ color: 'var(--dash-text-muted)', fontSize: '10px' }}>
                    {`Lvl ${notion.mastery_level}/5`}
                </span>
                {notion.next_review && (
                    <span style={{ color: 'var(--dash-text-muted)', fontSize: '10px', fontStyle: 'italic', marginLeft: 'auto' }}>
                        {notion.next_review}
                    </span>
                )}
            </div>
        </div>
    );
};

const Levels: React.FC = () => {
    const { language } = useLanguage();
    const [stats, setStats] = useState<MasteryStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'en_cours' | 'maitrisees' | 'totalement' | 'cultivees'>('en_cours');

    useEffect(() => {
        apiCall('mastery/stats')
            .then((res: any) => setStats(res))
            .catch(err => {
                console.warn('mastery/stats error:', err);
                // Données vides si pas encore de quiz
                setStats({
                    has_data: false,
                    global_score: 0,
                    total_attempts: 0,
                    total_notions: 0,
                    not_started: [],
                    en_cours: [],
                    maitrisees: [],
                    totalement_maitrisees: [],
                    cultivees: [],
                    due_notions: [],
                    mastery_levels: [],
                });
            })
            .finally(() => setLoading(false));
    }, []);

    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

    return (
        <App
            breadcrumb={t('Niveaux & Compétences', 'Levels & Skills')}
            title={t('Mes Compétences', 'My Skills')}
        >
            <div className="lv-page">
                {loading ? (
                    <div className="lv-loading">
                        <div className="lv-loader-ring"/>
                        <span>{t('Chargement des stats…', 'Loading stats…')}</span>
                    </div>
                ) : !stats?.has_data ? (
                    /* ── État vide ─────────────────────────────── */
                    <motion.div
                        className="lv-empty"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="lv-empty-icon">🧠</div>
                        <h2>{t('Aucune donnée encore', 'No data yet')}</h2>
                        <p>
                            {t(
                                'Faites des Quiz IA pour voir vos compétences apparaître ici. Chaque bonne ou mauvaise réponse est enregistrée.',
                                'Take AI Quizzes to see your skills appear here. Each correct or wrong answer is recorded.',
                            )}
                        </p>
                        <a href="/quiz" className="lv-empty-btn">
                            {t('Commencer un Quiz', 'Start a Quiz')}
                        </a>
                    </motion.div>
                ) : (
                    <>
                        {/* ── Ligne de résumé ──────────────────── */}
                        <motion.div
                            className="lv-summary-row"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {/* Score ring */}
                            <div className="lv-card lv-score-card">
                                <ScoreRing score={stats.global_score} />
                                <div className="lv-score-meta">
                                    <span className="lv-score-label">{t('Score global', 'Global Score')}</span>
                                    <span className="lv-score-attempts">
                                        {stats.total_attempts.toLocaleString()} {t('tentatives', 'attempts')}
                                    </span>
                                    <span className="lv-score-notions">
                                        {stats.total_notions} {t('notions étudiées', 'notions studied')}
                                    </span>
                                </div>
                            </div>

                            {/* Distribution des niveaux */}
                            <div className="lv-card lv-dist-card">
                                <h3 className="lv-card-title">{t('Distribution des niveaux', 'Level Distribution')}</h3>
                                <div className="lv-dist-bars">
                                    {LEVEL_META.map((meta, lvl) => {
                                        const entry = stats.mastery_levels.find(m => m.level === lvl);
                                        const count = entry?.count ?? 0;
                                        const maxCount = Math.max(1, ...stats.mastery_levels.map(m => m.count));
                                        return (
                                            <div key={lvl} className="lv-dist-row">
                                                <span className="lv-dist-label" style={{ color: meta.color }}>
                                                    {language === 'fr' ? meta.label : meta.labelEn}
                                                </span>
                                                <div className="lv-dist-track">
                                                    <motion.div
                                                        className="lv-dist-fill"
                                                        style={{ background: meta.color }}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(count / maxCount) * 100}%` }}
                                                        transition={{ duration: 0.8, delay: lvl * 0.07 }}
                                                    />
                                                </div>
                                                <span className="lv-dist-count" style={{ color: meta.color }}>{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>

                        {/* ── Tableau des notions ──────────────── */}
                        <motion.div
                            className="lv-card lv-notions-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                        >
                            <div className="lv-tab-header">
                                <h3 className="lv-card-title">{t('Analyse des notions', 'Notion Analysis')}</h3>
                                <div className="lv-tabs">
                                    <button
                                        className={`lv-tab ${tab === 'en_cours' ? 'active' : ''}`}
                                        style={{ '--tab-color': '#f97316' } as any}
                                        onClick={() => setTab('en_cours')}
                                    >
                                        ⚡ {t('En cours (∑ ≤ 0)', 'In Progress (∑ ≤ 0)')}
                                    </button>
                                    <button
                                        className={`lv-tab ${tab === 'maitrisees' ? 'active' : ''}`}
                                        style={{ '--tab-color': '#22d3ee' } as any}
                                        onClick={() => setTab('maitrisees')}
                                    >
                                        ✓ {t('Maîtrisées (∑ 1-4)', 'Mastered (∑ 1-4)')}
                                    </button>
                                    <button
                                        className={`lv-tab ${tab === 'totalement' ? 'active' : ''}`}
                                        style={{ '--tab-color': '#34d399' } as any}
                                        onClick={() => setTab('totalement')}
                                    >
                                        ★ {t('Total. (∑ ≥ 5)', 'Total (∑ ≥ 5)')}
                                    </button>
                                    <button
                                        className={`lv-tab ${tab === 'cultivees' ? 'active' : ''}`}
                                        style={{ '--tab-color': '#a78bfa' } as any}
                                        onClick={() => setTab('cultivees')}
                                    >
                                        🤖 {t('Cultivées', 'Cultivated')}
                                    </button>
                                </div>
                            </div>

                            <div className="lv-notions-list">
                                {tab === 'en_cours' && (
                                    stats.en_cours.length > 0
                                        ? stats.en_cours.map((n, i) => (
                                            <motion.div
                                                key={n.name}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                            >
                                                <MasteryBar notion={n} variant="weak"/>
                                            </motion.div>
                                        ))
                                        : <p className="lv-empty-tab">{t('Aucune notion en cours — faites un quiz !', 'No notions in progress — take a quiz!')}</p>
                                )}
                                {tab === 'maitrisees' && (
                                    stats.maitrisees.length > 0
                                        ? stats.maitrisees.map((n, i) => (
                                            <motion.div
                                                key={n.name}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                            >
                                                <MasteryBar notion={n} variant="strong"/>
                                            </motion.div>
                                        ))
                                        : <p className="lv-empty-tab">{t('Aucune notion maîtrisée — continuez !', 'No mastered notions — keep going!')}</p>
                                )}
                                {tab === 'totalement' && (
                                    stats.totalement_maitrisees.length > 0
                                        ? stats.totalement_maitrisees.map((n, i) => (
                                            <motion.div
                                                key={n.name}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                            >
                                                <MasteryBar notion={n} variant="strong"/>
                                            </motion.div>
                                        ))
                                        : <p className="lv-empty-tab">{t('Atteignez ∑ ≥ 5 pour voir cette section.', 'Reach ∑ ≥ 5 to see this section.')}</p>
                                )}
                                {tab === 'cultivees' && (
                                    stats.cultivees.length > 0
                                        ? stats.cultivees.map((n, i) => (
                                            <motion.div
                                                key={n.name}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                            >
                                                <MasteryBar notion={n} variant="strong"/>
                                            </motion.div>
                                        ))
                                        : <p className="lv-empty-tab">{t('Atteignez ∑ ≥ 5 avec ≤ 2 échecs.', 'Reach ∑ ≥ 5 with ≤ 2 failures.')}</p>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </div>

            <style>{`
                .lv-page { padding-bottom: 48px; color: var(--dash-text); }

                .lv-loading {
                    display: flex; align-items: center; gap: 14px;
                    color: var(--dash-text-muted); padding: 48px 0;
                }
                .lv-loader-ring {
                    width: 28px; height: 28px;
                    border: 3px solid var(--dash-border);
                    border-top-color: #0ea5e9;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* Empty state */
                .lv-empty {
                    display: flex; flex-direction: column; align-items: center;
                    text-align: center; padding: 60px 24px; gap: 12px;
                }
                .lv-empty-icon { font-size: 56px; line-height: 1; }
                .lv-empty h2 { margin: 0; font-size: 22px; }
                .lv-empty p {
                    color: var(--dash-text-muted); max-width: 420px;
                    margin: 0; line-height: 1.6;
                }
                .lv-empty-btn {
                    margin-top: 12px; padding: 12px 28px;
                    background: linear-gradient(135deg, #0ea5e9, #6366f1);
                    color: white; border-radius: 10px;
                    text-decoration: none; font-weight: 600;
                    transition: opacity 0.2s;
                }
                .lv-empty-btn:hover { opacity: 0.88; }

                /* Cards */
                .lv-card {
                    background: var(--dash-card-bg);
                    border: 1px solid var(--dash-border);
                    border-radius: 16px;
                    padding: 24px;
                }
                .lv-card-title {
                    margin: 0 0 18px;
                    font-size: 15px; font-weight: 700;
                    color: var(--dash-text);
                }

                /* Summary row */
                .lv-summary-row {
                    display: grid;
                    grid-template-columns: 220px 1fr;
                    gap: 16px;
                    margin-bottom: 16px;
                }
                @media (max-width: 700px) {
                    .lv-summary-row { grid-template-columns: 1fr; }
                }

                .lv-score-card {
                    display: flex; flex-direction: column; align-items: center;
                    gap: 12px; text-align: center;
                }
                .lv-score-meta { display: flex; flex-direction: column; gap: 4px; }
                .lv-score-label {
                    font-size: 13px; font-weight: 600;
                    text-transform: uppercase; letter-spacing: 0.06em;
                    color: var(--dash-text-muted);
                }
                .lv-score-attempts,
                .lv-score-notions {
                    font-size: 13px; color: var(--dash-text-muted);
                }

                /* Level distribution */
                .lv-dist-bars { display: flex; flex-direction: column; gap: 10px; }
                .lv-dist-row {
                    display: flex; align-items: center; gap: 10px;
                }
                .lv-dist-label {
                    width: 100px; font-size: 12px; font-weight: 600;
                    flex-shrink: 0;
                }
                .lv-dist-track {
                    flex: 1; height: 8px;
                    background: var(--dash-border);
                    border-radius: 4px; overflow: hidden;
                }
                .lv-dist-fill { height: 100%; border-radius: 4px; }
                .lv-dist-count { font-size: 12px; font-weight: 700; width: 24px; text-align: right; }

                /* Notions table */
                .lv-notions-card { margin-top: 0; }
                .lv-tab-header {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 20px; flex-wrap: wrap; gap: 10px;
                }
                .lv-tabs { display: flex; gap: 8px; }
                .lv-tab {
                    padding: 7px 14px; border-radius: 8px;
                    border: 1px solid var(--dash-border);
                    background: var(--dash-card-bg);
                    color: var(--dash-text-muted);
                    font-size: 13px; cursor: pointer;
                    transition: all 0.2s;
                }
                .lv-tab:hover { border-color: var(--tab-color, #0ea5e9); }
                .lv-tab.active {
                    border-color: var(--tab-color, #0ea5e9);
                    background: color-mix(in srgb, var(--tab-color, #0ea5e9) 12%, var(--dash-card-bg));
                    color: var(--tab-color, #0ea5e9);
                    font-weight: 600;
                }

                .lv-notions-list { display: flex; flex-direction: column; gap: 14px; }
                .lv-empty-tab {
                    color: var(--dash-text-muted); font-size: 14px;
                    padding: 24px 0; text-align: center; margin: 0;
                }

                /* Notion row */
                .lv-notion-row {
                    padding: 14px 16px;
                    background: var(--dash-bg, #0d0d0d);
                    border-radius: 10px;
                    border: 1px solid var(--dash-border);
                }
                .lv-notion-header {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 8px; gap: 8px;
                }
                .lv-notion-name {
                    font-size: 14px; font-weight: 600;
                    color: var(--dash-text);
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .lv-notion-badge {
                    font-size: 11px; font-weight: 700;
                    padding: 2px 8px; border-radius: 6px;
                    flex-shrink: 0;
                }
                .lv-bar-track {
                    height: 6px; background: var(--dash-border);
                    border-radius: 3px; overflow: hidden; margin-bottom: 6px;
                }
                .lv-bar-fill { height: 100%; border-radius: 3px; }
                .lv-notion-stats {
                    display: flex; gap: 12px; font-size: 12px; font-weight: 600;
                }
            `}</style>
        </App>
    );
};

export default Levels;

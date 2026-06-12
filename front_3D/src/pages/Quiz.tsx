import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, 
    XCircle,
    RotateCcw,
    AlertCircle,
    Search,
    Plus,
    X,
    FolderTree,
} from 'lucide-react';


import Layout from '../components/layouts/App';
import { aiService } from '../services/ai';
import { useLanguage } from '../contexts/LanguageContext';
import { apiCall } from '../services/api';
import '../styles/quiz.css';

const ArrowLg = () => (
  <svg width="33" height="33" viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.433594" y="0.171875" width="32" height="32" rx="16" fill="currentColor" opacity="0.18"/>
    <path d="M12.0226 19.5929C11.7492 19.8663 11.7492 20.3095 12.0226 20.5829C12.296 20.8562 12.7392 20.8562 13.0126 20.5829L12.0226 19.5929ZM21.05 12.2554C21.05 11.8688 20.7366 11.5554 20.35 11.5554L14.05 11.5554C13.6634 11.5554 13.35 11.8688 13.35 12.2554C13.35 12.642 13.6634 12.9554 14.05 12.9554L19.65 12.9554L19.65 18.5554C19.65 18.942 19.9634 19.2554 20.35 19.2554C20.7366 19.2554 21.05 18.942 21.05 18.5554L21.05 12.2554ZM13.0126 20.5829L20.845 12.7504L19.8551 11.7604L12.0226 19.5929L13.0126 20.5829Z" fill="currentColor"/>
  </svg>
);

interface Question {
    id: number;
    text: string;
    options?: string[];
    correctAnswer: string | number;
    userAnswer?: string | number;
    isCorrect?: boolean;
    explanation?: string;
}

const slugify = (label: string) =>
    label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const formatUserAnswer = (q: Question): string => {
    if (q.userAnswer === undefined || q.userAnswer === null || q.userAnswer === '') return '—';
    if (typeof q.userAnswer === 'string') return q.userAnswer;
    if (Array.isArray(q.userAnswer)) {
        return q.userAnswer.map((i) => q.options?.[i] ?? String(i)).join(', ');
    }
    return q.options?.[q.userAnswer as number] ?? String(q.userAnswer);
};

const formatCorrectAnswer = (q: Question): string => {
    if (typeof q.correctAnswer === 'string') return q.correctAnswer;
    if (Array.isArray(q.correctAnswer)) {
        return q.correctAnswer.map((i) => q.options?.[i] ?? String(i)).join(', ');
    }
    return q.options?.[q.correctAnswer as number] ?? String(q.correctAnswer);
};

// Map URL hashes → quiz type IDs (covers both FR and EN labels)
const HASH_TO_TYPE: Record<string, string> = {
    'qcm-classique':      'MCQ',
    'classic-mcq':        'MCQ',
    'vrai-ou-faux':       'TRUE_FALSE',
    'true-or-false':      'TRUE_FALSE',
    'questions-ouvertes': 'OPEN',
    'open-questions':     'OPEN',
    'qcm-multi-choix':    'MCQ_MULTI',
    'multi-choice-mcq':   'MCQ_MULTI',
};

const Quiz: React.FC = () => {
    const { language } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();

    // Paramètres de révision ciblée venant de Review.tsx ou Dashboard
    const navState = (location.state as any) ?? {};
    const targetSystem: string | null = navState.system ?? null;
    const [targetSystemLabel, setTargetSystemLabel] = useState<string | null>(targetSystem);
    // Resync quand on navigue vers /quiz avec un nouvel état (Dashboard → Quiz)
    useEffect(() => {
        if (navState.system) {
            setTargetSystemLabel(navState.system);
        }
    }, [location.state]);

    const [step, setStep] = useState(1);
    const [quizType, setQuizType] = useState<string | null>(navState.quizType ?? null);
    const [questionCount, setQuestionCount] = useState<number>(navState.questionCount ?? 10);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [masterQuestions, setMasterQuestions] = useState<Question[]>([]);
    const [topicLoading, setTopicLoading] = useState(false);
    
    // Nouveaux états pour la sélection manuelle
    const [isManualMode, setIsManualMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Si on arrive depuis Review.tsx avec un système ciblé, on saute directement à l'étape 4
    useEffect(() => {
        if (navState.reviewMode && navState.quizType && navState.system) {
            setTargetSystemLabel(navState.system);
            setQuizType(navState.quizType);
            setQuestionCount(navState.questionCount ?? 10);
            setStep(4);
            handleStartWithSystem(navState.system, navState.quizType, navState.questionCount ?? 10);
            return;
        }
        // Restore state from URL hash on initial load
        const hash = window.location.hash.replace('#', '');
        const matchedType = HASH_TO_TYPE[hash];
        if (matchedType) {
            setQuizType(matchedType);
            setStep(2);
        }
        // Auto-pick a topic if none provided
        if (!navState.system) {
            fetchNextTopic();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Recherche d'objets
    useEffect(() => {
        if (searchQuery.trim().length >= 2) {
            setIsSearching(true);
            const delay = setTimeout(() => {
                apiCall(`anatomy/search?q=${encodeURIComponent(searchQuery)}`)
                    .then((res: any) => setSearchResults(res.results || []))
                    .catch(console.error)
                    .finally(() => setIsSearching(false));
            }, 300);
            return () => clearTimeout(delay);
        } else {
            setSearchResults([]);
            setIsSearching(false);
        }
    }, [searchQuery]);

    const [isLoading, setIsLoading] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOpts, setSelectedOpts] = useState<number[]>([]);
    const [textAnswer, setTextAnswer] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState({ correct: 0, total: 0 });

    const buildPrompt = (system: string | null, type: string | null, count: number) => {
        const lang   = language === 'fr' ? 'French' : 'English';
        const tfOpts = language === 'fr' ? "['Vrai','Faux']" : "['True','False']";
        let format = '';
        if (type === 'MCQ')        format = 'STRICT MCQ: 4 options exactly. correctAnswer:number (0-3). [{text, options, correctAnswer, explanation}]';
        else if (type === 'MCQ_MULTI') format = 'STRICT MULTI-MCQ: 4 options. correctAnswer:number_array (e.g. [0,2]). [{text, options, correctAnswer, explanation}]';
        else if (type === 'TRUE_FALSE') format = `STRICT TRUE/FALSE: 2 options ${tfOpts}. correctAnswer:number (0 or 1). [{text, options, correctAnswer, explanation}]`;
        else format = 'STRICT OPEN QUESTION: NO options array. NO numeric index. correctAnswer MUST BE A STRING (the name of the structure). [{text, correctAnswer:string, explanation}]';

        const scope = system
            ? `FOCUS EXCLUSIVELY on the DIRECT ANATOMICAL SUB-STRUCTURES of "${system}". Each question must test knowledge about ONE specific sub-structure (not about "${system}" itself).`
            : 'Cover diverse anatomy topics.';

        return `CRITICAL: OUTPUT MUST BE A VALID JSON ARRAY ONLY. NO COMMENTS. NO EXPLANATIONS OUTSIDE JSON.
                Anatomy Quiz in ${lang.toUpperCase()}.
                ${scope}
                Format: ${format}.
                Count: ${count}.
                JSON Schema: [{"text": "...", "options": ["..."], "correctAnswer": 0, "explanation": "..."}]
                RESPONSE MUST START WITH [ AND END WITH ].`;
    };

    // Lancement depuis Review.tsx (avec système ciblé)
    const handleStartWithSystem = async (system: string, type: string, count: number) => {
        setIsLoading(true);
        setError(null);
        try {
            // Générer les questions une par une pour éviter les problèmes de l'IA
            const allQuestions: Question[] = [];
            let attempts = 0;
            const maxAttempts = count * 3; // 3 essais par question
            
            while (allQuestions.length < count && attempts < maxAttempts) {
                const prompt = buildPrompt(system, type, 1);
                const response = await aiService.generate('phi3:latest', prompt, system);
                const parsed = parseAndSetQuestionsSingle(response.response, type, allQuestions.length);
                if (parsed) {
                    allQuestions.push(...parsed);
                }
                attempts++;
            }
            
            if (allQuestions.length === 0) {
                throw new Error("No questions generated");
            }
            
            if (allQuestions.length < count) {
                console.warn(`Seulement ${allQuestions.length} questions générées sur ${count} demandées`);
            }
            
            setQuestions(allQuestions);
            setMasterQuestions(allQuestions);
            setIsReviewMode(false);
        } catch (err: any) {
            setError(language === 'fr' ? `Erreur: ${err.message || 'IA Indisponible'}` : `Error: ${err.message || 'AI Unavailable'}`);
        } finally { setIsLoading(false); }
    };

    // Pioche un objet parent non étudié via l'API (ou un objet spécifique)
    const fetchNextTopic = async (objectId?: number) => {
        setTopicLoading(true);
        try {
            const url = objectId ? `quiz/next-topic?object_id=${objectId}` : 'quiz/next-topic';
            const res = await apiCall(url);
            if (res?.name) {
                setTargetSystemLabel(res.name);
                setIsManualMode(false);
            }
        } catch (e) {
            console.warn('Pick topic failed', e);
        } finally {
            setTopicLoading(false);
        }
    };

    const handleStart = async () => {
        setStep(4);
        setIsLoading(true);
        setError(null);
        try {
            // Générer les questions une par une pour éviter les problèmes de l'IA
            const allQuestions: Question[] = [];
            let attempts = 0;
            const maxAttempts = questionCount * 3; // 3 essais par question
            
            while (allQuestions.length < questionCount && attempts < maxAttempts) {
                const prompt = buildPrompt(targetSystemLabel, quizType, 1);
                const response = await aiService.generate('phi3:latest', prompt, targetSystemLabel ?? undefined);
                const parsed = parseAndSetQuestionsSingle(response.response, quizType, allQuestions.length);
                if (parsed) {
                    allQuestions.push(...parsed);
                }
                attempts++;
            }
            
            if (allQuestions.length === 0) {
                throw new Error("No questions generated");
            }
            
            if (allQuestions.length < questionCount) {
                console.warn(`Seulement ${allQuestions.length} questions générées sur ${questionCount} demandées`);
            }
            
            setQuestions(allQuestions);
            setMasterQuestions(allQuestions);
            setIsReviewMode(false);
        } catch (err: any) {
            console.error("Quiz Start Error:", err);
            setError(language === 'fr' ? `Erreur: ${err.message || "IA Indisponible"}` : `Error: ${err.message || "AI Unavailable"}`);
        } finally { setIsLoading(false); }
    };

    // Parsing JSON ultra-robuste — partagé avec handleStartWithSystem (Review.tsx)
    const parseAndSetQuestionsSingle = (response: string, type: string | null, startIndex: number): Question[] | null => {
        const cleanStr = (s: string) => {
            let c = s
                .replace(/\/\/.*/g, '')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
                .replace(/"\w+":\s*,/g, '')
                .replace(/,\s*([\]\}])/g, '$1');
            if (!c.endsWith(']') && !c.endsWith('}')) {
                const lb = c.lastIndexOf('}');
                if (lb !== -1) {
                    c = c.substring(0, lb + 1);
                    if (!c.endsWith(']')) c += ']';
                    if (!c.startsWith('[')) c = '[' + c;
                }
            }
            return c;
        };
        let parsed: any = null;
        const raw = response.trim();
        try { parsed = JSON.parse(cleanStr(raw)); } catch {
            const m = raw.match(/\[[\s\S]*\]/);
            if (m) {
                try { parsed = JSON.parse(cleanStr(m[0])); }
                catch {
                    const objs = cleanStr(m[0]).match(/\{[\s\S]*?\}/g);
                    if (objs) parsed = objs.map((o: string) => { try { return JSON.parse(o); } catch { return null; } }).filter(Boolean);
                }
            }
        }
        if (!parsed) return null;
        const arr = Array.isArray(parsed) ? parsed : (parsed.quiz || []);
        if (!arr.length) return null;
        
        const finalQs = arr.map((q: any, i: number) => {
            const defOpts = type === 'TRUE_FALSE'
                ? (language === 'fr' ? ['Vrai', 'Faux'] : ['True', 'False'])
                : ['Option A', 'Option B', 'Option C', 'Option D'];
            return {
                id: startIndex + i + 1,
                text: q.text || q.question || 'Description anatomique...',
                options: q.options || defOpts,
                correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : (q.answer || 0),
                explanation: q.explanation || ''
            };
        });
        return finalQs;
    };

    const handleAnswer = (val: any) => {
        // Sécurité anti-clic vide
        if (quizType === 'OPEN' && (!val || !val.trim())) return;
        if (quizType === 'MCQ_MULTI' && (!val || val.length === 0)) return;
        if (quizType !== 'OPEN' && quizType !== 'MCQ_MULTI' && (val === null || val === undefined)) return;

        const q = questions[currentIdx];
        let correct = false;
        if (quizType === 'MCQ_MULTI') {
            const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
            const userArr = Array.isArray(val) ? val : [val];
            correct = correctArr.length === userArr.length && correctArr.every((v: any) => userArr.includes(v));
        } else if (typeof val === 'string') {
            correct = val.toLowerCase().includes(String(q.correctAnswer).toLowerCase());
        } else {
            correct = val === q.correctAnswer;
        }

        const updated = [...questions];
        updated[currentIdx] = { ...q, userAnswer: val, isCorrect: correct };
        setQuestions(updated);
        proceedToNext(updated);
    };

    const proceedToNext = (currentQuestions: Question[]) => {
        if (currentIdx < currentQuestions.length - 1) {
            setCurrentIdx(currentIdx + 1);
            setSelectedOpts([]);
            setTextAnswer('');
        } else {
            let finalSet = currentQuestions;
            
            // Si on finit une session de révision, on fusionne les progrès dans le master
            if (isReviewMode) {
                finalSet = masterQuestions.map(mq => {
                    const revised = currentQuestions.find(rq => rq.id === mq.id);
                    return revised ? revised : mq;
                });
                setMasterQuestions(finalSet);
                setQuestions(finalSet);
                setIsReviewMode(false);
            } else {
                // En mode normal, on met aussi à jour masterQuestions avec les réponses
                setMasterQuestions(finalSet);
            }

            const score = finalSet.filter(x => x.isCorrect).length;
            setResults({ correct: score, total: finalSet.length });
            setStep(5);
            
            // Sync Mastery — envoie un résumé de la session au backend
            if (targetSystemLabel) {
                const sessionSuccess = finalSet.filter(q => q.isCorrect).length;
                const sessionFailure = finalSet.length - sessionSuccess;

                apiCall('mastery/record', {
                    method: 'POST',
                    body: JSON.stringify({
                        anatomical_object_name: targetSystemLabel,
                        success_count: sessionSuccess,
                        failure_count: sessionFailure,
                        is_review: isReviewMode // isReviewMode est vrai si on corrige ses erreurs
                    })
                }).catch(e => console.error("Mastery track error", e));
            }

            const typeLabel = types.find(t => t.id === quizType)?.label || '';
            navigate(`/quiz/#${slugify(typeLabel)}/result`, { replace: true });
        }
    };

    const handleRetake = () => {
        const resetQs = questions.map(q => ({ ...q, userAnswer: undefined, isCorrect: undefined }));
        setQuestions(resetQs);
        setCurrentIdx(0);
        setResults({ correct: 0, total: resetQs.length });
        setSelectedOpts([]);
        setTextAnswer('');
        setStep(4);
        const typeLabel = types.find(t => t.id === quizType)?.label || '';
        navigate(`/quiz/#${slugify(typeLabel)}`, { replace: true });
    };

    const handleRetakeMissed = () => {
        setIsReviewMode(true);
        // On base toujours la révision sur le Master pour accumuler les corrections
        const missed = masterQuestions.filter(q => q.isCorrect === false);
        
        if (missed.length === 0) {
            setIsReviewMode(false);
            return;
        }

        const resetQs = missed.map(q => ({ ...q, userAnswer: undefined, isCorrect: undefined }));
        
        setQuestions(resetQs);
        setCurrentIdx(0);
        setResults({ correct: 0, total: resetQs.length });
        setSelectedOpts([]);
        setTextAnswer('');
        setStep(4);
        const typeLabel = types.find(t => t.id === quizType)?.label || '';
        navigate(`/quiz/#${slugify(typeLabel)}/review`, { replace: true });
    };

    const reset = () => {
        setStep(1);
        setQuizType(null);
        setQuestions([]);
        setCurrentIdx(0);
        setResults({ correct: 0, total: 0 });
        setSelectedOpts([]);
        setTextAnswer('');
        navigate('/quiz', { replace: true });
    };

    const types = [
        { 
            id: 'MCQ', 
            label: language === 'fr' ? 'QCM Classique' : 'Classic MCQ', 
            desc: language === 'fr' ? 'Évaluez vos connaissances globales avec des choix multiples.' : 'Evaluate overall knowledge with multiple choices.',
            configDesc: language === 'fr'
                ? 'Quatre propositions, une seule correcte. Idéal pour travailler la reconnaissance associative et éliminer des distracteurs cliniquement plausibles.'
                : 'Four proposals, one correct. Ideal for working on associative recognition and eliminating clinically plausible distractors.',
            img: "https://storage.googleapis.com/dev_resources_voka_io_303011/common/advanced-MoD-animation.webp"
        },
        { 
            id: 'TRUE_FALSE', 
            label: language === 'fr' ? 'Vrai ou Faux' : 'True or False', 
            desc: language === 'fr' ? 'Validation rapide et précise de concepts isolés.' : 'Fast and precise validation of isolated concepts.',
            configDesc: language === 'fr'
                ? 'Affirmez ou infirmez une proposition anatomique. Ce format exige une certitude absolue et entraîne l\'élimination des hésitations face aux pièges.'
                : 'Confirm or deny an anatomical statement. This format demands absolute certainty and builds confidence in avoiding common traps.',
            img: "https://storage.googleapis.com/dev_resources_voka_io_303011/common/advanced-biotech.webp"
        },
        { 
            id: 'OPEN', 
            label: language === 'fr' ? 'Questions Ouvertes' : 'Open Questions', 
            desc: language === 'fr' ? 'Réponses libres évaluées par l\'intelligence artificielle.' : 'Free responses evaluated by AI.',
            configDesc: language === 'fr'
                ? 'Aucun choix, aucune aide. L\'IA analyse la sémantique de votre réponse en profondeur pour un test de restitution maximal.'
                : 'No choices, no hints. The AI deeply analyzes the semantics of your answer for the ultimate recall challenge.',
            img: "https://storage.googleapis.com/dev_resources_voka_io_303011/video%20posters/advanced-surgery.webp"
        },
        { 
            id: 'MCQ_MULTI', 
            label: language === 'fr' ? 'QCM Multi-choix' : 'Multi-Choice MCQ', 
            desc: language === 'fr' ? 'Questions avec une ou plusieurs réponses correctes.' : 'Questions with one or more correct answers.',
            configDesc: language === 'fr'
                ? 'Plusieurs propositions peuvent être vraies. Pour valider la question, vous devez identifier TOUTES les réponses exactes. Un défi de précision chirurgicale.'
                : 'Several proposals can be true. To validate the question, you must identify ALL correct answers. A surgical precision challenge.',
            img: "https://storage.googleapis.com/dev_resources_voka_io_303011/common/advanced-medical-device-animation.webp"
        }
    ];

    const pageVariants = {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    };

    const currentBreadcrumb = quizType 
        ? (
            <span>
                <a 
                    href="/quiz" 
                    onClick={(e) => { e.preventDefault(); reset(); }}
                    style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.color = 'var(--dash-primary)'}
                    onMouseOut={(e) => e.currentTarget.style.color = 'inherit'}
                >
                    Quiz
                </a> / {types.find(t => t.id === quizType)?.label}
            </span>
        )
        : "Quiz";

    return (
        <Layout breadcrumb={currentBreadcrumb}>
            <div className="quiz-immersive-page">
                <AnimatePresence mode="wait">
                    {/* STEP 1 : TYPE SELECTION */}
                    {step === 1 && (
                        <motion.div key="step1" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="quiz-fullscreen-section">
                            <div className="quiz-header-text">
                                <div className="quiz-header-top">
                                    <h1>
                                        {topicLoading
                                            ? (language === 'fr' ? 'Sélection du sujet…' : 'Selecting topic…')
                                            : targetSystemLabel
                                            ? (language === 'fr' ? `Quiz sur : ${targetSystemLabel}` : `Quiz on: ${targetSystemLabel}`)
                                            : (language === 'fr' ? "Paramétrez votre évaluation" : "Configure your evaluation")
                                        }
                                    </h1>

                                    {(!topicLoading && !navState.system) && (
                                        <div className="quiz-topic-switcher">
                                            {!isManualMode ? (
                                                <button className="topic-switch-btn" onClick={() => setIsManualMode(true)}>
                                                    <Search size={14} />
                                                    {language === 'fr' ? "Choisir un autre sujet" : "Choose another subject"}
                                                </button>
                                            ) : (
                                                <div className="topic-search-wrap">
                                                    <div className="topic-search-box">
                                                        <Search size={16} className="search-icon" />
                                                        <input 
                                                            autoFocus
                                                            type="text" 
                                                            placeholder={language === 'fr' ? "Chercher un sujet (ex: Crâne, Fémur...)" : "Search a subject (eg: Skull, Femur...)"}
                                                            value={searchQuery}
                                                            onChange={e => setSearchQuery(e.target.value)}
                                                        />
                                                        <button className="close-search" onClick={() => { setIsManualMode(false); setSearchQuery(''); }}>
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                    <AnimatePresence>
                                                        {isManualMode && (searchQuery.trim().length >= 2 || isSearching) && (
                                                            <motion.div 
                                                                initial={{ opacity: 0, y: -10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -10 }}
                                                                className="topic-results-popover"
                                                            >
                                                                {isSearching ? (
                                                                    <div className="search-msg">{language === 'fr' ? 'Recherche...' : 'Searching...'}</div>
                                                                ) : searchResults.length > 0 ? (
                                                                    <div className="search-list">
                                                                        {searchResults.map((res: any) => (
                                                                            <div key={res.id} className="search-item" onClick={() => fetchNextTopic(res.id)}>
                                                                                <FolderTree size={14} />
                                                                                <span className="item-name">{res.name}</span>
                                                                                <small className="item-type">{res.type}</small>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="search-msg">{language === 'fr' ? 'Aucun résultat' : 'No results'}</div>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                            {!isManualMode && (
                                                <button className="topic-switch-btn" onClick={() => fetchNextTopic()}>
                                                    <RotateCcw size={14} />
                                                    {language === 'fr' ? "Sujet aléatoire" : "Random subject"}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <p>
                                    {topicLoading
                                        ? (language === 'fr' ? 'Recherche d\'un sujet anatomique non étudié…' : 'Searching for an unstudied anatomical topic…')
                                        : targetSystemLabel
                                        ? (language === 'fr' ? `Questions exclusivement sur les sous-structures de "${targetSystemLabel}" — choisis le format ci-dessous.` : `Questions exclusively on sub-structures of "${targetSystemLabel}" — choose the format below.`)
                                        : (language === 'fr' ? "Choisissez le format de test généré sur-mesure par notre IA en fonction de votre cursus." : "Choose the test format custom-generated by our AI based on your curriculum.")
                                    }
                                </p>
                            </div>
                            <div className="quiz-step-layout">
                                <div className="quiz-cards-grid">
                                    {types.map(t => (
                                        <div key={t.id} className="quiz-image-card" onClick={() => { setQuizType(t.id as any); setStep(2); navigate(`/quiz/#${slugify(t.label)}`, { replace: true }); }}>
                                            <div className="card-bg" style={{ backgroundImage: `url(${t.img})` }}></div>
                                            <div className="card-overlay">
                                                <div className="card-text-content">
                                                    <h3>{t.label}</h3>
                                                    <p>{t.desc}</p>
                                                </div>
                                                <div className="card-arrow-circle">
                                                    <ArrowLg />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="quiz-side-panel">
                                    <h3>{language === 'fr' ? "Méthodologie du Quiz IA" : "AI Quiz Methodology"}</h3>
                                    <p>{language === 'fr' ? "Poussez vos limites anatomiques avec des séries uniques générées dynamiquement par notre modèle d'Intelligence Artificielle en temps réel." : "Push your anatomical limits with unique series dynamically generated by our Artificial Intelligence model in real time."}</p>
                                    
                                    <h4>{language === 'fr' ? "1. Objectif des formats" : "1. Format Objectives"}</h4>
                                    <ul className="info-list">
                                        <li><strong>{language === 'fr' ? "QCM Classique" : "Classic MCQ"} :</strong><br/>{language === 'fr' ? "Favorise la reconnaissance associative. Idéal pour identifier la réponse exacte parmi des distracteurs cliniquement plausibles." : "Promotes associative recognition. Ideal for identifying the exact answer among clinically plausible distractors."}</li>
                                        <li><strong>{language === 'fr' ? "QCM Multi-choix" : "Multi-Choice MCQ"} :</strong><br/>{language === 'fr' ? "Le défi ultime de précision. Une ou plusieurs réponses peuvent être correctes. Exige une connaissance exhaustive." : "The ultimate precision challenge. One or more answers can be correct. Requires exhaustive knowledge."}</li>
                                        <li><strong>{language === 'fr' ? "Vrai ou Faux" : "True or False"} :</strong><br/>{language === 'fr' ? "Exige une certitude absolue face à l'affirmation présentée. Merveilleux pour éliminer les hésitations face aux pièges." : "Requires absolute certainty on the statement. Wonderful to eliminate hesitations against traps."}</li>
                                        <li><strong>{language === 'fr' ? "Questions Ouvertes" : "Open Questions"} :</strong><br/>{language === 'fr' ? "Le test de restitution ultime. L'IA va au-delà des fautes de frappe et analyse véritablement la sémantique de votre réponse." : "The ultimate recall test. The AI goes beyond typos and truly analyzes the semantics of your answer."}</li>
                                    </ul>

                                    <h4 className="mt-large">{language === 'fr' ? "2. Progression garantie" : "2. Guaranteed Progression"}</h4>
                                    <p className="small-desc">
                                        {language === 'fr' ? "Les évaluations ne sont jamais pré-écrites. Chaque nouvelle session interroge le corpus médical avec un ciblage aléatoire pour garantir un examen imprévisible et de grade universitaire." : "Evaluations are never pre-written. Each new session queries the medical corpus with random targeting to guarantee an unpredictable, university-grade exam."}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2 : CONFIGURATION */}
                    {step === 2 && (() => {
                        const selectedType = types.find(t => t.id === quizType);
                        return (
                        <motion.div key="step2" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="qz-config-page">
                            {/* Left panel */}
                            <div className="qz-config-left">

                                <h1 className="qz-config-main-title">
                                    {selectedType?.label}
                                </h1>
                                <p className="qz-config-sub">
                                    {targetSystemLabel
                                        ? (language === 'fr' ? `Objet : ${targetSystemLabel}` : `Subject: ${targetSystemLabel}`)
                                        : (language === 'fr' ? 'Configuration de l\'examen' : 'Examination settings')
                                    }
                                </p>

                                {/* Question count slider */}
                                <div className="qz-slider-block">
                                    <div className="qz-slider-top">
                                        <span className="qz-slider-label">
                                            {language === 'fr' ? 'Nombre de questions' : 'Number of questions'}
                                        </span>
                                        <span className="qz-slider-value">{questionCount}</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="100"
                                        value={questionCount}
                                        onChange={e => setQuestionCount(Number(e.target.value))}
                                        className="qz-slider"
                                    />
                                    <div className="qz-slider-range">
                                        <span>1</span><span>100</span>
                                    </div>
                                </div>

                                <button className="qz-start-btn" onClick={handleStart}>
                                    {language === 'fr' ? "Démarrer l'examen" : 'Start the exam'}
                                    <ArrowLg />
                                </button>
                            </div>

                            {/* Right visual panel */}
                            <div className="qz-config-right">
                                <div
                                    className="qz-config-right-img"
                                    style={{ backgroundImage: `url(${selectedType?.img})` }}
                                />
                                <div className="qz-config-right-overlay"/>
                                <div className="qz-config-right-content">
                                    <div className="qz-config-right-tag">{selectedType?.label}</div>
                                    <p className="qz-config-right-desc">{(selectedType as any)?.configDesc}</p>
                                </div>
                            </div>
                        </motion.div>
                        );
                    })()}

                    {/* STEP 4 : ACTIVE PLAY */}
                    {step === 4 && (
                        <motion.div key="step4" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                            {isLoading ? (
                                <div className="qz-center-state">
                                    <div className="qz-loader-ring"/>
                                    <h2 className="qz-state-title">
                                        {language === 'fr' ? 'Génération IA en cours…' : 'AI generation in progress…'}
                                    </h2>
                                    <p className="qz-state-sub">
                                        {targetSystemLabel
                                            ? (language === 'fr'
                                                ? `Questions exclusives sur "${targetSystemLabel}" — analyse anatomique en cours.`
                                                : `Exclusive questions on "${targetSystemLabel}" — anatomical analysis in progress.`)
                                            : (language === 'fr'
                                                ? 'Analyse des structures anatomiques et création de cas cliniques.'
                                                : 'Analyzing anatomical structures and building clinical cases.')
                                        }
                                    </p>
                                </div>
                            ) : error ? (
                                <div className="qz-center-state">
                                    <XCircle size={60} className="qz-error-icon"/>
                                    <h2 className="qz-state-title">
                                        {language === 'fr' ? 'Échec de génération' : 'Generation failed'}
                                    </h2>
                                    <p className="qz-state-sub">{error}</p>
                                    <button className="qz-retry-btn" onClick={reset}>
                                        {language === 'fr' ? 'Réessayer' : 'Try again'}
                                    </button>
                                </div>
                            ) : (
                                <div className="qz-play-wrapper">
                                    {/* Progress bar */}
                                    <div className="qz-play-topbar">
                                        <span className="qz-q-counter">
                                            {language === 'fr' ? 'Question' : 'Question'} {currentIdx + 1} / {questions.length}
                                        </span>
                                        {targetSystemLabel && (
                                            <span className="qz-target-badge">{targetSystemLabel}</span>
                                        )}
                                        <div className="qz-progress-track">
                                            <div
                                                className="qz-progress-fill"
                                                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Question text */}
                                    <p className="qz-question-text">{questions[currentIdx].text}</p>

                                    {/* Answers */}
                                    {quizType === 'OPEN' ? (
                                        <textarea
                                            className="qz-open-textarea"
                                            value={textAnswer}
                                            onChange={e => setTextAnswer(e.target.value)}
                                            placeholder={language === 'fr' ? 'Rédigez votre réponse ici…' : 'Write your answer here…'}
                                        />
                                    ) : quizType === 'MCQ_MULTI' ? (
                                        <div className="qz-options-grid">
                                            {questions[currentIdx].options?.map((opt, i) => (
                                                <button
                                                    key={i}
                                                    className={`qz-option-btn${selectedOpts.includes(i) ? ' qz-selected' : ''}`}
                                                    onClick={() => {
                                                        if (selectedOpts.includes(i)) {
                                                            setSelectedOpts(selectedOpts.filter(x => x !== i));
                                                        } else {
                                                            setSelectedOpts([...selectedOpts, i]);
                                                        }
                                                    }}
                                                >
                                                    <div className="qz-opt-multi-box">
                                                        {selectedOpts.includes(i) && <CheckCircle2 size={16} />}
                                                    </div>
                                                    <span className="qz-opt-text">{opt}</span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="qz-options-grid">
                                            {questions[currentIdx].options?.map((opt, i) => (
                                                <button
                                                    key={i}
                                                    className="qz-option-btn"
                                                    onClick={() => handleAnswer(i)}
                                                >
                                                    <span className="qz-opt-letter">{String.fromCharCode(65 + i)}</span>
                                                    <span className="qz-opt-text">{opt}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {(quizType === 'OPEN' || quizType === 'MCQ_MULTI') && (
                                        <button
                                            className="qz-next-btn"
                                            onClick={() => {
                                                const finalAns = quizType === 'OPEN' ? textAnswer : selectedOpts;
                                                handleAnswer(finalAns);
                                            }}
                                            disabled={
                                                (quizType === 'OPEN' && !textAnswer.trim()) ||
                                                (quizType === 'MCQ_MULTI' && selectedOpts.length === 0)
                                            }
                                        >
                                            {currentIdx === questions.length - 1
                                                ? (language === 'fr' ? 'Terminer l\'examen' : 'Finish exam')
                                                : (language === 'fr' ? 'Question suivante →' : 'Next question →')}
                                        </button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 5 : RESULTS */}
                    {step === 5 && (() => {
                        const pct = Math.round((results.correct / results.total) * 100);
                        const rawScore = (results.correct / results.total) * 20;
                        const scoreOn20 = rawScore % 1 === 0 ? rawScore.toString() : rawScore.toFixed(1);
                        
                        const getMessage = () => {
                            const val = parseFloat(scoreOn20);
                            if (language === 'fr') {
                                if (val >= 18) return { title: "Excellent", emoji: "🏆", sub: "Expertise anatomique exceptionnelle.", color: "#34d399" };
                                if (val >= 16) return { title: "Très Bien", emoji: "🔥", sub: "Maîtrise avancée des structures.", color: "#10b981" };
                                if (val >= 14) return { title: "Bien", emoji: "✨", sub: "Bonne compréhension de la région.", color: "#0ea5e9" };
                                if (val >= 12) return { title: "Assez Bien", emoji: "👍", sub: "Des bases solides à consolider.", color: "#fbbf24" };
                                if (val >= 10) return { title: "Passable", emoji: "📚", sub: "Le strict minimum est acquis.", color: "#f97316" };
                                return { title: "Médiocre", emoji: "🧐", sub: "Besoin de revoir les fondamentaux.", color: "#f87171" };
                            } else {
                                if (val >= 18) return { title: "Excellent", emoji: "🏆", sub: "Outstanding anatomical expertise.", color: "#34d399" };
                                if (val >= 16) return { title: "Very Good", emoji: "🔥", sub: "Advanced mastery of structures.", color: "#10b981" };
                                if (val >= 14) return { title: "Good", emoji: "✨", sub: "Good understanding of the region.", color: "#0ea5e9" };
                                if (val >= 12) return { title: "Satisfactory", emoji: "👍", sub: "Solid foundations to reinforce.", color: "#fbbf24" };
                                if (val >= 10) return { title: "Passable", emoji: "📚", sub: "The bare minimum is acquired.", color: "#f97316" };
                                return { title: "Mediocre", emoji: "🧐", sub: "Need to review the fundamentals.", color: "#f87171" };
                            }
                        };
                        const feed = getMessage();

                        return (
                        <motion.div key="step5" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="qz-results-page">


                            <div className="qz-results-main-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', width: '100%', marginBottom: '40px' }}>
                                {/* Left Col: Actions & Stats */}
                                <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                        <div className="qz-results-hero-badge" style={{ marginBottom: 0 }}>
                                            <span className="qz-pulse-dot"></span>
                                            {language === 'fr' ? 'Diagnostic IA Finalisé' : 'AI Diagnostic Finalized'}
                                        </div>
                                        
                                        <div className="qz-results-actions-inline" style={{ margin: 0 }}>
                                            <button className="qz-restart-btn primary" onClick={reset} style={{ padding: '8px 20px', minWidth: 'auto', fontSize: '13px' }}>
                                                <RotateCcw size={16}/>
                                                {language === 'fr' ? 'Nouveau' : 'New'}
                                            </button>
                                            
                                            <button className="qz-restart-btn primary" onClick={handleRetake} style={{ padding: '8px 20px', minWidth: 'auto', fontSize: '13px' }}>
                                                <RotateCcw size={16}/>
                                                {language === 'fr' ? "Reinit Tout" : "Retry All"}
                                            </button>

                                            {results.correct < results.total && (
                                                <button className="qz-restart-btn secondary" onClick={handleRetakeMissed} style={{ padding: '8px 20px', minWidth: 'auto', fontSize: '13px' }}>
                                                    <AlertCircle size={16}/>
                                                    {language === 'fr' ? 'Réviser erreurs' : 'Review Errors'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                        <div className="qz-stats-row" style={{ marginTop: '15px', marginBottom: '8px', display: 'flex', gap: '8px' }}>
                                            <span className="qz-stat-pill correct" style={{ padding: '4px 10px', fontSize: '11px' }}>
                                                <CheckCircle2 size={12} /> {results.correct} {language === 'fr' ? 'correctes' : 'correct'}
                                            </span>
                                            <span className="qz-stat-pill wrong" style={{ padding: '4px 10px', fontSize: '11px' }}>
                                                <XCircle size={12} /> {results.total - results.correct} {language === 'fr' ? 'incorrectes' : 'incorrect'}
                                            </span>
                                        </div>
                                        <p className="qz-results-hero-subtitle" style={{ fontSize: '12px', margin: 0 }}>{feed.sub}</p>
                                    </div>

                                {/* Middle Col: Message */}
                                <div style={{ flex: 1, textAlign: 'center' }}>
                                    <h1 className="qz-results-hero-title" style={{ color: feed.color, margin: 0, fontSize: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                        {feed.title}
                                        <span style={{ fontSize: '2em', lineHeight: 1 }}>{feed.emoji}</span>
                                    </h1>
                                </div>




                                {/* Right Col: Note */}
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                    <div className="qz-score-ring big" style={{ width: '160px', height: '160px' }}>
                                        <svg width="100%" height="100%" viewBox="0 0 240 240">
                                            <circle className="qz-score-ring-track" cx="120" cy="120" r="100"/>
                                            <circle
                                                className="qz-score-ring-fill"
                                                cx="120" cy="120" r="100"
                                                stroke={feed.color}
                                                style={{ filter: `drop-shadow(0 0 12px ${feed.color}66)` }}
                                                strokeDasharray={2 * Math.PI * 100}
                                                strokeDashoffset={(2 * Math.PI * 100) - (pct / 100) * (2 * Math.PI * 100)}
                                            />
                                        </svg>
                                        <div className="qz-score-ring-label">
                                            <span className="qz-score-pct">{scoreOn20}<span>/20</span></span>
                                            <span className="qz-score-sub">{results.correct} {language === 'fr' ? 'sur' : 'of'} {results.total}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section breakdown */}
                            <div className="qz-results-section-divider">
                                <span>{language === 'fr' ? 'Détails du Bilan' : 'Detailed Assessment'}</span>
                            </div>

                            <div className="qz-breakdown-table-container">
                                <table className="qz-breakdown-table">
                                    <thead>
                                        <tr>
                                            <th>{language === 'fr' ? '#' : '#'}</th>
                                            <th>{language === 'fr' ? 'Question' : 'Question'}</th>
                                            <th>{language === 'fr' ? 'Votre réponse' : 'Your answer'}</th>
                                            <th>{language === 'fr' ? 'Bonne réponse' : 'Correct answer'}</th>
                                            <th>{language === 'fr' ? 'Statut' : 'Status'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {questions.map((q, i) => (
                                            <tr key={i} className={q.isCorrect ? 'qz-row-correct' : 'qz-row-wrong'}>
                                                <td className="qz-cell-num">{i + 1}</td>
                                                <td className="qz-cell-question">{q.text}</td>
                                                <td className={`qz-cell-answer ${q.isCorrect ? 'qz-ans-ok' : 'qz-ans-ko'}`}>{formatUserAnswer(q)}</td>
                                                <td className="qz-cell-correct qz-ans-ok">{formatCorrectAnswer(q)}</td>
                                                <td className="qz-cell-status">
                                                    {q.isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                        );
                    })()}
                </AnimatePresence>
            </div>
        </Layout>
    );
};

export default Quiz;


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, 
    XCircle,
    RotateCcw,
} from 'lucide-react';


import Layout from '../components/layouts/App';
import { ollamaService } from '../services/ollama';
import { useLanguage } from '../contexts/LanguageContext';
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

    const [step, setStep] = useState(1);
    const [quizType, setQuizType] = useState<string | null>(null);
    const [questionCount, setQuestionCount] = useState(10);
    const [immediateReveal, setImmediateReveal] = useState(false);

    // Restore state from URL hash on initial load (e.g. after page refresh)
    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        const matchedType = HASH_TO_TYPE[hash];
        if (matchedType) {
            setQuizType(matchedType);
            setStep(2);
        }
    }, []);

    const [isLoading, setIsLoading] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
    const [selectedOpts, setSelectedOpts] = useState<number[]>([]);
    const [textAnswer, setTextAnswer] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState({ correct: 0, total: 0 });

    const handleStart = async () => {
        setStep(4);
        setIsLoading(true);
        setError(null);
        try {
            let lang = language === 'fr' ? 'French' : 'English';
            let format = quizType === 'MCQ' ? "JSON: [{text, options[4], correctAnswer(0-3), explanation}]" :
                         quizType === 'MCQ_MULTI' ? "JSON: [{text, options[4], correctAnswer(array of indices 0-3), explanation}]" :
                         quizType === 'TRUE_FALSE' ? "JSON: [{text, options:['True','False'], correctAnswer(0-1), explanation}]" :
                         "JSON: [{text, correctAnswer(string), explanation}]";

            const prompt = `Medical Anatomy Quiz. Language: ${lang}. Type: ${quizType}. Count: ${questionCount}. ${format}. Clinical level. Raw JSON array only.`;
            const response = await ollamaService.generate('phi3:latest', prompt);
            
            const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                setQuestions(parsed.map((q: any, i: number) => ({ id: i + 1, ...q })));
            } else {
                throw new Error("Invalid format");
            }
        } catch (err) {
            setError(language === 'fr' ? "Erreur de génération par l'IA." : "AI Generation Error.");
        } finally { setIsLoading(false); }
    };

    const handleAnswer = (val: any) => {
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

        if (currentIdx < questions.length - 1) {
            setCurrentIdx(currentIdx + 1);
            setSelectedOpt(null);
            setSelectedOpts([]);
            setTextAnswer('');
        } else {
            const score = updated.filter(x => x.isCorrect).length;
            setResults({ correct: score, total: updated.length });
            setStep(5);
        }
    };

    const reset = () => {
        setStep(1);
        setQuizType(null);
        setQuestions([]);
        setCurrentIdx(0);
        setResults({ correct: 0, total: 0 });
        setSelectedOpts([]);
        setSelectedOpt(null);
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
                                <h1>{language === 'fr' ? "Paramétrez votre évaluation" : "Configure your evaluation"}</h1>
                                <p>{language === 'fr' ? "Choisissez le format de test généré sur-mesure par notre IA en fonction de votre cursus." : "Choose the test format custom-generated by our AI based on your curriculum."}</p>
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
                                    {language === 'fr' ? 'Configuration de l’examen' : 'Examination settings'}
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

                                {/* Reveal mode toggle */}
                                <div className="qz-reveal-block">
                                    <p className="qz-reveal-label">
                                        {language === 'fr' ? 'Correction des réponses' : 'Answer correction'}
                                    </p>
                                    <div className="qz-reveal-toggle">
                                        <button
                                            className={`qz-reveal-opt${!immediateReveal ? ' active' : ''}`}
                                            onClick={() => setImmediateReveal(false)}
                                        >
                                            {language === 'fr' ? 'À la fin' : 'At the end'}
                                        </button>
                                        <button
                                            className={`qz-reveal-opt${immediateReveal ? ' active' : ''}`}
                                            onClick={() => setImmediateReveal(true)}
                                        >
                                            {language === 'fr' ? 'Instantanée' : 'Instant'}
                                        </button>
                                    </div>
                                    <p className="qz-reveal-hint">
                                        {immediateReveal
                                            ? (language === 'fr' ? "La bonne réponse s'affiche après chaque question." : 'The correct answer is shown after each question.')
                                            : (language === 'fr' ? "Le bilan complet apparaît en fin d'examen." : 'The full results appear at the end of the exam.')}
                                    </p>
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
                                        {language === 'fr'
                                            ? 'Analyse des structures anatomiques et création de cas cliniques.'
                                            : 'Analyzing anatomical structures and building clinical cases.'}
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
                                                    className={`qz-option-btn${selectedOpt === i ? ' qz-selected' : ''}`}
                                                    onClick={() => setSelectedOpt(i)}
                                                >
                                                    <span className="qz-opt-letter">{String.fromCharCode(65 + i)}</span>
                                                    <span className="qz-opt-text">{opt}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Next / Submit */}
                                    <button
                                        className="qz-next-btn"
                                        onClick={() => {
                                            const finalAns = quizType === 'OPEN' ? textAnswer :
                                                            quizType === 'MCQ_MULTI' ? selectedOpts :
                                                            (selectedOpt ?? '');
                                            handleAnswer(finalAns);
                                        }}
                                        disabled={
                                            (quizType === 'OPEN' && !textAnswer.trim()) ||
                                            (quizType === 'MCQ_MULTI' && selectedOpts.length === 0) ||
                                            (quizType !== 'OPEN' && quizType !== 'MCQ_MULTI' && selectedOpt === null)
                                        }
                                    >
                                        {currentIdx === questions.length - 1
                                            ? (language === 'fr' ? 'Valider l\'examen' : 'Submit Exam')
                                            : (language === 'fr' ? 'Question suivante →' : 'Next Question →')
                                        }
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 5 : RESULTS */}
                    {step === 5 && (() => {
                        const pct = Math.round((results.correct / results.total) * 100);
                        const r = 80; const circ = 2 * Math.PI * r;
                        const offset = circ - (pct / 100) * circ;
                        return (
                        <motion.div key="step5" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="qz-results-page">
                            {/* Hero */}
                            <div className="qz-results-hero">
                                <h1 className="qz-results-hero-title">
                                    {language === 'fr' ? 'Bilan IA de vos connaissances' : 'AI Knowledge Assessment'}
                                </h1>

                                {/* Animated SVG ring */}
                                <div className="qz-score-ring">
                                    <svg width="180" height="180" viewBox="0 0 180 180">
                                        <circle className="qz-score-ring-track" cx="90" cy="90" r={r}/>
                                        <circle
                                            className="qz-score-ring-fill"
                                            cx="90" cy="90" r={r}
                                            strokeDasharray={circ}
                                            strokeDashoffset={offset}
                                        />
                                    </svg>
                                    <div className="qz-score-ring-label">
                                        <span className="qz-score-pct">{pct}<span>%</span></span>
                                        <span className="qz-score-sub">{results.correct}/{results.total}</span>
                                    </div>
                                </div>

                                {/* Stats pills */}
                                <div className="qz-stats-row">
                                    <span className="qz-stat-pill correct">
                                        <CheckCircle2 size={14}/> {results.correct} {language === 'fr' ? 'correctes' : 'correct'}
                                    </span>
                                    <span className="qz-stat-pill wrong">
                                        <XCircle size={14}/> {results.total - results.correct} {language === 'fr' ? 'incorrectes' : 'incorrect'}
                                    </span>
                                </div>
                            </div>

                            {/* Breakdown */}
                            <div className="qz-breakdown">
                                {questions.map((q, i) => (
                                    <div key={i} className={`qz-bk-card ${q.isCorrect ? 'is-correct' : 'is-wrong'}`}>
                                        <div className="qz-bk-header">
                                            {q.isCorrect ? <CheckCircle2 size={16}/> : <XCircle size={16}/>}
                                            {language === 'fr' ? 'Question' : 'Question'} {i + 1}
                                        </div>
                                        <p className="qz-bk-question">{q.text}</p>
                                        {!q.isCorrect && (
                                            <div className="qz-bk-correction">
                                                <strong>{language === 'fr' ? 'Réponse attendue : ' : 'Expected answer: '}</strong>
                                                {typeof q.correctAnswer === 'number' ? q.options?.[q.correctAnswer] : q.correctAnswer}
                                            </div>
                                        )}
                                        {q.explanation && (
                                            <div className="qz-bk-explanation">
                                                <strong>{language === 'fr' ? 'Explication IA' : 'AI Explanation'}</strong>
                                                {q.explanation}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="qz-results-actions">
                                <button className="qz-restart-btn" onClick={reset}>
                                    <RotateCcw size={16}/>
                                    {language === 'fr' ? 'Nouvelle session' : 'New session'}
                                </button>
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


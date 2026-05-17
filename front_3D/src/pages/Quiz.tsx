import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, 
    XCircle,
    RotateCcw,
    AlertCircle,
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
    const [showFeedback, setShowFeedback] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [masterQuestions, setMasterQuestions] = useState<Question[]>([]);

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
        setShowFeedback(false);
        try {
            let lang = language === 'fr' ? 'French' : 'English';
            let tfOpts = language === 'fr' ? "['Vrai','Faux']" : "['True','False']";
            let format = "";
            if (quizType === 'MCQ') {
                format = "STRICT MCQ: 4 options exactly. correctAnswer:number (0-3). [{text, options, correctAnswer, explanation}]";
            } else if (quizType === 'MCQ_MULTI') {
                format = "STRICT MULTI-MCQ: 4 options. correctAnswer:number_array (e.g. [0,2]). [{text, options, correctAnswer, explanation}]";
            } else if (quizType === 'TRUE_FALSE') {
                format = `STRICT TRUE/FALSE: 2 options ${tfOpts}. correctAnswer:number (0 or 1). [{text, options, correctAnswer, explanation}]`;
            } else {
                format = "STRICT OPEN QUESTION: NO options array. NO numeric index. correctAnswer MUST BE A STRING (the name of the structure). [{text, correctAnswer:string, explanation}]";
            }

            const prompt = `CRITICAL: OUTPUT MUST BE A VALID JSON ARRAY ONLY. NO COMMENTS. NO EXPLANATIONS OUTSIDE JSON.
                            Anatomy Quiz in ${lang.toUpperCase()}. 
                            Format: ${format}. 
                            Count: ${questionCount}.
                            JSON Schema: [{"text": "...", "options": ["..."], "correctAnswer": 0, "explanation": "..."}]
                            RESPONSE MUST START WITH [ AND END WITH ].`;
            const response = await ollamaService.generate('phi3:latest', prompt);
            
            // Extraction ULTRA-ROBUSTE du JSON
            let parsedData = null;
            let rawJson = response.trim();
            
            // Nettoyage atomique avant tentative
            const cleanString = (str: string) => {
                let cleaned = str
                    .replace(/\/\/.*/g, "") // Supprime les commentaires //
                    .replace(/\/\*[\s\S]*?\*\//g, "") // Supprime les commentaires /* */
                    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Caractères de contrôle
                    .replace(/"\w+":\s*,/g, "") // Supprime les clés vides hallucinnées
                    .replace(/,\s*([\]\}])/g, "$1"); // Virgules traînantes
                
                // Gestion de la troncation : si ça finit mal (ex: coupure réseau), on sauve ce qui est complet
                if (!cleaned.endsWith(']') && !cleaned.endsWith('}')) {
                    const lastBrace = cleaned.lastIndexOf('}');
                    if (lastBrace !== -1) {
                        cleaned = cleaned.substring(0, lastBrace + 1);
                        if (!cleaned.endsWith(']')) cleaned += ']';
                        if (!cleaned.startsWith('[')) cleaned = '[' + cleaned;
                    }
                }
                return cleaned;
            };

            try {
                parsedData = JSON.parse(cleanString(rawJson));
            } catch (e) {
                const jsonMatch = rawJson.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    try {
                        parsedData = JSON.parse(cleanString(jsonMatch[0]));
                    } catch (e2) {
                        console.error("Final parse attempt failed", e2);
                        // Tentative de secours : extraire les objets individuellement via regex
                        const objects = cleanString(jsonMatch[0]).match(/\{[\s\S]*?\}/g);
                        if (objects) {
                            parsedData = objects.map(objStr => {
                                try { return JSON.parse(objStr); } catch { return null; }
                            }).filter(x => x !== null);
                        }
                    }
                }
            }

            if (!parsedData) {
                console.error("AI Response was not valid JSON:", response);
                throw new Error("Invalid format");
            }

            // Extraction du tableau
            const questionsArray = Array.isArray(parsedData) ? parsedData : (parsedData.quiz || []);
            console.log("🧩 [AI_PARSED_ARRAY]:", questionsArray);
            
            if (questionsArray.length > 0) {
                const finalQuestions = questionsArray.map((q: any, i: number) => {
                    // Sécurisation stricte des options selon le type de quiz choisi
                    let defaultOpts = ["Option A", "Option B", "Option C", "Option D"];
                    if (quizType === 'TRUE_FALSE') {
                        defaultOpts = language === 'fr' ? ["Vrai", "Faux"] : ["True", "False"];
                    }
                    
                    return {
                        id: i + 1,
                        text: q.text || q.question || "Description anatomique...",
                        options: q.options || defaultOpts,
                        correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : (q.answer || 0),
                        explanation: q.explanation || ""
                    };
                });
                console.log("💎 [FINAL_QUIZ_READY]:", finalQuestions);
                setQuestions(finalQuestions);
                setMasterQuestions(finalQuestions);
                setIsReviewMode(false);
            } else {
                throw new Error("Empty quiz array");
            }
        } catch (err: any) {
            console.error("Quiz Start Error:", err);
            setError(language === 'fr' ? `Erreur: ${err.message || "IA Indisponible"}` : `Error: ${err.message || "AI Unavailable"}`);
        } finally { setIsLoading(false); }
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

        if (immediateReveal) {
            setShowFeedback(true);
        } else {
            proceedToNext(updated);
        }
    };

    const proceedToNext = (currentQuestions: Question[]) => {
        if (currentIdx < currentQuestions.length - 1) {
            setCurrentIdx(currentIdx + 1);
            setSelectedOpt(null);
            setSelectedOpts([]);
            setTextAnswer('');
            setShowFeedback(false);
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
            }

            const score = finalSet.filter(x => x.isCorrect).length;
            setResults({ correct: score, total: finalSet.length });
            setStep(5);
            const typeLabel = types.find(t => t.id === quizType)?.label || '';
            navigate(`/quiz/#${slugify(typeLabel)}/result`, { replace: true });
        }
    };

    const handleRetake = () => {
        const resetQs = questions.map(q => ({ ...q, userAnswer: undefined, isCorrect: undefined }));
        setQuestions(resetQs);
        setCurrentIdx(0);
        setResults({ correct: 0, total: resetQs.length });
        setSelectedOpt(null);
        setSelectedOpts([]);
        setTextAnswer('');
        setShowFeedback(false);
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
        setSelectedOpt(null);
        setSelectedOpts([]);
        setTextAnswer('');
        setShowFeedback(false);
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
        setSelectedOpt(null);
        setTextAnswer('');
        setShowFeedback(false);
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
                                            disabled={showFeedback}
                                            placeholder={language === 'fr' ? 'Rédigez votre réponse ici…' : 'Write your answer here…'}
                                        />
                                    ) : quizType === 'MCQ_MULTI' ? (
                                        <div className="qz-options-grid">
                                            {questions[currentIdx].options?.map((opt, i) => (
                                                <button
                                                    key={i}
                                                    disabled={showFeedback}
                                                    className={`qz-option-btn${selectedOpts.includes(i) ? ' qz-selected' : ''}`}
                                                    onClick={() => {
                                                        if (showFeedback) return;
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
                                                    disabled={showFeedback}
                                                    className={`qz-option-btn${selectedOpt === i ? ' qz-selected' : ''}`}
                                                    onClick={() => {
                                                        setSelectedOpt(i);
                                                        if (immediateReveal) handleAnswer(i);
                                                    }}
                                                >
                                                    <span className="qz-opt-letter">{String.fromCharCode(65 + i)}</span>
                                                    <span className="qz-opt-text">{opt}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Explanation for Immediate Reveal */}
                                    <AnimatePresence>
                                        {showFeedback && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`qz-immediate-feedback ${questions[currentIdx].isCorrect ? 'is-correct' : 'is-wrong'}`}
                                            >
                                                <div className="qz-fb-header">
                                                    {questions[currentIdx].isCorrect ? <CheckCircle2 size={18}/> : <XCircle size={18}/>}
                                                    <strong>{questions[currentIdx].isCorrect 
                                                        ? (language === 'fr' ? 'Excellent !' : 'Excellent!') 
                                                        : (language === 'fr' ? 'Incorrect' : 'Incorrect')}</strong>
                                                </div>
                                                
                                                {!questions[currentIdx].isCorrect && (
                                                    <p className="qz-fb-correction">
                                                        {language === 'fr' ? 'La bonne réponse était : ' : 'The correct answer was: '}
                                                        <strong>{typeof questions[currentIdx].correctAnswer === 'number' 
                                                            ? questions[currentIdx].options?.[questions[currentIdx].correctAnswer as number]
                                                            : questions[currentIdx].correctAnswer}</strong>
                                                    </p>
                                                )}

                                                {questions[currentIdx].explanation && (
                                                    <div className="qz-fb-explanation">
                                                        {questions[currentIdx].explanation}
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Next / Submit */}
                                    <button
                                        className="qz-next-btn"
                                        onClick={() => {
                                            if (showFeedback) {
                                                proceedToNext(questions);
                                            } else {
                                                const finalAns = quizType === 'OPEN' ? textAnswer :
                                                                quizType === 'MCQ_MULTI' ? selectedOpts :
                                                                (selectedOpt ?? '');
                                                handleAnswer(finalAns);
                                            }
                                        }}
                                        disabled={
                                            !showFeedback && (
                                                (quizType === 'OPEN' && !textAnswer.trim()) ||
                                                (quizType === 'MCQ_MULTI' && selectedOpts.length === 0) ||
                                                (quizType !== 'OPEN' && quizType !== 'MCQ_MULTI' && selectedOpt === null)
                                            )
                                        }
                                    >
                                        {showFeedback 
                                            ? (currentIdx === questions.length - 1 
                                                ? (language === 'fr' ? 'Voir le bilan final' : 'See final results') 
                                                : (language === 'fr' ? 'Question suivante →' : 'Next Question →'))
                                            : (currentIdx === questions.length - 1
                                                ? (language === 'fr' ? 'Valider l\'examen' : 'Submit Exam')
                                                : (language === 'fr' ? 'Valider la réponse' : 'Validate answer'))
                                        }
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 5 : RESULTS */}
                    {step === 5 && (() => {
                        const pct = Math.round((results.correct / results.total) * 100);
                        const scoreOn20 = ((results.correct / results.total) * 20).toFixed(1);
                        
                        const getMessage = () => {
                            const val = parseFloat(scoreOn20);
                            if (language === 'fr') {
                                if (val >= 18) return { title: "Excellent", sub: "Expertise anatomique exceptionnelle.", color: "#34d399" };
                                if (val >= 16) return { title: "Très Bien", sub: "Maîtrise avancée des structures.", color: "#10b981" };
                                if (val >= 14) return { title: "Bien", sub: "Bonne compréhension de la région.", color: "#0ea5e9" };
                                if (val >= 12) return { title: "Assez Bien", sub: "Des bases solides à consolider.", color: "#fbbf24" };
                                if (val >= 10) return { title: "Passable", sub: "Le strict minimum est acquis.", color: "#f97316" };
                                return { title: "Médiocre", sub: "Besoin de revoir les fondamentaux.", color: "#f87171" };
                            } else {
                                if (val >= 18) return { title: "Excellent", sub: "Outstanding anatomical expertise.", color: "#34d399" };
                                if (val >= 16) return { title: "Very Good", sub: "Advanced mastery of structures.", color: "#10b981" };
                                if (val >= 14) return { title: "Good", sub: "Good understanding of the region.", color: "#0ea5e9" };
                                if (val >= 12) return { title: "Satisfactory", sub: "Solid foundations to reinforce.", color: "#fbbf24" };
                                if (val >= 10) return { title: "Passable", sub: "The bare minimum is acquired.", color: "#f97316" };
                                return { title: "Mediocre", sub: "Need to review the fundamentals.", color: "#f87171" };
                            }
                        };
                        const feed = getMessage();

                        return (
                        <motion.div key="step5" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="qz-results-page">
                            <div className="qz-results-main-row">
                                {/* Left: Info and Actions */}
                                <div className="qz-results-info-col">
                                    <div className="qz-results-hero-badge">
                                        <span className="qz-pulse-dot"></span>
                                        {language === 'fr' ? 'Diagnostic IA Finalisé' : 'AI Diagnostic Finalized'}
                                    </div>
                                    <h1 className="qz-results-hero-title" style={{ color: feed.color }}>
                                        {feed.title}
                                    </h1>
                                    <p className="qz-results-hero-subtitle">{feed.sub}</p>
                                    
                                    <div className="qz-stats-row">
                                        <span className="qz-stat-pill correct">
                                            <CheckCircle2 size={14}/> {results.correct} {language === 'fr' ? 'correctes' : 'correct'}
                                        </span>
                                        <span className="qz-stat-pill wrong">
                                            <XCircle size={14}/> {results.total - results.correct} {language === 'fr' ? 'incorrectes' : 'incorrect'}
                                        </span>
                                    </div>

                                    <div className="qz-results-actions-inline">
                                        <button className="qz-restart-btn primary" onClick={reset}>
                                            <RotateCcw size={18}/>
                                            {language === 'fr' ? 'Nouveau' : 'New'}
                                        </button>
                                        
                                        {results.correct < results.total && (
                                            <button className="qz-restart-btn secondary" onClick={handleRetakeMissed}>
                                                <AlertCircle size={18}/>
                                                {language === 'fr' ? 'Réviser erreurs' : 'Review Errors'}
                                            </button>
                                        )}

                                        <button className="qz-restart-btn ghost" onClick={handleRetake}>
                                            {language === 'fr' ? "Reinit Tout" : "Retry All"}
                                        </button>
                                    </div>
                                </div>

                                {/* Right: The Score Ring */}
                                <div className="qz-results-score-col">
                                    <div className="qz-score-ring big">
                                        <svg width="240" height="240" viewBox="0 0 240 240">
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

                            <div className="qz-breakdown">
                                {questions.map((q, i) => (
                                    <div key={i} className={`qz-bk-card ${q.isCorrect ? 'is-correct' : 'is-wrong'}`}>
                                        <div className="qz-bk-status-icon">
                                            {q.isCorrect ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                                        </div>
                                        <div className="qz-bk-header">
                                            {language === 'fr' ? 'Question' : 'Question'} {i + 1}
                                        </div>
                                        <p className="qz-bk-question">{q.text}</p>
                                        
                                        <div className="qz-bk-correction">
                                            <strong>{language === 'fr' ? 'Réponse : ' : 'Answer: '}</strong>
                                            {typeof q.correctAnswer === 'number' 
                                                ? (Array.isArray(q.correctAnswer) 
                                                    ? q.correctAnswer.map((idx: number) => q.options?.[idx]).join(', ')
                                                    : q.options?.[q.correctAnswer])
                                                : q.correctAnswer}
                                        </div>

                                        {q.explanation && (
                                            <div className="qz-bk-explanation">
                                                <strong>{language === 'fr' ? 'Explication' : 'Explanation'}</strong>
                                                {q.explanation}
                                            </div>
                                        )}
                                    </div>
                                ))}
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


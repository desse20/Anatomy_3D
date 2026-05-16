import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronRight, 
    ArrowLeft, 
    Zap, 
    Target, 
    MessageSquare, 
    Settings2, 
    Loader2, 
    CheckCircle2, 
    XCircle,
    RotateCcw,
    Trophy
} from 'lucide-react';
import Layout from '../components/layouts/App';
import { ollamaService } from '../services/ollama';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/quiz.css';

interface Question {
    id: number;
    text: string;
    options?: string[];
    correctAnswer: string | number;
    userAnswer?: string | number;
    isCorrect?: boolean;
    explanation?: string;
}

const Quiz: React.FC = () => {
    const { language } = useLanguage();
    
    // Steps: 1: Selection, 2: Intensity, 3: Start, 4: Active, 5: Results
    const [step, setStep] = useState(1);
    const [quizType, setQuizType] = useState<'OPEN' | 'MCQ' | 'TRUE_FALSE' | null>(null);
    const [questionCount, setQuestionCount] = useState(5);
    
    const [isLoading, setIsLoading] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
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
            setError(language === 'fr' ? "Erreur IA" : "AI Error");
        } finally { setIsLoading(false); }
    };

    const handleAnswer = (val: string | number) => {
        const q = questions[currentIdx];
        let correct = false;
        if (typeof val === 'string') {
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
            setTextAnswer('');
        } else {
            const score = updated.filter(x => x.isCorrect).length;
            setResults({ correct: score, total: updated.length });
            setStep(5);
        }
    };

    const reset = () => {
        setStep(1);
        setQuestions([]);
        setCurrentIdx(0);
        setResults({ correct: 0, total: 0 });
    };

    const pageVariants = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    };

    return (
        <Layout breadcrumb="Quiz" title={language === 'fr' ? "Examen Médical IA" : "AI Medical Exam"}>
            <div className="quiz-container-v2">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="step1" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="quiz-step">
                            <div className="step-head">
                                <Zap size={40} className="glow-icon"/>
                                <h2>{language === 'fr' ? "Configurez votre examen" : "Configure your exam"}</h2>
                                <p>{language === 'fr' ? "Choisissez le format d'évaluation souhaité." : "Choose the desired evaluation format."}</p>
                            </div>
                            <div className="type-grid-v2">
                                {[
                                    { id: 'MCQ', icon: <Target/>, label: 'QCM', desc: 'Questions à choix multiples.' },
                                    { id: 'OPEN', icon: <MessageSquare/>, label: 'Questions Ouvertes', desc: 'Réponses libres et détaillées.' },
                                    { id: 'TRUE_FALSE', icon: <CheckCircle2/>, label: 'Vrai ou Faux', desc: 'Validation par affirmation.' }
                                ].map(t => (
                                    <button key={t.id} onClick={() => { setQuizType(t.id as any); setStep(2); }} className="type-card-v2">
                                        <div className="t-icon">{t.icon}</div>
                                        <div>
                                            <h4>{t.label}</h4>
                                            <p>{t.desc}</p>
                                        </div>
                                        <ChevronRight size={18}/>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="step2" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="quiz-step">
                            <button onClick={() => setStep(1)} className="btn-back-quiz"><ArrowLeft size={16}/> Back</button>
                            <div className="step-head">
                                <Settings2 size={40} className="glow-icon"/>
                                <h2>{language === 'fr' ? "Paramètres du test" : "Test Settings"}</h2>
                                <p>Type: <strong>{quizType}</strong></p>
                            </div>
                            <div className="param-card-v2">
                                <div className="param-label-v2">
                                    <span>{language === 'fr' ? "Nombre de questions" : "Number of questions"}</span>
                                    <strong>{questionCount}</strong>
                                </div>
                                <input type="range" min="1" max="20" value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))} />
                                <div className="range-marks"><span>1</span><span>20</span></div>
                            </div>
                            <button onClick={handleStart} className="btn-launch-v2">{language === 'fr' ? "Générer l'examen" : "Generate Exam"}</button>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div key="step4" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="quiz-active-v2">
                            {isLoading ? (
                                <div className="loader-v2">
                                    <Loader2 className="spin" size={60}/>
                                    <p>{language === 'fr' ? "L'IA prépare vos questions..." : "AI is preparing your questions..."}</p>
                                </div>
                            ) : error ? (
                                <div className="error-v2">
                                    <XCircle size={60}/>
                                    <p>{error}</p>
                                    <button onClick={reset}>{language === 'fr' ? "Réessayer" : "Try Again"}</button>
                                </div>
                            ) : (
                                <div className="question-wrap-v2">
                                    <div className="q-meta">
                                        <div className="q-badge">Question {currentIdx + 1} / {questions.length}</div>
                                        <div className="progress-bar-v2"><div className="progress-fill-v2" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}></div></div>
                                    </div>
                                    <h3>{questions[currentIdx].text}</h3>
                                    <div className="options-grid-v2">
                                        {quizType === 'OPEN' ? (
                                            <textarea value={textAnswer} onChange={e => setTextAnswer(e.target.value)} placeholder="Type your answer here..." />
                                        ) : (
                                            questions[currentIdx].options?.map((opt, i) => (
                                                <button key={i} className={`option-btn-v2 ${selectedOpt === i ? 'active' : ''}`} onClick={() => setSelectedOpt(i)}>
                                                    <span>{String.fromCharCode(65 + i)}</span> {opt}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                    <button 
                                        className="btn-next-v2" 
                                        onClick={() => handleAnswer(quizType === 'OPEN' ? textAnswer : (selectedOpt ?? ''))}
                                        disabled={quizType !== 'OPEN' && selectedOpt === null}
                                    >
                                        {currentIdx === questions.length - 1 ? (language === 'fr' ? 'Terminer' : 'Finish') : (language === 'fr' ? 'Suivant' : 'Next')}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {step === 5 && (
                        <motion.div key="step5" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="results-v2">
                            <div className="results-head-v2">
                                <Trophy size={60} className="trophy-v2"/>
                                <h2>{language === 'fr' ? "Examen Terminé" : "Exam Complete"}</h2>
                                <div className="score-circle-v2">
                                    <span className="sc-val">{results.correct}/{results.total}</span>
                                    <span className="sc-pct">{Math.round((results.correct / results.total) * 100)}%</span>
                                </div>
                            </div>
                            <div className="results-list-v2">
                                {questions.map((q, i) => (
                                    <div key={i} className={`res-item-v2 ${q.isCorrect ? 'correct' : 'wrong'}`}>
                                        <div className="res-stat-v2">{q.isCorrect ? <CheckCircle2 size={16}/> : <XCircle size={16}/>} Question {i+1}</div>
                                        <p>{q.text}</p>
                                        {!q.isCorrect && (
                                            <div className="res-correct-v2">
                                                <strong>Correct:</strong> {typeof q.correctAnswer === 'number' ? q.options?.[q.correctAnswer] : q.correctAnswer}
                                            </div>
                                        )}
                                        {q.explanation && <div className="res-explain-v2">{q.explanation}</div>}
                                    </div>
                                ))}
                            </div>
                            <button onClick={reset} className="btn-restart-v2"><RotateCcw size={18}/> {language === 'fr' ? "Recommencer" : "Restart"}</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Layout>
    );
};

export default Quiz;

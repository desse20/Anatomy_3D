import React, { useState } from 'react';
import { HelpCircle, X, ChevronDown, ChevronUp, BookOpen, Layers, Share2, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

interface FAQItem {
    questionFr: string;
    questionEn: string;
    answerFr: string;
    answerEn: string;
    icon: React.ReactNode;
    roles: string[]; // ['student', 'teacher', 'admin']
}

const FAQ_DATA: FAQItem[] = [
    // --- QUESTIONS POUR TOUS ---
    {
        questionFr: "🚀 Guide de démarrage : Par où commencer ?",
        questionEn: "🚀 Starter Guide: Where to begin?",
        answerFr: "Commencez par vous rendre dans l'Atlas (menu de gauche). Choisissez un modèle (ex: Squelette). Une fois chargé, vous pouvez explorer librement ou cliquer sur une pièce pour voir son nom et ses options.",
        answerEn: "Start by going to the Atlas (left menu). Choose a model (e.g., Skeleton). Once loaded, you can explore freely or click a part to see its name and options.",
        icon: <Layers size={18} className="text-blue-400" />,
        roles: ['student', 'teacher', 'admin']
    },
    {
        questionFr: "🖱️ Comment manipuler le modèle 3D ?",
        questionEn: "🖱️ How to manipulate the 3D model?",
        answerFr: "• Rotation : Clic gauche (ou 1 doigt)\n• Zoom : Molette (ou pincement)\n• Déplacement : Clic droit (ou 2 doigts)\n• Sélection : Clic simple sur un organe.",
        answerEn: "• Rotate: Left click (or 1 finger)\n• Zoom: Scroll wheel (or pinch)\n• Pan: Right click (or 2 fingers)\n• Select: Simple click on an organ.",
        icon: <Layers size={18} className="text-blue-400" />,
        roles: ['student', 'teacher', 'admin']
    },
    {
        questionFr: "👁️ Comment isoler ou masquer une partie ?",
        questionEn: "👁️ How to isolate or hide a part?",
        answerFr: "Une fois un organe sélectionné, une étiquette apparaît. Cliquez sur l'icône 'Cible' pour isoler uniquement cette pièce, ou sur 'l'œil barré' pour la masquer temporairement.",
        answerEn: "Once a part is selected, a label appears. Click the 'Target' icon to isolate only that part, or the 'crossed eye' to hide it temporarily.",
        icon: <BookOpen size={18} className="text-purple-400" />,
        roles: ['student', 'teacher', 'admin']
    },

    // --- QUESTIONS PROFESSEURS ---
    {
        questionFr: "👨‍🏫 Comment partager une vue à mes étudiants ?",
        questionEn: "👨‍🏫 How to share a view with my students?",
        answerFr: "Dans le visualiseur, positionnez la caméra et isolez les organes voulus, puis cliquez sur 'Partager'. Copiez le lien et envoyez-le à votre classe : ils verront exactement ce que vous avez préparé.",
        answerEn: "In the viewer, position the camera and isolate the desired organs, then click 'Share'. Copy the link and send it to your class: they will see exactly what you prepared.",
        icon: <Share2 size={18} className="text-orange-400" />,
        roles: ['teacher', 'admin']
    },
    {
        questionFr: "📊 Où suivre les résultats des étudiants ?",
        questionEn: "📊 Where to track student results?",
        answerFr: "Allez dans votre Tableau de Bord Enseignant. Vous y trouverez les statistiques de complétion des quiz et les scores moyens de vos groupes d'étudiants.",
        answerEn: "Go to your Teacher Dashboard. There you will find quiz completion statistics and average scores for your student groups.",
        icon: <BrainCircuit size={18} className="text-pink-400" />,
        roles: ['teacher', 'admin']
    },
    {
        questionFr: "🦴 C'est quoi l'Analyse des Objets ?",
        questionEn: "🦴 What is Object Analytics?",
        answerFr: "Cette vue vous permet de voir quels organes sont les plus consultés, cachés ou isolés par tous les utilisateurs. C'est idéal pour identifier les sujets qui posent difficulté.",
        answerEn: "This view allows you to see which organs are most viewed, hidden, or isolated by all users. It's ideal for identifying difficult topics.",
        icon: <Layers size={18} className="text-blue-500" />,
        roles: ['teacher', 'admin']
    },
    {
        questionFr: "👤 Comment analyser un profil étudiant ?",
        questionEn: "👤 How to analyze a student profile?",
        answerFr: "Dans la vue analytique utilisateur, vous avez accès à une timeline précise de son activité : temps passé sur chaque modèle, erreurs aux quiz et progression globale.",
        answerEn: "In the user analytics view, you have access to a precise timeline of their activity: time spent on each model, quiz errors, and overall progress.",
        icon: <BookOpen size={18} className="text-indigo-400" />,
        roles: ['teacher', 'admin']
    },
    {
        questionFr: "💬 Où gérer les avis et le chat IA ?",
        questionEn: "💬 Where to manage reviews and AI chat?",
        answerFr: "Les sections 'Avis' et 'Historique IA' vous permettent de modérer les retours de la plateforme et de consulter les questions les plus fréquentes posées au chatbot.",
        answerEn: "The 'Reviews' and 'AI History' sections allow you to moderate platform feedback and consult the most frequent questions asked to the chatbot.",
        icon: <Share2 size={18} className="text-green-400" />,
        roles: ['teacher', 'admin']
    },

    // --- QUESTIONS ETUDIANTS (AUSSI ACCESSIBLES AUX PROFS) ---
    {
        questionFr: "🎓 Comment tester mes connaissances ?",
        questionEn: "🎓 How to test your knowledge?",
        answerFr: "Allez dans la section 'Quiz'. L'IA générera des questions basées sur les modèles que vous avez consultés. Vous pouvez voir vos scores dans votre Profil.",
        answerEn: "Go to the 'Quiz' section. The AI will generate questions based on the models you viewed. You can check your scores in your Profile.",
        icon: <BrainCircuit size={18} className="text-emerald-400" />,
        roles: ['student', 'teacher', 'admin']
    },
    {
        questionFr: "📈 Où voir mes progrès ?",
        questionEn: "📈 Where to see my progress?",
        answerFr: "Cliquez sur votre profil en haut à droite. Vous y verrez votre niveau actuel, les badges gagnés et l'historique de vos activités récentes.",
        answerEn: "Click on your profile at the top right. You will see your current level, earned badges, and recent activity history.",
        icon: <Share2 size={18} className="text-orange-400" />,
        roles: ['student', 'teacher', 'admin']
    }
];

interface FloatingFAQProps {
    isOpen?: boolean;
    onToggle?: (open: boolean) => void;
}

const FloatingFAQ: React.FC<FloatingFAQProps> = ({ isOpen: propIsOpen, onToggle }) => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

    // Récupération du rôle utilisateur
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = user.role || 'student';

    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
    const setIsOpen = (val: boolean) => {
        if (onToggle) onToggle(val);
        else setInternalIsOpen(val);
    };

    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    // Filtrage des données selon le rôle
    const filteredFAQ = FAQ_DATA.filter(item => item.roles.includes(userRole));

    return (
        <div className="floating-faq-container">
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="faq-toggle-btn"
                        onClick={() => setIsOpen(true)}
                        title={t('Aide & Fonctionnalités', 'Help & Features')}
                    >
                        <HelpCircle size={24} />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: 100, opacity: 0, scale: 0.9 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        exit={{ x: 100, opacity: 0, scale: 0.9 }}
                        className="floating-faq-window"
                    >
                        <div className="faq-header">
                            <div className="faq-title">
                                {expandedIndex !== null ? (
                                    <button 
                                        className="back-btn" 
                                        onClick={() => setExpandedIndex(null)}
                                        style={{ background: 'none', border: 'none', color: 'white', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 0 }}
                                    >
                                        <ChevronDown size={18} style={{ transform: 'rotate(90deg)', marginRight: '8px' }} />
                                        <span>{t('Retour', 'Back')}</span>
                                    </button>
                                ) : (
                                    <>
                                        <HelpCircle size={16} />
                                        <span>{t('Centre d\'Aide', 'Help Center')}</span>
                                    </>
                                )}
                            </div>
                            <button className="close-btn" onClick={() => setIsOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="faq-content">
                            {expandedIndex === null && (
                                <p className="faq-intro">
                                    {t('Bienvenue ! Voici comment maîtriser Anatomy3D.', 'Welcome! Here is how to master Anatomy3D.')}
                                </p>
                            )}

                            <div className="faq-list">
                                {filteredFAQ.map((item, index) => (
                                    (expandedIndex === null || expandedIndex === index) && (
                                        <motion.div 
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={index} 
                                            className={`faq-item ${expandedIndex === index ? 'active focus-mode' : ''}`}
                                        >
                                            <button 
                                                className="faq-question"
                                                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                            >
                                                <div className="faq-question-inner">
                                                    <span className="faq-icon-wrapper">{item.icon}</span>
                                                    <span className="question-text">{t(item.questionFr, item.questionEn)}</span>
                                                </div>
                                                {expandedIndex === index ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                            <AnimatePresence>
                                                {expandedIndex === index && (
                                                    <motion.div 
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="faq-answer-wrapper"
                                                    >
                                                        <div className="faq-answer">
                                                            {t(item.answerFr, item.answerEn).split('\n').map((line, i) => (
                                                                <div key={i} style={{ marginBottom: line.startsWith('•') ? '4px' : '10px' }}>{line}</div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    )
                                ))}
                            </div>
                        </div>

                        <div className="faq-footer">
                            {t('Une autre question ? ', 'Other question? ')}
                            <a href="mailto:anatomy3d@gmail.com" className="contact-link">
                                {t('Contactez-nous', 'Contact us')}
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .floating-faq-container {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 10001;
                }
                .faq-toggle-btn {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .faq-toggle-btn:hover {
                    transform: scale(1.1) rotate(5deg);
                    background: #2563eb;
                }
                .floating-faq-window {
                    width: 320px;
                    background: #111827;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.6);
                    overflow: hidden;
                    margin-bottom: 70px;
                }
                .faq-header {
                    padding: 16px 20px;
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .faq-title {
                    font-weight: 700;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .close-btn {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .close-btn:hover { background: rgba(255, 255, 255, 0.3); }
                .faq-content {
                    padding: 20px;
                    max-height: 400px;
                    overflow-y: auto;
                }
                .faq-content::-webkit-scrollbar { width: 4px; }
                .faq-content::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                
                .faq-intro {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.5);
                    margin-bottom: 16px;
                }
                .faq-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .faq-item {
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.02);
                    transition: 0.2s;
                }
                .faq-item.active.focus-mode {
                    background: transparent;
                    border: none;
                }
                .faq-item.active.focus-mode .faq-question {
                    cursor: pointer;
                }
                .faq-item.active.focus-mode .faq-icon-wrapper {
                    background: rgba(59, 130, 246, 0.2);
                }
                .back-btn:hover {
                    opacity: 0.8;
                }
                .faq-question {
                    width: 100%;
                    padding: 12px 14px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: transparent;
                    border: none;
                    color: #f3f4f6;
                    font-size: 13px;
                    font-weight: 600;
                    text-align: left;
                    cursor: pointer;
                }
                .faq-question-inner {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .faq-icon-wrapper {
                    flex-shrink: 0;
                    width: 32px;
                    height: 32px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .question-text { line-height: 1.4; }
                .faq-answer-wrapper { overflow: hidden; }
                .faq-answer {
                    padding: 0 14px 14px 46px;
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.6);
                    line-height: 1.6;
                }
                .faq-footer {
                    padding: 12px 20px;
                    background: rgba(0, 0, 0, 0.2);
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.4);
                    text-align: center;
                }
                .contact-link {
                    color: #3b82f6;
                    text-decoration: none;
                    font-weight: 600;
                }
                .contact-link:hover { text-decoration: underline; }
            `}</style>
        </div>
    );
};

export default FloatingFAQ;

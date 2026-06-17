import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { MessageCircle, Star, Home, X, ChevronLeft } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

import { motion, AnimatePresence } from 'framer-motion';
import FloatingChat from './FloatingChat';
import FloatingReview from './FloatingReview';

const FloatingActionsDrawer: React.FC = () => {
    const { language } = useLanguage();
    const { theme } = useTheme();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;


    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'review'>('home');
    const [chatView, setChatView] = useState<'sessions' | 'chat'>('sessions');

    const toggleMessenger = () => {
        setIsOpen(!isOpen);
    };

    const handleBack = () => {
        if (activeTab === 'chat' && chatView === 'chat') {
            setChatView('sessions');
        } else {
            setActiveTab('home');
        }
    };

    return (
        <div className="unified-messenger">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="messenger-window"
                    >
                        {/* HEADER UNITÉ */}
                        <div className="messenger-header">
                            <div className="header-left-side">
                                {((activeTab === 'chat' && chatView === 'chat') || (activeTab !== 'home')) && (
                                    <button className="back-btn" onClick={handleBack}>
                                        <ChevronLeft size={20} />
                                    </button>
                                )}
                                <div className="header-info">
                                    <h3>{activeTab === 'home' ? 'Anatomy 3D' : activeTab === 'chat' ? t('ChatBot IA', 'AI Chat') : t('Votre Avis', 'Your Review')}</h3>
                                    {activeTab === 'home' && <p>{t('Comment pouvons-nous aider ?', 'How can we help?')}</p>}
                                </div>
                            </div>
                            <button className="close-window" onClick={toggleMessenger}><X size={20} /></button>
                        </div>

                        {/* CONTENT AREA */}
                        <div className="messenger-content">
                            {activeTab === 'home' && (
                                <div className="home-view">
                                    <div className="welcome-card">
                                        <h4>{t('Bienvenue !', 'Welcome!')}</h4>
                                        <p>{t('Explorez l\'anatomie humaine en 3D avec l\'aide de notre intelligence artificielle.', 'Explore human anatomy in 3D with our AI.')}</p>
                                        <Link to="/" className="home-link-btn" onClick={toggleMessenger}>
                                            <Home size={18} />
                                            <span>{t('Retour à l\'accueil', 'Return to home')}</span>
                                        </Link>
                                    </div>
                                    <div className="status-card">
                                        <div className="status-dot"></div>
                                        <span>{t('IA en ligne et prête à aider', 'AI is online and ready')}</span>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'chat' && (
                                <div className="tab-pane">
                                    <FloatingChat 
                                        isOpen={true} 
                                        onToggle={() => {}} 
                                        externalView={chatView}
                                        onViewChange={setChatView}
                                    />
                                </div>
                            )}

                            {activeTab === 'review' && (
                                <div className="tab-pane">
                                    <FloatingReview isOpen={true} onToggle={() => {}} />
                                </div>
                            )}
                        </div>

                        {/* BOTTOM NAVIGATION (MENU TÉLÉPHONE) */}
                        <div className="messenger-nav">
                            <button 
                                className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
                                onClick={() => setActiveTab('home')}
                            >
                                <Home size={22} />
                                <span>{t('Accueil', 'Home')}</span>
                            </button>
                            <button 
                                className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
                                onClick={() => setActiveTab('chat')}
                            >
                                <MessageCircle size={22} />
                                <span>{t('Messages', 'Messages')}</span>
                            </button>
                            <button 
                                className={`nav-item ${activeTab === 'review' ? 'active' : ''}`}
                                onClick={() => setActiveTab('review')}
                            >
                                <Star size={22} />
                                <span>{t('Avis', 'Review')}</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* LAUNCHER */}
            <button className={`messenger-launcher ${isOpen ? 'active' : ''}`} onClick={toggleMessenger}>
                {isOpen ? <X size={28} /> : (
                    <div className="launcher-icons">
                        <MessageCircle size={28} />
                        <div className="unread-dot"></div>
                    </div>
                )}
            </button>

            <style>{`
                .unified-messenger {
                    position: fixed;
                    bottom: 80px;
                    right: 25px;
                    z-index: 10000;
                    font-family: 'Manrope', 'Inter', system-ui, sans-serif;
                }
                .unified-messenger .messenger-launcher {
                    width: 65px; height: 65px;
                    border-radius: 50%;
                    background: ${theme === 'light' ? '#056CF2' : 'white'};
                    color: ${theme === 'light' ? 'white' : '#056CF2'}; 
                    border: none;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.1);
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    padding: 0;
                }
                .unified-messenger .messenger-launcher:hover { 
                    transform: scale(1.05) translateY(-3px); 
                    box-shadow: 0 12px 35px rgba(0,0,0,0.15); 
                }
                .unified-messenger .messenger-launcher.active { 
                    transform: rotate(90deg); 
                    background: ${theme === 'light' ? '#056CF2' : 'white'}; 
                    color: ${theme === 'light' ? 'white' : '#056CF2'}; 
                    border: none;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                }

                .unified-messenger .messenger-window {
                    position: absolute;
                    bottom: 85px;
                    right: 0;
                    width: 380px;
                    height: 600px;
                    background: white;
                    border-radius: 22px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    /* Gradient Border Effect */
                    border: 2px solid transparent;
                    background-image: linear-gradient(white, white), 
                                      linear-gradient(135deg, #056CF2 0%, #0C79F2 100%);
                    background-origin: border-box;
                    background-clip: content-box, border-box;
                }

                .unified-messenger .messenger-header {
                    padding: 30px 25px 20px;
                    background: linear-gradient(135deg, #056CF2 0%, #0C79F2 100%);
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .unified-messenger .header-left-side {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .unified-messenger .back-btn {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    border-radius: 10px;
                    padding: 6px;
                    cursor: pointer;
                    display: flex;
                    transition: 0.2s;
                }
                .unified-messenger .back-btn:hover { background: rgba(255,255,255,0.3); }
                .unified-messenger .header-info h3 { margin: 0; font-size: 20px; font-weight: 700; color: white; line-height: 1.2; }
                .unified-messenger .header-info p { margin: 2px 0 0; opacity: 0.8; font-size: 13px; color: white; }
                .unified-messenger .close-window { background: rgba(255,255,255,0.15); border: none; color: white; border-radius: 50%; padding: 4px; cursor: pointer; display: flex; }

                .unified-messenger .messenger-content {
                    flex: 1;
                    overflow: hidden;
                    background: #F7F8FB;
                    position: relative;
                }
                .unified-messenger .tab-pane { height: 100%; width: 100%; overflow-y: auto; }
                
                .unified-messenger .tab-pane .fc-window, 
                .unified-messenger .tab-pane .floating-review-window {
                    height: 100% !important;
                    width: 100% !important;
                    border: none !important;
                    box-shadow: none !important;
                    border-radius: 0 !important;
                    background: transparent !important;
                }
                .unified-messenger .tab-pane .fc-header, 
                .unified-messenger .tab-pane .review-header { display: none !important; }

                .unified-messenger .home-view { padding: 20px; display: flex; flex-direction: column; gap: 15px; }
                .unified-messenger .welcome-card { background: white; padding: 22px; border-radius: 18px; border: 1px solid #e5e7eb; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
                .unified-messenger .welcome-card h4 { margin: 0 0 8px; font-size: 18px; color: #111827; font-weight: 700; }
                .unified-messenger .welcome-card p { margin: 0 0 20px; font-size: 14px; color: #4b5563; line-height: 1.6; }
                .unified-messenger .home-link-btn { 
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    background: linear-gradient(135deg, #056CF2 0%, #0C79F2 100%);
                    color: white; padding: 14px; border-radius: 14px;
                    text-decoration: none; font-weight: 700; font-size: 14px;
                    transition: all 0.3s;
                    box-shadow: 0 4px 15px rgba(5, 108, 242, 0.2);
                }
                .unified-messenger .home-link-btn:hover { 
                    transform: translateY(-2px); 
                    box-shadow: 0 8px 20px rgba(5, 108, 242, 0.3); 
                }
                .unified-messenger .status-card { display: flex; align-items: center; gap: 10px; padding: 14px 20px; background: white; border-radius: 16px; border: 1px solid #DFE5ED; font-size: 13px; color: #4b5563; font-weight: 500; }
                .unified-messenger .status-dot { width: 10px; height: 10px; background: #10b981; border-radius: 50%; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); }

                .unified-messenger .messenger-nav {
                    height: 75px;
                    background: white;
                    border-top: 1px solid #DFE5ED;
                    display: flex;
                    justify-content: space-around;
                    align-items: center;
                    padding: 0 10px;
                }
                .unified-messenger .nav-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 5px;
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    padding: 10px 0;
                    flex: 1;
                    position: relative;
                }
                .unified-messenger .nav-item span { font-size: 11px; font-weight: 700; color: inherit; text-transform: uppercase; letter-spacing: 0.5px; }
                .unified-messenger .nav-item.active { color: #056CF2; }
                .unified-messenger .nav-item.active::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 30px;
                    height: 3px;
                    background: linear-gradient(135deg, #056CF2 0%, #0C79F2 100%);
                    border-radius: 0 0 3px 3px;
                }
                .unified-messenger .nav-item:hover:not(.active) { color: #64748b; }
            `}</style>
        </div>
    );
};

export default FloatingActionsDrawer;

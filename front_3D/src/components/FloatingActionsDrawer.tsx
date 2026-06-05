import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import FloatingChat from './FloatingChat';
import FloatingReview from './FloatingReview';
import FloatingFAQ from './FloatingFAQ';

interface FloatingActionsDrawerProps {
}

const FloatingActionsDrawer: React.FC<FloatingActionsDrawerProps> = () => {
    const { language } = useLanguage();
    const location = useLocation();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

    const [isFloatingActionsOpen, setIsFloatingActionsOpen] = useState(false);
    const [activeWidget, setActiveWidget] = useState<'chat' | 'review' | 'faq' | null>(null);

    // Close widgets if drawer closes
    useEffect(() => {
        if (!isFloatingActionsOpen) setActiveWidget(null);
    }, [isFloatingActionsOpen]);

    return (
        <>
            <div className={`floating-actions-wrapper ${isFloatingActionsOpen ? 'open' : ''}`}>
                <button 
                    className="floating-actions-trigger" 
                    onClick={() => setIsFloatingActionsOpen(!isFloatingActionsOpen)}
                    title={isFloatingActionsOpen ? t('Fermer les outils', 'Close tools') : t('Outils IA & Avis', 'AI Tools & Reviews')}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isFloatingActionsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}>
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>

                <div className={`floating-actions-content ${activeWidget ? 'widget-open' : 'all-closed'}`}>
                    {!['/quiz', '/chat'].includes(location.pathname) && (
                        <div className={`widget-wrapper ${activeWidget === 'chat' ? 'is-open' : 'is-closed'}`}>
                            <FloatingChat 
                                isOpen={activeWidget === 'chat'} 
                                onToggle={(open) => setActiveWidget(open ? 'chat' : null)}
                            />
                        </div>
                    )}
                    <div className={`widget-wrapper ${activeWidget === 'review' ? 'is-open' : 'is-closed'}`}>
                        <FloatingReview 
                            isOpen={activeWidget === 'review'} 
                            onToggle={(open) => setActiveWidget(open ? 'review' : null)}
                        />
                    </div>
                    <div className={`widget-wrapper ${activeWidget === 'faq' ? 'is-open' : 'is-closed'}`}>
                        <FloatingFAQ 
                            isOpen={activeWidget === 'faq'} 
                            onToggle={(open) => setActiveWidget(open ? 'faq' : null)}
                        />
                    </div>
                </div>
            </div>

            <style>{`
                .floating-actions-wrapper {
                    position: fixed;
                    right: -80px;
                    bottom: 100px;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .floating-actions-wrapper.open {
                    right: 0px;
                }
                .floating-actions-trigger {
                    width: 32px;
                    height: 60px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 12px 0 0 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: -4px 0 15px rgba(59, 130, 246, 0.3);
                    padding: 0;
                }
                .floating-actions-content {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 8px;
                    padding: 10px;
                    background: rgba(26, 31, 46, 0.85);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-right: none;
                    border-radius: 20px 0 0 20px;
                    box-shadow: -10px 0 30px rgba(0,0,0,0.3);
                }
                
                .floating-actions-content.all-closed {
                    flex-direction: column;
                    align-items: center;
                }
                
                .widget-wrapper {
                    display: flex;
                    justify-content: center;
                    transition: width 0.3s ease;
                }

                .widget-wrapper.is-open {
                    width: 100%;
                    order: -1; /* Toujours en haut */
                }

                .widget-wrapper.is-closed {
                    width: auto;
                }

                .fc-container, .floating-review-container, .floating-faq-container {
                    position: static !important;
                }
            `}</style>
        </>
    );
};

export default FloatingActionsDrawer;

import React, { useState } from 'react';
import { Star, MessageSquareQuote, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { reviewService } from '../services/api';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

interface FloatingReviewProps {
    isOpen?: boolean;
    onToggle?: (open: boolean) => void;
}

const FloatingReview: React.FC<FloatingReviewProps> = ({ isOpen: propIsOpen, onToggle }) => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
    const setIsOpen = (val: boolean) => {
        if (onToggle) onToggle(val);
        else setInternalIsOpen(val);
    };

    const [type, setType] = useState<'platform' | 'model_3d' | 'object'>('platform');
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [hover, setHover] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[Review] Submit started', { type, rating, comment });

        if (rating === 0) {
            console.warn('[Review] Rating is 0, blocking submit');
            return;
        }
        if (isSubmitting) {
            console.warn('[Review] Already submitting, blocking');
            return;
        }

        setIsSubmitting(true);
        try {
            console.log('[Review] Calling backend...');
            const response = await reviewService.store({
                type,
                rating,
                comment
            });
            console.log('[Review] Backend success:', response);
            
            setIsOpen(false);
            setRating(0);
            setComment('');
            
            console.log('[Review] Showing success Toast');
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                customClass: {
                    container: 'swal2-high-zindex'
                },
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer)
                    toast.addEventListener('mouseleave', Swal.resumeTimer)
                }
            });

            Toast.fire({
                icon: 'success',
                title: t('Avis enregistré !', 'Review saved!')
            });

        } catch (error: any) {
            console.error('[Review] Submission failed:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || t('Impossible d\'enregistrer l\'avis.', 'Could not save review.'),
                confirmButtonColor: '#3b82f6'
            });
        } finally {
            setIsSubmitting(false);
            console.log('[Review] Submit flow finished');
        }
    };

    return (
        <div className="floating-review-container">
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="review-toggle-btn"
                        onClick={() => setIsOpen(true)}
                        title={t('Donner votre avis', 'Leave a review')}
                    >
                        <MessageSquareQuote size={24} />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 100, opacity: 0 }}
                        className="floating-review-window"
                    >
                        <div className="review-header">
                            <div className="review-title">
                                {t('Avis & Feedback', 'Review & Feedback')}
                            </div>
                            <button onClick={() => setIsOpen(false)}><X size={18} /></button>
                        </div>

                        <form className="review-form" onSubmit={handleSubmit}>
                            <div className="review-type-selector">
                                <button 
                                    type="button" 
                                    className={`type-btn ${type === 'platform' ? 'active' : ''}`}
                                    onClick={() => setType('platform')}
                                >
                                    {t('Plateforme', 'Platform')}
                                </button>
                                <button 
                                    type="button" 
                                    className={`type-btn ${type === 'model_3d' ? 'active' : ''}`}
                                    onClick={() => setType('model_3d')}
                                >
                                    {t('Modèle 3D', '3D Model')}
                                </button>
                                <button 
                                    type="button" 
                                    className={`type-btn ${type === 'object' ? 'active' : ''}`}
                                    onClick={() => setType('object')}
                                >
                                    {t('Objet', 'Object')}
                                </button>
                            </div>

                            <p className="review-intro">
                                {type === 'platform' && t('Que pensez-vous de la plateforme ?', 'What do you think of the platform?')}
                                {type === 'model_3d' && t('Que pensez-vous de nos modèles 3D ?', 'What do you think of our 3D models?')}
                                {type === 'object' && t('Un avis sur les pièces anatomiques ?', 'Any feedback on anatomical parts?')}
                            </p>
                            
                            <div className="star-rating">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className={`star-btn ${(hover || rating) >= star ? 'active' : ''}`}
                                        onClick={() => {
                                            console.log('[Review] Star clicked:', star);
                                            setRating(star);
                                        }}
                                        onMouseEnter={() => setHover(star)}
                                        onMouseLeave={() => setHover(0)}
                                    >
                                        <Star size={24} fill={(hover || rating) >= star ? "currentColor" : "none"} />
                                    </button>
                                ))}
                            </div>

                            <textarea
                                placeholder={t('Commentaire (optionnel)...', 'Comment (optional)...')}
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                            />

                            <button 
                                type="submit" 
                                className="submit-btn" 
                                disabled={rating === 0 || isSubmitting}
                            >
                                {isSubmitting ? t('Envoi...', 'Sending...') : (
                                    <>
                                        <span>{t('Envoyer', 'Send')}</span>
                                        <Send size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .floating-review-container {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 10000;
                }
                .review-toggle-btn {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: #000000;
                    color: #ffffff;
                    border: 1px solid rgba(0,0,0,0.1);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: 0.2s;
                }
                :global(.dark) .review-toggle-btn, .dark .review-toggle-btn {
                    background: #ffffff;
                    color: #000000;
                    box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2);
                }
                .review-toggle-btn:hover {
                    transform: scale(1.1);
                    opacity: 0.9;
                }
                .floating-review-window {
                    width: 300px;
                    background: #1a1f2e;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 16px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    margin-bottom: 70px;
                }
                .review-header {
                    padding: 12px 16px;
                    background: #3b82f6;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-weight: 700;
                    font-size: 13px;
                    border-radius: 16px 16px 0 0;
                }
                .review-header button {
                    background: transparent; border: none; color: white; cursor: pointer;
                }
                .review-form {
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .review-type-selector {
                    display: flex;
                    background: rgba(0,0,0,0.2);
                    border-radius: 10px;
                    padding: 4px;
                    gap: 4px;
                }
                .type-btn {
                    flex: 1;
                    padding: 6px;
                    border: none;
                    background: transparent;
                    color: rgba(255,255,255,0.5);
                    font-size: 10px;
                    font-weight: 700;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: 0.2s;
                    text-transform: uppercase;
                    white-space: nowrap;
                }
                .type-btn:hover { color: white; }
                .type-btn.active {
                    background: #3b82f6;
                    color: white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .review-intro {
                    font-size: 12px;
                    color: rgba(255,255,255,0.6);
                    margin: 0;
                    text-align: center;
                }
                .target-name {
                    display: block;
                    font-size: 14px;
                    color: white;
                    font-weight: 700;
                    margin-top: 4px;
                }
                .star-rating {
                    display: flex;
                    justify-content: center;
                    gap: 8px;
                }
                .star-btn {
                    background: transparent;
                    border: none;
                    color: #d1d5db;
                    cursor: pointer;
                    transition: 0.2s;
                    padding: 0;
                }
                .star-btn.active {
                    color: #fbbf24;
                }
                .review-form textarea {
                    width: 100%;
                    height: 80px;
                    background: #0f131e;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    padding: 10px;
                    color: white;
                    font-size: 13px;
                    outline: none;
                    resize: none;
                }
                .submit-btn {
                    padding: 10px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: 0.2s;
                }
                .submit-btn:hover:not(:disabled) { background: #2563eb; }
                .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            `}</style>
        </div>
    );
};

export default FloatingReview;

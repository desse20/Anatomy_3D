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
                .floating-review-window {
                    width: 350px;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 15px 50px rgba(0,0,0,0.15);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    border: 1px solid #f3f4f6;
                }
                .review-header {
                    padding: 24px;
                    background: linear-gradient(135deg, #056CF2 0%, #0C79F2 100%);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .review-title {
                    font-size: 18px;
                    font-weight: 700;
                }
                .review-header button {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    border-radius: 50%;
                    padding: 5px;
                    cursor: pointer;
                    display: flex;
                }
                .review-form {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .review-type-selector {
                    display: flex;
                    background: #f3f4f6;
                    border-radius: 12px;
                    padding: 4px;
                }
                .type-btn {
                    flex: 1;
                    padding: 8px;
                    border: none;
                    background: transparent;
                    color: #6b7280;
                    font-size: 11px;
                    font-weight: 600;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .type-btn.active {
                    background: white;
                    color: #056CF2;
                    box-shadow: 0 2px 8px rgba(5, 108, 242, 0.05);
                }
                .star-rating {
                    display: flex;
                    justify-content: center;
                    gap: 12px;
                    padding: 10px 0;
                }
                .star-btn {
                    background: transparent;
                    border: none;
                    color: #e5e7eb;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .star-btn.active {
                    color: #fbbf24;
                    transform: scale(1.1);
                }
                .review-form textarea {
                    width: 100%;
                    height: 100px;
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    padding: 12px;
                    font-size: 14px;
                    outline: none;
                    resize: none;
                }
                .review-form textarea:focus {
                    border-color: #056CF2;
                    background: white;
                }
                .submit-btn {
                    padding: 14px;
                    background: linear-gradient(135deg, #056CF2 0%, #0C79F2 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    box-shadow: 0 4px 12px rgba(104, 97, 242, 0.2);
                }
                .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 15px rgba(104, 97, 242, 0.3); }
            `}</style>
        </div>
    );
};

export default FloatingReview;

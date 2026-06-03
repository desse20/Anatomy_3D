import React, { useState, useEffect } from 'react';
import { Star, MessageSquareQuote, X, Send, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { reviewService, anatomyService } from '../services/api';
import Swal from 'sweetalert2';

interface FloatingReviewProps {
    contextualObject?: { id: number; name: string } | null;
    required?: boolean;
    isOpen?: boolean;
    onToggle?: (open: boolean) => void;
}

const FloatingReview: React.FC<FloatingReviewProps> = ({ contextualObject, required, isOpen: propIsOpen, onToggle }) => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
    const setIsOpen = (val: boolean) => {
        if (onToggle) onToggle(val);
        else setInternalIsOpen(val);
    };
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [hover, setHover] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Search object logic
    const [localSelectedObject, setLocalSelectedObject] = useState<{id: number, name: string} | null>(contextualObject || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Sync with prop when it changes (from 3D click)
    useEffect(() => {
        console.log("FloatingReview: Prop contextualObject changed", contextualObject);
        if (contextualObject) {
            setLocalSelectedObject(contextualObject);
        }
    }, [contextualObject]);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const data = await anatomyService.search(query);
            console.log("FloatingReview Search Data:", data);
            const results = data.results || [];
            setSearchResults(Array.isArray(results) ? results.slice(0, 8) : []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0 || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await reviewService.store({
                type: localSelectedObject ? 'object' : 'platform',
                rating,
                comment,
                object_id: localSelectedObject?.id ?? undefined,
                object_name: localSelectedObject?.name ?? undefined
            });
            
            setIsOpen(false);
            setRating(0);
            setComment('');
            
            Swal.fire({
                icon: 'success',
                title: t('Merci !', 'Thank you!'),
                text: t('Votre avis a été enregistré.', 'Your review has been saved.'),
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: t('Impossible d\'enregistrer l\'avis.', 'Could not save review.')
            });
        } finally {
            setIsSubmitting(false);
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
                                {required 
                                    ? t("Avis sur une partie de l'anatomy", "Review on a part of anatomy")
                                    : t('Avis & Feedback', 'Review & Feedback')
                                }
                            </div>
                            <button onClick={() => setIsOpen(false)}><X size={18} /></button>
                        </div>

                        <form className="review-form" onSubmit={handleSubmit}>
                            <div className="review-target-selector">
                                {localSelectedObject ? (
                                    <div className="selected-target-badge">
                                        <span>{localSelectedObject.name}</span>
                                        <button type="button" onClick={() => setLocalSelectedObject(null)}><X size={12} /></button>
                                    </div>
                                ) : (
                                    /* Ne montrer la recherche que sur les pages de visualisation */
                                    (window.location.pathname.includes('/viewer') || window.location.pathname.includes('/salle')) && (
                                        <div className="search-box-container">
                                            <div className="search-input-wrapper">
                                                <Search size={14} className="search-icon" />
                                                <input 
                                                    type="text" 
                                                    placeholder={t('Rechercher une partie...', 'Search for a part...')}
                                                    value={searchQuery}
                                                    onChange={(e) => handleSearch(e.target.value)}
                                                />
                                                {isSearching && <Loader2 size={14} className="spin" />}
                                            </div>
                                            {searchResults.length > 0 && (
                                                <div className="search-results-dropdown">
                                                    {searchResults.map(res => (
                                                        <div 
                                                            key={res.id} 
                                                            className="search-res-item"
                                                            onClick={() => {
                                                                setLocalSelectedObject(res);
                                                                setSearchQuery('');
                                                                setSearchResults([]);
                                                              }}
                                                        >
                                                            {res.name}
                                                        </div>
                                                    ))}
                                                </div>
                                              )}
                                        </div>
                                    )
                                )}
                            </div>

                            <p className="review-intro">
                                {localSelectedObject
                                    ? t(`Donnez votre avis sur cet élément :`, `Rate this anatomical item:`)
                                    : (required 
                                        ? t('Veuillez choisir ou cliquer sur un objet', 'Please choose or click on an object')
                                        : t('Que pensez-vous de la plateforme ?', 'What do you think of the platform?'))
                                }
                            </p>
                            
                            <div className="star-rating">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className={`star-btn ${(hover || rating) >= star ? 'active' : ''}`}
                                        onClick={() => setRating(star)}
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
                                disabled={rating === 0 || isSubmitting || (required && !localSelectedObject)}
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
                /* En mode sombre, le bouton devient blanc avec icône noire */
                :global(.dark) .review-toggle-btn,
                .dark .review-toggle-btn {
                    background: #ffffff;
                    color: #000000;
                    box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2);
                }
                .review-toggle-btn:hover {
                    transform: scale(1.1);
                    opacity: 0.9;
                }
                .floating-review-window {
                    width: 280px;
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
                .review-target-selector {
                    padding: 12px 16px 0;
                }
                .selected-target-badge {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(59, 130, 246, 0.2);
                    border: 1px solid #3b82f6;
                    border-radius: 8px;
                    padding: 8px 12px;
                    color: #3b82f6;
                    font-size: 12px;
                    font-weight: 700;
                }
                .selected-target-badge button {
                    background: none; border: none; color: #3b82f6; cursor: pointer; display: flex;
                }
                .search-box-container {
                    position: relative;
                }
                .search-input-wrapper {
                    display: flex;
                    align-items: center;
                    background: #0f131e;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    padding: 0 10px;
                    gap: 8px;
                }
                .search-input-wrapper input {
                    flex: 1;
                    background: none;
                    border: none;
                    color: white;
                    padding: 8px 0;
                    font-size: 12px;
                    outline: none;
                }
                .search-icon { color: rgba(255,255,255,0.4); }
                .search-results-dropdown {
                    position: absolute;
                    top: calc(100% + 4px);
                    left: 0; right: 0;
                    background: #1f2937;
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    z-index: 99999;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.6);
                    max-height: 200px;
                    overflow-y: auto;
                }
                .search-res-item {
                    padding: 8px 12px;
                    color: white;
                    font-size: 12px;
                    cursor: pointer;
                    transition: 0.15s;
                }
                .search-res-item:hover {
                    background: rgba(59, 130, 246, 0.2);
                    color: #3b82f6;
                }
                .review-form {
                    padding: 12px 16px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .review-intro {
                    font-size: 13px;
                    color: white;
                    margin: 0;
                    font-weight: 500;
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
                    color: #3b82f6;
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

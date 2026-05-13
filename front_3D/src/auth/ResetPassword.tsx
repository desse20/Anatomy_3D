import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/auth.css';
import { apiCall } from '../services/api';

const ResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [strength, setStrength] = useState(0);
    const [strengthLabel, setStrengthLabel] = useState('');
    const [strengthColor, setStrengthColor] = useState('');

    useEffect(() => {
        calculateStrength(password);
    }, [password]);

    const calculateStrength = (pwd: string) => {
        if (!pwd) {
            setStrength(0);
            setStrengthLabel('');
            setStrengthColor('');
            return;
        }

        let score = 0;
        const hasMaj = /[A-Z]/.test(pwd);
        const hasMin = /[a-z]/.test(pwd);
        const hasNum = /[0-9]/.test(pwd);
        const hasSym = /[^A-Za-z0-9]/.test(pwd);
        const hasLength = pwd.length >= 6;

        if (hasLength) score += 20;
        if (hasMaj) score += 20;
        if (hasMin) score += 20;
        if (hasNum) score += 20;
        if (hasSym) score += 20;

        setStrength(score);

        if (score < 40) {
            setStrengthLabel(language === 'fr' ? 'Très Faible' : 'Very Weak');
            setStrengthColor('#ff4d4d');
        } else if (score < 80) {
            setStrengthLabel(language === 'fr' ? 'Moyen' : 'Medium');
            setStrengthColor('#ffa500');
        } else if (score < 100) {
            setStrengthLabel(language === 'fr' ? 'Presque bon...' : 'Almost good...');
            setStrengthColor('#3498db');
        } else {
            setStrengthLabel(language === 'fr' ? 'Parfait & Sécurisé' : 'Perfect & Secure');
            setStrengthColor('#2ecc71');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Password validation
        const hasMaj = /[A-Z]/.test(password);
        const hasMin = /[a-z]/.test(password);
        const hasNum = /[0-9]/.test(password);
        const hasSym = /[^A-Za-z0-9]/.test(password);

        if (password.length < 6) {
            setMessage({ type: 'error', text: language === 'fr' ? 'Le mot de passe doit contenir au moins 6 caractères' : 'Password must be at least 6 characters' });
            return;
        }
        if (!hasMaj || !hasMin || !hasNum || !hasSym) {
            setMessage({ type: 'error', text: language === 'fr' ? 'Le mot de passe doit contenir : Majuscule, Minuscule, Chiffre et Symbole' : 'Password must contain: Uppercase, Lowercase, Number and Symbol' });
            return;
        }

        if (password !== passwordConfirmation) {
            setMessage({ type: 'error', text: language === 'fr' ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.' });
            return;
        }

        setIsLoading(true);
        setMessage(null);
        
        try {
            await apiCall('/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ 
                    token, 
                    email, 
                    password, 
                    password_confirmation: passwordConfirmation 
                }),
            });
            setMessage({ 
                type: 'success', 
                text: language === 'fr' ? 'Mot de passe réinitialisé avec succès !' : 'Password reset successfully!' 
            });
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || (language === 'fr' ? 'Une erreur est survenue' : 'An error occurred') });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-side-image" style={{ 
                backgroundImage: `linear-gradient(rgba(12, 121, 242, 0.4), rgba(9, 17, 26, 0.8)), url('https://i.pinimg.com/736x/4b/27/47/4b2747b08ef05c33ff24a6e155bdc3ec.jpg')`
            }}>
                <div className="auth-side-content">
                    <h2>{language === 'fr' ? "Sécurisez votre compte." : "Secure your account."}</h2>
                    <p>{language === 'fr' ? "Choisissez un nouveau mot de passe fort pour protéger vos données de progression." : "Choose a new strong password to protect your progress data."}</p>
                </div>
            </div>

            <div className="auth-form-section">
                <div className="auth-container">
                    <div className="auth-logo">ANATOMY<span>3D</span></div>
                    
                    <header className="auth-header">
                        <h1>{language === 'fr' ? "Réinitialisation" : "Reset Password"}</h1>
                        <p>{language === 'fr' ? "Veuillez définir votre nouveau mot de passe." : "Please set your new password."}</p>
                    </header>

                    {message && (
                        <div style={{ 
                            background: message.type === 'success' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)', 
                            color: message.type === 'success' ? '#2ecc71' : '#e74c3c', 
                            padding: '12px 16px', 
                            borderRadius: '8px', 
                            marginBottom: '20px', 
                            fontSize: '14px', 
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            border: `1px solid ${message.type === 'success' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)'}`
                        }}>
                            <span>{message.text}</span>
                            <button 
                                onClick={() => setMessage(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '16px', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                            >&#x2715;</button>
                        </div>
                    )}

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>{language === 'fr' ? "NOUVEAU MOT DE PASSE" : "NEW PASSWORD"}</label>
                            <div className="password-input-wrapper">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="••••••••" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required 
                                />
                                <span className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                    )}
                                </span>
                            </div>
                            {password && (
                                <div className="password-strength-wrapper">
                                    <div className="strength-bar-container">
                                        <div 
                                            className="strength-bar" 
                                            style={{ width: `${strength}%`, background: strengthColor }}
                                        ></div>
                                    </div>
                                    <span className="strength-text" style={{ color: strengthColor }}>{strengthLabel}</span>
                                </div>
                            )}
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.4' }}>
                                {language === 'fr' 
                                    ? "* Le mot de passe doit contenir au moins 6 caractères, une majuscule, une minuscule, un chiffre et un symbole." 
                                    : "* Password must contain at least 6 characters, one uppercase, one lowercase, one number and one symbol."}
                            </p>
                        </div>

                        <div className="form-group">
                            <label>{language === 'fr' ? "CONFIRMER LE MOT DE PASSE" : "CONFIRM PASSWORD"}</label>
                            <div className="password-input-wrapper">
                                <input 
                                    type={showConfirmPassword ? "text" : "password"} 
                                    placeholder="••••••••" 
                                    value={passwordConfirmation}
                                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                                    required 
                                />
                                <span className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    {showConfirmPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                    )}
                                </span>
                            </div>
                        </div>

                        <button type="submit" className="btn-auth" disabled={isLoading}>
                            {isLoading ? (language === 'fr' ? 'RÉINITIALISATION...' : 'RESETTING...') : (language === 'fr' ? 'RÉINITIALISER LE MOT DE PASSE' : 'RESET PASSWORD')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/auth.css';
import { apiCall } from '../services/api';

const ForgotPassword: React.FC = () => {
    const { language } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);
        
        try {
            await apiCall('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email }),
            });
            setMessage({ 
                type: 'success', 
                text: language === 'fr' 
                    ? 'Un lien de réinitialisation a été envoyé à votre adresse email.' 
                    : 'A reset link has been sent to your email address.' 
            });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || (language === 'fr' ? 'Une erreur est survenue' : 'An error occurred') });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-side-image" style={{ 
                backgroundImage: `linear-gradient(rgba(12, 121, 242, 0.4), rgba(9, 17, 26, 0.8)), url('https://i.pinimg.com/736x/82/33/2c/82332cb942af1f447c67e24b650a1a82.jpg')`
            }}>
                <div className="auth-side-content">
                    <h2>{language === 'fr' ? "Récupérez l'accès à votre savoir." : "Regain access to your knowledge."}</h2>
                    <p>{language === 'fr' ? "Ne laissez pas un mot de passe oublié freiner votre apprentissage de l'anatomie." : "Don't let a forgotten password hinder your anatomy learning."}</p>
                </div>
            </div>

            <div className="auth-form-section">
                <Link to="/login" className="back-to-home">← {language === 'fr' ? "Retour à la connexion" : "Back to Login"}</Link>
                
                <div className="auth-container">
                    <div className="auth-logo">ANATOMY<span>3D</span></div>
                    
                    <header className="auth-header">
                        <h1>{language === 'fr' ? "Mot de passe oublié ?" : "Forgot Password?"}</h1>
                        <p>{language === 'fr' ? "Entrez votre email pour recevoir des instructions de réinitialisation." : "Enter your email to receive reset instructions."}</p>
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
                            <label>EMAIL</label>
                            <input 
                                type="email" 
                                placeholder={language === 'fr' ? "votre-email@gmail.com" : "your-email@gmail.com"} 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>

                        <button type="submit" className="btn-auth" disabled={isLoading}>
                            {isLoading ? (language === 'fr' ? 'ENVOI EN COURS...' : 'SENDING...') : (language === 'fr' ? 'ENVOYER LE LIEN' : 'SEND LINK')}
                        </button>
                    </form>

                    <div className="auth-footer">
                        {language === 'fr' ? "Vous vous en souvenez ?" : "Remember it?"} <Link to="/login">{language === 'fr' ? "Se connecter" : "Login"}</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;

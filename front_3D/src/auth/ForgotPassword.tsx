import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/auth.css';
import { apiCall } from '../services/api';

const ForgotPassword: React.FC = () => {
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
            setMessage({ type: 'success', text: 'Un lien de réinitialisation a été envoyé à votre adresse email.' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Une erreur est survenue' });
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
                    <h2>Récupérez l'accès à votre savoir.</h2>
                    <p>Ne laissez pas un mot de passe oublié freiner votre apprentissage de l'anatomie.</p>
                </div>
            </div>

            <div className="auth-form-section">
                <Link to="/login" className="back-to-home">← Retour à la connexion</Link>
                
                <div className="auth-container">
                    <div className="auth-logo">ANATOMY<span>3D</span></div>
                    
                    <header className="auth-header">
                        <h1>Mot de passe oublié ?</h1>
                        <p>Entrez votre email pour recevoir des instructions de réinitialisation.</p>
                    </header>

                    {message && (
                        <div style={{ 
                            background: message.type === 'success' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)', 
                            color: message.type === 'success' ? '#2ecc71' : '#e74c3c', 
                            padding: '12px', 
                            borderRadius: '8px', 
                            marginBottom: '20px', 
                            fontSize: '14px', 
                            fontWeight: '600', 
                            textAlign: 'center',
                            border: `1px solid ${message.type === 'success' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)'}`
                        }}>
                            {message.text}
                        </div>
                    )}

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>EMAIL</label>
                            <input 
                                type="email" 
                                placeholder="votre-email@gmail.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>

                        <button type="submit" className="btn-auth" disabled={isLoading}>
                            {isLoading ? 'ENVOI EN COURS...' : 'ENVOYER LE LIEN'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        Vous vous en souvenez ? <Link to="/login">Se connecter</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/auth.css';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => navigate('/atlas'), 1000);
    };

    return (
        <div className="auth-page">
            <div className="auth-side-image" style={{ 
                backgroundImage: `linear-gradient(rgba(12, 121, 242, 0.4), rgba(9, 17, 26, 0.8)), url('https://i.pinimg.com/736x/4b/27/47/4b2747b08ef05c33ff24a6e155bdc3ec.jpg')`
            }}>
                <div className="auth-side-content">
                    <h2>L'excellence dans l'apprentissage de l'anatomie.</h2>
                    <p>Accédez à des outils de visualisation 3D de haute précision pour approfondir vos connaissances médicales.</p>
                </div>
            </div>

            <div className="auth-form-section">
                <Link to="/" className="back-to-home">← Retour à l'accueil</Link>
                
                <div className="auth-container">
                    <div className="auth-logo">ANATOMY<span>3D</span></div>
                    
                    <header className="auth-header">
                        <h1>Bon retour parmis nous</h1>
                        <p>Veuillez entrer vos identifiants pour vous connecter.</p>
                    </header>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>EMAIL</label>
                                <input type="email" placeholder="koffisoglo@gmail.com" required />
                            </div>

                            <div className="form-group" style={{ flex: 1 }}>
                                <label>MOT DE PASSE</label>
                                <div className="password-input-wrapper">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="••••••••" 
                                        required 
                                    />
                                    <span 
                                        className="password-toggle" 
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="btn-auth" disabled={isLoading}>
                            {isLoading ? 'CONNEXION...' : 'SE CONNECTER'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        Vous n'avez pas encore de compte ? <Link to="/register">S'inscrire gratuitement</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

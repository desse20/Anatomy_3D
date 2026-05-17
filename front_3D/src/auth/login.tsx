import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/auth.css';
import { authService } from '../services/api';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { language, setLanguage } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        try {
            const response = await authService.login({ email, password });
            
            // Le token est soit à la racine, soit dans response.token
            const token = response.token || response.data?.token;
            if (token) {
                localStorage.setItem('token', token);
            }

            // L'utilisateur est soit dans response.data, soit c'est le reste de la réponse
            const userData = response.data || response;
            if (userData) {
                // On enlève le token des datas user par propreté
                const { token: _, ...pureUserData } = userData;
                localStorage.setItem('user', JSON.stringify(pureUserData));
            }

            navigate('/dash');
            window.location.reload(); // Pour forcer la mise à jour des Guards et du Layout App
        } catch (err: any) {
            setError(err.message || (language === 'fr' ? 'Identifiants incorrects' : 'Invalid credentials'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-side-image" style={{ backgroundImage: `url('https://i.pinimg.com/736x/4b/27/47/4b2747b08ef05c33ff24a6e155bdc3ec.jpg')` }}>
                <div className="auth-side-content">
                    <h2>{language === 'fr' ? "L'excellence dans l'apprentissage de l'anatomie." : "Excellence in anatomy learning."}</h2>
                    <p>{language === 'fr' ? "Accédez à des outils de visualisation 3D de haute précision pour approfondir vos connaissances médicales." : "Access high-precision 3D visualization tools to deepen your medical knowledge."}</p>
                </div>
            </div>

            <div className="auth-form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingTop: '10px' }}>
                    <Link to="/" className="back-to-home">← {language === 'fr' ? "Retour à l'accueil" : "Back to Home"}</Link>
                    <div className="lang-switcher-auth">
                        <button onClick={() => setLanguage('fr')} className={language === 'fr' ? 'active' : ''}>FR</button>
                        <button onClick={() => setLanguage('en')} className={language === 'en' ? 'active' : ''}>EN</button>
                    </div>
                </div>
                
                <div className="auth-container">
                    
                    <header className="auth-header">
                        <h1>{language === 'fr' ? "Connexion" : "Login"}</h1>
                        <p>{language === 'fr' ? "Accédez à votre espace Anatomy 3D Explorer." : "Access your Anatomy 3D Explorer space."}</p>
                    </header>

                    {error && <div style={{ background: '#ffeeee', color: '#e30000', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ffcccc' }}>{error}</div>}

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>{language === 'fr' ? "EMAIL" : "EMAIL"}</label>
                            <input 
                                type="email" 
                                placeholder={language === 'fr' ? "votre-email@gmail.com" : "your-email@gmail.com"} 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label>{language === 'fr' ? "MOT DE PASSE" : "PASSWORD"}</label>
                            <div className="password-input-wrapper">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="••••••••" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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

                        <button type="submit" className="btn-auth" disabled={isLoading}>
                            {isLoading ? (language === 'fr' ? "CONNEXION..." : "LOGGING IN...") : (language === 'fr' ? "SE CONNECTER" : "LOGIN")}
                        </button>

                        <div className="auth-helper-links">
                            <Link to="/forgot-password">{language === 'fr' ? "Mot de passe oublié ?" : "Forgot password?"}</Link>
                        </div>
                    </form>

                    <div className="auth-footer">
                        {language === 'fr' ? "Pas encore de compte ?" : "Don't have an account?"} <a href="/#register">{language === 'fr' ? "S'inscrire gratuitement" : "Sign up for free"}</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

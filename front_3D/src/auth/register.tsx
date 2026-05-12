import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/auth.css';
import { authService } from '../services/api';

const Register: React.FC = () => {
    const navigate = useNavigate();
    const { language, setLanguage } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [profile, setProfile] = useState('student');
    const [firstname, setFirstname] = useState('');
    const [lastname, setLastname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
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
            setError(language === 'fr' ? 'Le mot de passe doit contenir au moins 6 caractères' : 'Password must be at least 6 characters');
            return;
        }
        if (!hasMaj || !hasMin || !hasNum || !hasSym) {
            setError(language === 'fr' ? 'Le mot de passe doit contenir : Majuscule, Minuscule, Chiffre et Symbole' : 'Password must contain: Uppercase, Lowercase, Number and Symbol');
            return;
        }
        if (password.trim() !== confirmPassword.trim()) {
            setError(language === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await authService.register({
                firstname,
                lastname,
                email,
                password,
                password_confirmation: confirmPassword,
                role: profile === 'professor' ? 'teacher' : 'student'
            });
            
            // Réponse format: { data: { id, firstname, ... }, token: "..." }
            if (response?.token) {
                localStorage.setItem('token', response.token);
            }
            if (response?.data) {
                localStorage.setItem('user', JSON.stringify(response.data));
            }
            navigate('/dash');
        } catch (err: any) {
            setError(err.message || (language === 'fr' ? "Erreur lors de l'inscription" : "Error during registration"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-side-image" style={{ 
                backgroundImage: `linear-gradient(rgba(12, 121, 242, 0.4), rgba(9, 17, 26, 0.8)), url('https://i.pinimg.com/736x/a8/1f/23/a81f230d32134e858c3765390411c9df.jpg')`
            }}>
                <div className="auth-side-content">
                    <h2>{language === 'fr' ? "L'excellence dans l'apprentissage de l'anatomie." : "Excellence in anatomy learning."}</h2>
                    <p>{language === 'fr' ? "Accédez à des outils de visualisation 3D de haute précision pour approfondir vos connaissances médicales." : "Access high-precision 3D visualization tools to deepen your medical knowledge."}</p>
                </div>
            </div>

            <div className="auth-form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingTop: '10px' }}>
                    <Link to="/" className="back-to-home">← {language === 'fr' ? "Retour à l'accueil" : "Back to Home"}</Link>
                    <div className="lang-switcher-auth">
                        <button onClick={() => setLanguage('fr')} className={language === 'fr' ? 'active' : ''}>FR</button>
                        <button onClick={() => setLanguage('en')} className={language === 'en' ? 'active' : ''}>EN</button>
                    </div>
                </div>
                
                <div className="auth-container" style={{ gap: '15px' }}>
                    <div className="auth-logo" style={{ marginBottom: '5px' }}>ANATOMY<span>3D</span></div>
                    
                    <header className="auth-header" style={{ marginBottom: '15px' }}>
                        <h1>{language === 'fr' ? "Créer votre compte" : "Create your account"}</h1>
                        <p>{language === 'fr' ? "Rejoignez des milliers d'étudiants en médecine dès aujourd'hui." : "Join thousands of medical students today."}</p>
                    </header>

                    {error && <div style={{ background: '#ffeeee', color: '#e30000', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ffcccc' }}>{error}</div>}

                    <form className="auth-form" onSubmit={handleSubmit} style={{ gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label>{language === 'fr' ? "PRÉNOM" : "FIRST NAME"}</label>
                                <input 
                                    type="text" 
                                    placeholder="Koffi" 
                                    value={firstname}
                                    onChange={(e) => setFirstname(e.target.value)}
                                    required 
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label>{language === 'fr' ? "NOM" : "LAST NAME"}</label>
                                <input 
                                    type="text" 
                                    placeholder="Soglo" 
                                    value={lastname}
                                    onChange={(e) => setLastname(e.target.value)}
                                    required 
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>{language === 'fr' ? "EMAIL" : "EMAIL"}</label>
                            <input 
                                type="email" 
                                placeholder={language === 'fr' ? "votre-email@gmail.com" : "your-email@gmail.com"} 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label>{language === 'fr' ? "MOT DE PASSE" : "PASSWORD"}</label>
                                <div className="password-input-wrapper">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="••••••••" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required 
                                        minLength={6}
                                    />
                                    <span className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                        )}
                                    </span>
                                </div>
                                {password && (
                                    <div className="password-strength-wrapper" style={{ marginTop: '5px' }}>
                                        <div className="strength-bar-container" style={{ height: '4px' }}>
                                            <div 
                                                className="strength-bar" 
                                                style={{ width: `${strength}%`, background: strengthColor }}
                                            ></div>
                                        </div>
                                        <span className="strength-text" style={{ color: strengthColor, fontSize: '10px' }}>{strengthLabel}</span>
                                    </div>
                                )}
                            </div>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label>{language === 'fr' ? "CONFIRMER LE MOT DE PASSE" : "CONFIRM PASSWORD"}</label>
                                <div className="password-input-wrapper">
                                    <input 
                                        type={showConfirmPassword ? "text" : "password"} 
                                        placeholder="••••••••" 
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required 
                                    />
                                    <span className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        {showConfirmPassword ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '0', marginBottom: '5px', lineHeight: '1.2' }}>
                            {language === 'fr' ? "* Le mot de passe doit contenir au moins 6 caractères, une majuscule, une minuscule, un chiffre et un symbole." : "* The password must contain at least 6 characters, one uppercase letter, one lowercase letter, one number and one symbol."}
                        </p>

                        <div className="form-group" style={{ marginBottom: '10px' }}>
                            <label>{language === 'fr' ? "QUEL PROFIL VOUS CORRESPOND ?" : "WHICH PROFILE MATCHES YOU?"}</label>
                            <div className="profile-options" style={{ gap: '15px' }}>
                                <div className="profile-option">
                                    <input 
                                        type="radio" 
                                        id="student" 
                                        name="profile" 
                                        value="student" 
                                        checked={profile === 'student'} 
                                        onChange={() => setProfile('student')} 
                                    />
                                    <label htmlFor="student" className="profile-label">
                                        <span className="radio-circle"></span>
                                        {language === 'fr' ? "Étudiant" : "Student"}
                                    </label>
                                </div>
                                <div className="profile-option">
                                    <input 
                                        type="radio" 
                                        id="professor" 
                                        name="profile" 
                                        value="professor" 
                                        checked={profile === 'professor'} 
                                        onChange={() => setProfile('professor')} 
                                    />
                                    <label htmlFor="professor" className="profile-label">
                                        <span className="radio-circle"></span>
                                        {language === 'fr' ? "Professeur" : "Teacher"}
                                    </label>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="btn-auth" disabled={isLoading} style={{ marginTop: '5px' }}>
                            {isLoading ? (language === 'fr' ? "INSCRIPTION..." : "SIGNING UP...") : (language === 'fr' ? "CRÉER MON COMPTE" : "CREATE MY ACCOUNT")}
                        </button>
                    </form>

                    <div className="auth-footer" style={{ marginTop: '10px' }}>
                        {language === 'fr' ? "Vous avez déjà un compte ?" : "Already have an account?"} <Link to="/login">{language === 'fr' ? "Se connecter" : "Login"}</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;

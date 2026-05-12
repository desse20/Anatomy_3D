import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/auth.css';
import { authService } from '../services/api';

const Register: React.FC = () => {
    const navigate = useNavigate();
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
            setStrengthLabel('Très Faible');
            setStrengthColor('#ff4d4d');
        } else if (score < 80) {
            setStrengthLabel('Moyen');
            setStrengthColor('#ffa500');
        } else if (score < 100) {
            setStrengthLabel('Presque bon...');
            setStrengthColor('#3498db');
        } else {
            setStrengthLabel('Parfait & Sécurisé');
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
            setError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }
        if (!hasMaj || !hasMin || !hasNum || !hasSym) {
            setError('Le mot de passe doit contenir : Majuscule, Minuscule, Chiffre et Symbole');
            return;
        }
        if (password.trim() !== confirmPassword.trim()) {
            setError('Les mots de passe ne correspondent pas');
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
            setError(err.message || "Erreur lors de l'inscription");
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
                    <h2>Rejoignez la nouvelle ère médicale.</h2>
                    <p>Créez votre compte pour explorer des modèles anatomiques détaillés et optimisés pour votre réussite.</p>
                </div>
            </div>

            <div className="auth-form-section">
                <Link to="/" className="back-to-home">← Retour à l'accueil</Link>
                
                <div className="auth-container">
                    <div className="auth-logo">ANATOMY<span>3D</span></div>
                    
                    <header className="auth-header">
                        <h1>Créer votre compte</h1>
                        <p>Rejoignez des milliers d'étudiants en médecine dès aujourd'hui.</p>
                    </header>

                    {error && <div style={{ background: '#ffeeee', color: '#e30000', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: '600', textAlign: 'center', border: '1px solid #ffcccc' }}>{error}</div>}

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>PRÉNOM</label>
                                <input 
                                    type="text" 
                                    placeholder="Koffi" 
                                    value={firstname}
                                    onChange={(e) => setFirstname(e.target.value)}
                                    required 
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>NOM</label>
                                <input 
                                    type="text" 
                                    placeholder="Soglo" 
                                    value={lastname}
                                    onChange={(e) => setLastname(e.target.value)}
                                    required 
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>EMAIL</label>
                            <input 
                                type="email" 
                                placeholder="koffisoglo@gmail.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>MOT DE PASSE</label>
                                <div className="password-input-wrapper">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="••••••••" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required 
                                        minLength={6}
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
                                    * Le mot de passe doit contenir au moins 6 caractères, une majuscule, une minuscule, un chiffre et un symbole.
                                </p>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>CONFIRMER LE MOT DE PASSE</label>
                                <div className="password-input-wrapper">
                                    <input 
                                        type={showConfirmPassword ? "text" : "password"} 
                                        placeholder="••••••••" 
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required 
                                    />
                                    <span 
                                        className="password-toggle" 
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>QUEL PROFIL VOUS CORRESPOND ?</label>
                            <div className="profile-options">
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
                                        Étudiant
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
                                        Professeur
                                    </label>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="btn-auth" disabled={isLoading}>
                            {isLoading ? 'INSCRIPTION...' : 'CRÉER MON COMPTE'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        Vous avez déjà un compte ? <Link to="/login">Se connecter</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;

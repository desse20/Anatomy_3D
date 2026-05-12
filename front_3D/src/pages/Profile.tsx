import React, { useState } from 'react';
import App from '../components/layouts/App';
import { useTheme } from '../components/ThemeContext';
import { userService } from '../services/api';
import '../styles/settings.css';

const Profile: React.FC = () => {
    const [currentTab, setCurrentTab] = useState<'profile' | 'password' | 'appearance'>('profile');
    
    // Password state
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [formData, setFormData] = useState({
        current_password: '',
        password: '',
        password_confirmation: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const { theme, setTheme } = useTheme();
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : { firstname: 'Matinou', lastname: 'BELLO', email: 'mantinoubello123@gmail.com', role: 'student' };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        
        try {
            const result = await userService.changePassword(formData);
            if (result?.token) {
                localStorage.setItem('token', result.token);
            }
            setMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès !' });
            setFormData({ current_password: '', password: '', password_confirmation: '' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Échec de la mise à jour.' });
        } finally {
            setLoading(false);
        }
    };

    const EyeIcon = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    );

    const EyeOffIcon = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    );

    const renderContent = () => {
        switch (currentTab) {
            case 'profile':
                return (
                    <>
                        <div className="settings-header">
                            <h2>Profil</h2>
                            <p>Mettez à jour vos informations personnelles et votre adresse email.</p>
                        </div>
                        <div className="settings-form-container">
                            <div className="form-group">
                                <label>Nom complet</label>
                                <input type="text" defaultValue={`${user.firstname} ${user.lastname}`} className="settings-input" />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" defaultValue={user.email} className="settings-input" />
                            </div>
                            <div className="form-actions">
                                <button className="btn-save">Enregistrer</button>
                            </div>
                        </div>
                        <div className="danger-zone">
                            <div className="danger-header">
                                <h3>Supprimer le compte</h3>
                                <p>Une fois votre compte supprimé, toutes ses ressources et données seront définitivement effacées.</p>
                            </div>
                            <button className="btn-danger">Supprimer le compte</button>
                        </div>
                    </>
                );
            case 'password':
                return (
                    <form onSubmit={handlePasswordChange}>
                        <div className="settings-header">
                            <h2>Changer le mot de passe</h2>
                            <p>Assurez-vous que votre compte utilise un mot de passe long et complexe pour rester sécurisé.</p>
                        </div>
                        
                        {message && (
                            <div className={`settings-message ${message.type}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="settings-form-container">
                            <div className="form-group">
                                <label>Mot de passe actuel</label>
                                <div className="password-input-wrapper">
                                    <input 
                                        type={showCurrentPassword ? 'text' : 'password'} 
                                        placeholder="••••••••" 
                                        className="settings-input" 
                                        value={formData.current_password}
                                        onChange={(e) => setFormData({...formData, current_password: e.target.value})}
                                        required
                                    />
                                    <button 
                                        type="button" 
                                        className="password-toggle"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    >
                                        {showCurrentPassword ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Nouveau mot de passe</label>
                                <div className="password-input-wrapper">
                                    <input 
                                        type={showNewPassword ? 'text' : 'password'} 
                                        placeholder="••••••••" 
                                        className="settings-input" 
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        required
                                    />
                                    <button 
                                        type="button" 
                                        className="password-toggle"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                    >
                                        {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Confirmer le mot de passe</label>
                                <div className="password-input-wrapper">
                                    <input 
                                        type={showConfirmPassword ? 'text' : 'password'} 
                                        placeholder="••••••••" 
                                        className="settings-input" 
                                        value={formData.password_confirmation}
                                        onChange={(e) => setFormData({...formData, password_confirmation: e.target.value})}
                                        required
                                    />
                                    <button 
                                        type="button" 
                                        className="password-toggle"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn-save" disabled={loading}>
                                    {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                                </button>
                            </div>
                        </div>
                    </form>
                );
            case 'appearance':
                return (
                    <>
                        <div className="settings-header">
                            <h2>Apparence</h2>
                            <p>Mettez à jour les paramètres d'apparence de votre compte.</p>
                        </div>
                        <div className="appearance-selector">
                            <div 
                                className={`appearance-option ${theme === 'light' ? 'active' : ''}`}
                                onClick={() => setTheme('light')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                                Clair
                            </div>
                            <div 
                                className={`appearance-option ${theme === 'dark' ? 'active' : ''}`}
                                onClick={() => setTheme('dark')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                                Sombre
                            </div>
                            <div 
                                className={`appearance-option ${theme === 'system' ? 'active' : ''}`}
                                onClick={() => setTheme('system')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                                Système
                            </div>
                        </div>
                    </>
                );
        }
    };

    return (
        <App breadcrumb={`Dashboard / Paramètres / ${currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}`} title="Paramètres">
            <div className="settings-container">
                <aside className="settings-sidebar">
                    <nav className="settings-nav">
                        <button 
                            className={`settings-nav-item ${currentTab === 'profile' ? 'active' : ''}`}
                            onClick={() => setCurrentTab('profile')}
                        >
                            Profil
                        </button>
                        <button 
                            className={`settings-nav-item ${currentTab === 'password' ? 'active' : ''}`}
                            onClick={() => setCurrentTab('password')}
                        >
                            Mot de passe
                        </button>
                        <button 
                            className={`settings-nav-item ${currentTab === 'appearance' ? 'active' : ''}`}
                            onClick={() => setCurrentTab('appearance')}
                        >
                            Apparence
                        </button>
                    </nav>
                </aside>

                <div className="settings-content">
                    {renderContent()}
                </div>
            </div>
        </App>
    );
};

export default Profile;

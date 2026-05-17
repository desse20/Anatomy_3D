import React, { useState } from 'react';
import App from '../components/layouts/App';
import { useTheme } from '../contexts/ThemeContext';
import { userService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/settings.css';

const Profile: React.FC = () => {
    const { language } = useLanguage();
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
    
    // Delete account modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [showDeletePassword, setShowDeletePassword] = useState(false);

    const { theme, setTheme } = useTheme();
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : { id: 0, firstname: 'Matinou', lastname: 'BELLO', email: 'mantinoubello123@gmail.com', role: 'student' };

    // Profile info state
    const [profileInfo, setProfileInfo] = useState({
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email
    });

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const result = await userService.updateProfile({
                firstname: profileInfo.firstname,
                lastname: profileInfo.lastname,
                email: profileInfo.email
            });

            // Update local storage
            localStorage.setItem('user', JSON.stringify(result.data));
            if (result?.token) {
                localStorage.setItem('token', result.token);
            }
            setMessage({ 
                type: 'success', 
                text: language === 'fr' ? 'Profil mis à jour avec succès !' : 'Profile updated successfully!'
            });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || (language === 'fr' ? 'Erreur survenue' : 'Error occurred') });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = () => {
        setShowDeleteModal(true);
        setMessage(null);
    };

    const confirmDeleteAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deletePassword) return;

        setLoading(true);
        try {
            await userService.deleteAccount(deletePassword);
            localStorage.clear();
            window.location.href = '/login';
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || (language === 'fr' ? 'Erreur survenue' : 'Error occurred') });
            setLoading(false);
            setShowDeleteModal(false);
            setDeletePassword('');
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        
        try {
            const result = await userService.changePassword(formData);
            if (result?.token) {
                localStorage.setItem('token', result.token);
            }
            setMessage({ 
                type: 'success', 
                text: language === 'fr' ? 'Mot de passe mis à jour avec succès !' : 'Password updated successfully!'
            });
            setFormData({ current_password: '', password: '', password_confirmation: '' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || (language === 'fr' ? 'Échec de la mise à jour.' : 'Update failed.') });
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

    const renderDeleteModal = () => {
        if (!showDeleteModal) return null;

        return (
            <div className="settings-modal-overlay">
                <div className="settings-modal">
                    <div className="settings-modal-header">
                        <h3>{language === 'fr' ? "Supprimer le compte" : "Delete Account"}</h3>
                        <button className="btn-close-modal" onClick={() => setShowDeleteModal(false)}>×</button>
                    </div>
                    <div className="settings-modal-body">
                        <p className="danger-text">
                            {language === 'fr' 
                                ? "Cette action est définitive. Saisissez votre mot de passe pour confirmer." 
                                : "This action is permanent. Enter your password to confirm."}
                        </p>
                        <form onSubmit={confirmDeleteAccount}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>{language === 'fr' ? "Mot de passe actuel" : "Current Password"}</label>
                                <div className="password-input-wrapper">
                                    <input 
                                        type={showDeletePassword ? 'text' : 'password'} 
                                        className="settings-input" 
                                        placeholder="••••••••"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                    <button 
                                        type="button" 
                                        className="password-toggle"
                                        onClick={() => setShowDeletePassword(!showDeletePassword)}
                                    >
                                        {showDeletePassword ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowDeleteModal(false)}>
                                    {language === 'fr' ? 'Annuler' : 'Cancel'}
                                </button>
                                <button type="submit" className="btn-danger-confirm" disabled={loading || !deletePassword}>
                                    {loading ? (language === 'fr' ? 'Mise à jour...' : 'Updating...') : (language === 'fr' ? 'Supprimer' : 'Delete')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        switch (currentTab) {
            case 'profile':
                return (
                    <>
                        <div className="settings-header">
                            <h2>{language === 'fr' ? "Profil" : "Profile"}</h2>
                            <p>{language === 'fr' ? "Mettez à jour vos informations personnelles." : "Update your personal information."}</p>
                        </div>

                        {message && currentTab === 'profile' && (
                            <div className={`settings-message ${message.type}`}>
                                <span>{message.text}</span>
                                <button className="message-close" onClick={() => setMessage(null)}>&#x2715;</button>
                            </div>
                        )}

                        <form className="settings-form-container" onSubmit={handleProfileUpdate}>
                            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>{language === 'fr' ? "Prénom" : "First Name"}</label>
                                    <input 
                                        type="text" 
                                        value={profileInfo.firstname} 
                                        onChange={(e) => setProfileInfo({...profileInfo, firstname: e.target.value})}
                                        className="settings-input" 
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>{language === 'fr' ? "Nom" : "Last Name"}</label>
                                    <input 
                                        type="text" 
                                        value={profileInfo.lastname} 
                                        onChange={(e) => setProfileInfo({...profileInfo, lastname: e.target.value})}
                                        className="settings-input" 
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input 
                                    type="email" 
                                    value={profileInfo.email} 
                                    onChange={(e) => setProfileInfo({...profileInfo, email: e.target.value})}
                                    className="settings-input" 
                                    required
                                />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn-save" disabled={loading}>
                                    {loading ? (language === 'fr' ? "Mise à jour..." : "Updating...") : (language === 'fr' ? "Enregistrer" : "Save")}
                                </button>
                            </div>
                        </form>
                        <div className="danger-zone">
                            <div className="danger-header">
                                <h3>{language === 'fr' ? "Supprimer le compte" : "Delete Account"}</h3>
                                <p>{language === 'fr' ? "Cette action est irréversible." : "This action cannot be undone."}</p>
                            </div>
                            <button 
                                className="btn-danger" 
                                onClick={handleDeleteAccount}
                                disabled={loading}
                            >
                                {language === 'fr' ? "Supprimer" : "Delete"}
                            </button>
                        </div>
                    </>
                );
            case 'password':
                return (
                    <form onSubmit={handlePasswordChange}>
                        <div className="settings-header">
                            <h2>{language === 'fr' ? "Mot de passe" : "Password"}</h2>
                            <p>{language === 'fr' ? "Assurez-vous d'utiliser un mot de passe robuste." : "Ensure your account is using a secure password."}</p>
                        </div>
                        
                        {message && (
                            <div className={`settings-message ${message.type}`}>
                                <span>{message.text}</span>
                                <button className="message-close" onClick={() => setMessage(null)}>&#x2715;</button>
                            </div>
                        )}

                        <div className="settings-form-container">
                            <div className="form-group">
                                <label>{language === 'fr' ? "Mot de passe actuel" : "Current Password"}</label>
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
                                <label>{language === 'fr' ? "Nouveau mot de passe" : "New Password"}</label>
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
                                <label>{language === 'fr' ? "Confirmer le mot de passe" : "Confirm Password"}</label>
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
                                    {loading ? (language === 'fr' ? "Mise à jour..." : "Updating...") : (language === 'fr' ? "Mettre à jour mot de passe" : "Update Password")}
                                </button>
                            </div>
                        </div>
                    </form>
                );
            case 'appearance':
                return (
                    <>
                        <div className="settings-header">
                            <h2>{language === 'fr' ? "Apparence" : "Appearance"}</h2>
                            <p>{language === 'fr' ? "Personnalisez le thème de votre compte." : "Update your account's appearance settings."}</p>
                        </div>
                        <div className="appearance-selector">
                            <div 
                                className={`appearance-option ${theme === 'light' ? 'active' : ''}`}
                                onClick={() => setTheme('light')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                                {language === 'fr' ? "Clair" : "Light"}
                            </div>
                            <div 
                                className={`appearance-option ${theme === 'dark' ? 'active' : ''}`}
                                onClick={() => setTheme('dark')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                                {language === 'fr' ? "Sombre" : "Dark"}
                            </div>
                            <div 
                                className={`appearance-option ${theme === 'system' ? 'active' : ''}`}
                                onClick={() => setTheme('system')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                                {language === 'fr' ? "Système" : "System"}
                            </div>
                        </div>
                    </>
                );
        }
    };

    return (
        <App 
            breadcrumb={`Dashboard / ${language === 'fr' ? 'Paramètres' : 'Settings'} / ${
                currentTab === 'profile' ? (language === 'fr' ? 'Profil' : 'Profile') : 
                currentTab === 'password' ? (language === 'fr' ? 'Mot de passe' : 'Password') : 
                (language === 'fr' ? 'Apparence' : 'Appearance')
            }`} 
            title={language === 'fr' ? "Paramètres" : "Settings"}
        >
            <style>{`
                .settings-input {
                    border: 2px solid #64748B !important;
                    background: #F8FAFC !important;
                    color: #0F172A !important;
                    visibility: visible !important;
                    display: block !important;
                    opacity: 1 !important;
                }
                .dark .settings-input {
                    border: 1px solid var(--dash-border) !important;
                    background: var(--dash-sidebar-bg) !important;
                    color: var(--dash-text-main) !important;
                }
            `}</style>
            <div className="settings-container">
                {renderDeleteModal()}
                <aside className="settings-sidebar">
                    <nav className="settings-nav">
                        <button 
                            className={`settings-nav-item ${currentTab === 'profile' ? 'active' : ''}`}
                            onClick={() => { setCurrentTab('profile'); setMessage(null); }}
                        >
                            {language === 'fr' ? "Profil" : "Profile"}
                        </button>
                        <button 
                            className={`settings-nav-item ${currentTab === 'password' ? 'active' : ''}`}
                            onClick={() => { setCurrentTab('password'); setMessage(null); }}
                        >
                            {language === 'fr' ? "Mot de passe" : "Password"}
                        </button>
                        <button 
                            className={`settings-nav-item ${currentTab === 'appearance' ? 'active' : ''}`}
                            onClick={() => { setCurrentTab('appearance'); setMessage(null); }}
                        >
                            {language === 'fr' ? "Apparence" : "Appearance"}
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

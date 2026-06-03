import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import FloatingActionsDrawer from '../FloatingActionsDrawer';
import '../../styles/layout.css';

interface AppProps {
    children: React.ReactNode;
    breadcrumb?: React.ReactNode;
    title?: string;
}

const App: React.FC<AppProps> = ({ children, breadcrumb, title }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { language, setLanguage } = useLanguage();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('sidebar_collapsed') === 'true';
    });
    
    useEffect(() => {
        localStorage.setItem('sidebar_collapsed', String(isCollapsed));
    }, [isCollapsed]);
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    let user = { firstname: '', lastname: '', email: '', role: '' };
    try {
        const userJson = localStorage.getItem('user');
        if (userJson) {
            user = JSON.parse(userJson);
        }
    } catch (e) {
        console.error("Error parsing user data", e);
    }

    const userRole = user.role || 'student';
    const hierarchy: Record<string, number> = { 'student': 1, 'teacher': 2, 'admin': 3 };
    const userWeight = hierarchy[userRole] || 1;

    const isAdmin = userWeight >= 3;
    const isTeacher = userWeight >= 2;
    const isStudent = userWeight >= 1;

    const initials = (user.firstname?.[0] || 'U') + (user.lastname?.[0] || '');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
        window.location.reload();
    };

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className={`dash-layout ${isCollapsed ? 'sidebar-collapsed' : ''} ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
            
            {/* Minimal Mobile Menu Trigger (No Header) */}
            {/* <button className="mobile-only-btn" onClick={() => setIsMobileMenuOpen(true)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button> */}

            {isMobileMenuOpen && <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>}

            <aside className="dash-sidebar">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', marginBottom: '30px' }}>
                    {!isCollapsed && (
                        <div className="dash-logo-container" style={{ padding: 0 }}>
                            <Link to="/" className="dash-logo">ANATOMY<span>3D</span></Link>
                        </div>
                    )}
                    <button 
                        className="sidebar-toggle-btn" 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dash-text-muted)', padding: '5px' }}
                    >
                        {isCollapsed ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>
                        )}
                    </button>
                    <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>×</button>
                </div>
                
                <nav className="dash-nav-group">
                    {!isCollapsed && <div className="dash-nav-heading">{language === 'fr' ? 'Plateforme' : 'Platform'}</div>}
                    <Link to="/dash" className={`nav-item ${isActive('/dash') ? 'active' : ''}`} title="Dashboard">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        {!isCollapsed && <span>{language === 'fr' ? 'Tableau de bord' : 'Dashboard'}</span>}
                    </Link>
                    {isAdmin && (
                        <>
                            {!isCollapsed && <div className="dash-nav-heading" style={{ marginTop: '16px' }}>{language === 'fr' ? 'Administration' : 'Administration'}</div>}
                            <Link to="/utilisateurs" className={`nav-item ${isActive('/utilisateurs') ? 'active' : ''}`} title={language === 'fr' ? 'Gestion des utilisateurs' : 'User Management'}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                {!isCollapsed && <span>{language === 'fr' ? 'Gestion des utilisateurs' : 'User Management'}</span>}
                            </Link>
                            <Link to="/model" className={`nav-item ${isActive('/model') ? 'active' : ''}`} title={language === 'fr' ? 'Ressources 3D' : '3D Resources'}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
                                {!isCollapsed && <span>{language === 'fr' ? 'Ressources 3D' : '3D Resources'}</span>}
                            </Link>
                            <Link to="/tech" className={`nav-item ${isActive('/tech') ? 'active' : ''}`} title="Gestion Technique">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                                {!isCollapsed && <span>{language === 'fr' ? 'Gestion Technique' : 'Tech Management'}</span>}
                            </Link>
                        </>
                    )}
                    {(isTeacher || isAdmin) && (
                        <>
                            {!isCollapsed && <div className="dash-nav-heading" style={{ marginTop: '16px' }}>{language === 'fr' ? 'Espace Pédagogique' : 'Pedagogy Space'}</div>}
                            <Link to="/labs" className={`nav-item ${isActive('/labs') ? 'active' : ''}`} title="Labs">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H9a1 1 0 0 0-1 1v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1Z"/><path d="M8 5H5a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3"/><path d="M12 12v6"/><path d="m9 15 3 3 3-3"/></svg>
                                {!isCollapsed && <span>{language === 'fr' ? 'Gestion des Labs' : 'Labs Management'}</span>}
                            </Link>
                            <Link to="/my-views" className={`nav-item ${isActive('/my-views') ? 'active' : ''}`} title="My Views">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                {!isCollapsed && <span>{language === 'fr' ? 'Catalogue de Vues' : 'Views Catalog'}</span>}
                            </Link>
                        </>
                    )}
                </nav>
                <nav className="dash-nav-group">
                    {!isCollapsed && <div className="dash-nav-heading">{language === 'fr' ? 'Apprentissage' : 'Learning'}</div>}
                    {isStudent && !isAdmin && !isTeacher && (
                        <Link to="/labs" className={`nav-item ${isActive('/labs') ? 'active' : ''}`} title="Labs">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H9a1 1 0 0 0-1 1v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1Z"/><path d="M8 5H5a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3"/><path d="M12 12v6"/><path d="m9 15 3 3 3-3"/></svg>
                            {!isCollapsed && <span>{language === 'fr' ? 'Mes Salles (Labs)' : 'My Labs'}</span>}
                        </Link>
                    )}
                    <Link to="/atlas" className={`nav-item ${isActive('/atlas') ? 'active' : ''}`} title="Atlas 3D">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        {!isCollapsed && <span>{language === 'fr' ? 'Atlas 3D' : '3D Atlas'}</span>}
                    </Link>
                    {isStudent && (
                        <>
                            <Link to="/quiz" className={`nav-item ${isActive('/quiz') ? 'active' : ''}`} title="Quiz IA">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5"></path><path d="M9 11H7a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5a2 2 0 0 0 2-2h-2"></path><path d="M12 11v4"></path><path d="M10 13h4"></path></svg>
                                {!isCollapsed && <span>{language === 'fr' ? 'Quiz IA' : 'AI Quiz'}</span>}
                            </Link>
                            <Link to="/chat" className={`nav-item ${isActive('/chat') ? 'active' : ''}`} title={language === 'fr' ? 'Chat' : 'Chat'}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                {!isCollapsed && <span>Chat</span>}
                            </Link>
                            <Link to="/levels" className={`nav-item ${isActive('/levels') ? 'active' : ''}`} title={language === 'fr' ? 'Niveaux' : 'Levels'}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                {!isCollapsed && <span>{language === 'fr' ? 'Niveaux' : 'Levels'}</span>}
                            </Link>
                        </>
                    )}
                    <Link to="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`} title="Profil">
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        {!isCollapsed && <span>{language === 'fr' ? 'Mon Profil' : 'My Profile'}</span>}
                    </Link>
                </nav>

                <div className="lang-sidebar-container" style={{ marginTop: 'auto', padding: isCollapsed ? '16px 0' : '0 12px 16px' }}>
                    {!isCollapsed && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }} className="dash-nav-heading">
                            <span>{language === 'fr' ? 'Paramètres' : 'Settings'}</span>
                            <span style={{ fontSize: '10px', color: 'var(--dash-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {userRole === 'admin' ? 'Administrateur' : userRole === 'teacher' ? 'Professeur' : 'Étudiant'}
                            </span>
                        </div>
                    )}
                    <div className="lang-switcher-sidebar" style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
                        <button 
                            className={`lang-btn ${language === 'fr' ? 'active' : ''}`} 
                            onClick={() => setLanguage('fr')}
                        >
                            FR
                        </button>
                        <button 
                            className={`lang-btn ${language === 'en' ? 'active' : ''}`} 
                            onClick={() => setLanguage('en')}
                        >
                            EN
                        </button>
                    </div>
                </div>

                <div className="dash-user-section" style={{ borderTop: '1px solid var(--dash-border)', paddingTop: '16px' }}>
                    {isUserMenuOpen && (
                        <div className="user-dropdown-menu">
                            <Link to="/profile" className="dropdown-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                {!isCollapsed && (language === 'fr' ? 'Paramètres du profil' : 'Profile Settings')}
                            </Link>
                            <button onClick={handleLogout} className="dropdown-item logout">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                {!isCollapsed && (language === 'fr' ? 'Se déconnecter' : 'Logout')}
                            </button>
                        </div>
                    )}
                    
                    <div className="user-profile-bar" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', minWidth: 0 }}>
                        <div className="user-initials-box">
                            {initials}
                        </div>
                        {!isCollapsed && (
                            <div className="user-info-text" style={{ marginLeft: '10px', minWidth: 0, flex: 1 }}>
                                <span className="user-name" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.firstname} {user.lastname}</span>
                                <span className="user-email" style={{ display: 'block', fontSize: '11px', color: 'var(--dash-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</span>
                            </div>
                        )}
                        {!isCollapsed && (
                            <svg className={`chevron-icon ${isUserMenuOpen ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', flexShrink: 0 }}><path d="m7 15 5 5 5-5"></path><path d="m7 9 5-5 5 5"></path></svg>
                        )}
                    </div>
                </div>
            </aside>

            <main className="dash-main">
                <div className="dash-content-container">
                    <div className="dash-top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', gap: '20px' }}>
                        <div className="breadcrumb-area" style={{ flex: 1 }}>
                            {breadcrumb && <div className="dash-breadcrumb" style={{ marginBottom: '8px' }}>{breadcrumb}</div>}
                            {title && <h1 style={{ margin: 0, fontSize: '28px' }}>{title}</h1>}
                        </div>

                        <Link to="/profile" className="header-user-widget" style={{ 
                            textDecoration: 'none', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px',
                            padding: '6px 14px',
                            background: 'var(--dash-card-bg)',
                            borderRadius: '100px',
                            border: '1px solid var(--dash-border)',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}>
                             <div className="huw-avatar" style={{ 
                                width: '36px', height: '36px', borderRadius: '50%', 
                                background: '#0ea5e9', 
                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            </div>
                            <div className="huw-text" style={{ textAlign: 'left', minWidth: 0 }}>
                                <div className="huw-name" style={{ color: 'var(--dash-text)', fontWeight: 800, fontSize: '13px', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.firstname} {user.lastname}</div>
                                <div className="huw-email" style={{ color: 'var(--dash-text-muted)', fontSize: '11px', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                            </div>
                        </Link>
                    </div>
                    {children}
                </div>
            </main>

            {/* Native-style Mobile Bottom Navigation */}
            <nav className="mobile-bottom-nav">
                <Link to="/dash" className={`bottom-nav-item ${isActive('/dash') ? 'active' : ''}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    <span>{language === 'fr' ? 'Dash' : 'Dash'}</span>
                </Link>
                
                {(isStudent || isTeacher || isAdmin) && (
                    <Link to="/atlas" className={`bottom-nav-item ${isActive('/atlas') ? 'active' : ''}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        <span>Atlas</span>
                    </Link>
                )}
                
                {isStudent && (
                    <>
                        <Link to="/quiz" className={`bottom-nav-item ${isActive('/quiz') ? 'active' : ''}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5"></path><path d="M9 11H7a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5a2 2 0 0 0 2-2h-2"></path><path d="M12 11v4"></path><path d="M10 13h4"></path></svg>
                            <span>Quiz</span>
                        </Link>
                        <Link to="/chat" className={`bottom-nav-item ${isActive('/chat') ? 'active' : ''}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            <span>Chat</span>
                        </Link>
                        <Link to="/levels" className={`bottom-nav-item ${isActive('/levels') ? 'active' : ''}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            <span>{language === 'fr' ? 'Niveaux' : 'Levels'}</span>
                        </Link>
                    </>
                )}

                {(isStudent || isTeacher || isAdmin) && (
                    <Link to="/labs" className={`bottom-nav-item ${isActive('/labs') ? 'active' : ''}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H9a1 1 0 0 0-1 1v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1Z"/><path d="M8 5H5a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3"/><path d="M12 12v6"/><path d="m9 15 3 3 3-3"/></svg>
                        <span>{language === 'fr' ? 'Labs' : 'Labs'}</span>
                    </Link>
                )}
                {isTeacher && (
                    <Link to="/my-views" className={`bottom-nav-item ${isActive('/my-views') ? 'active' : ''}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        <span>{language === 'fr' ? 'Vues' : 'Views'}</span>
                    </Link>
                )}

                {isAdmin && (
                    <>
                        <Link to="/utilisateurs" className={`bottom-nav-item ${isActive('/utilisateurs') ? 'active' : ''}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            <span>{language === 'fr' ? 'G. Util.' : 'Users'}</span>
                        </Link>
                        <Link to="/model" className={`bottom-nav-item ${isActive('/model') ? 'active' : ''}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
                            <span>{language === 'fr' ? 'Models' : 'Models'}</span>
                        </Link>
                        <Link to="/tech" className={`bottom-nav-item ${isActive('/tech') ? 'active' : ''}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                            <span>{language === 'fr' ? 'Tech' : 'Tech'}</span>
                        </Link>
                    </>
                )}

                <Link to="/profile" className={`bottom-nav-item ${isActive('/profile') ? 'active' : ''}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <span>{language === 'fr' ? 'Paramètres' : 'Settings'}</span>
                </Link>
            </nav>

            {/* Global Floating Actions Toggle */}
            <FloatingActionsDrawer />
        </div>
    );
};

export default App;

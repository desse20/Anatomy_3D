import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../../styles/layout.css';

interface AppProps {
    children: React.ReactNode;
    breadcrumb?: string;
    title?: string;
}

const App: React.FC<AppProps> = ({ children, breadcrumb, title }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    
    let user = { firstname: '', lastname: '', email: '', role: '' };
    try {
        const userJson = localStorage.getItem('user');
        if (userJson) {
            user = JSON.parse(userJson);
        }
    } catch (e) {
        console.error("Error parsing user data", e);
    }

    const initials = (user.firstname?.[0] || 'U') + (user.lastname?.[0] || '');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="dash-layout">
            <aside className="dash-sidebar">
                <div className="dash-logo-container">
                    <Link to="/" className="dash-logo">ANATOMY<span>3D</span></Link>
                </div>
                
                <nav className="dash-nav-group">
                    <div className="dash-nav-heading">Plateforme</div>
                    <Link to="/dash" className={`nav-item ${isActive('/dash') ? 'active' : ''}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        Tableau de bord
                    </Link>
                </nav>

                <nav className="dash-nav-group">
                    <div className="dash-nav-heading">Apprentissage</div>
                    <Link to="/atlas" className={`nav-item ${isActive('/atlas') ? 'active' : ''}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        Atlas 3D
                    </Link>
                    <Link to="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        Mon Profil
                    </Link>
                </nav>

                <div className="dash-user-section">
                    {isUserMenuOpen && (
                        <div className="user-dropdown-menu">
                            <Link to="/profile" className="dropdown-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                Paramètres du profil
                            </Link>
                            <div className="dropdown-divider"></div>
                            <button onClick={handleLogout} className="dropdown-item logout">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                Se déconnecter
                            </button>
                        </div>
                    )}
                    
                    <div className="user-profile-bar" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
                        <div className="user-initials-box">
                            {initials}
                        </div>
                        <div className="user-info-text">
                            <span className="user-name">{user.firstname} {user.lastname}</span>
                            <span className="user-email">{user.email}</span>
                        </div>
                        <svg className={`chevron-icon ${isUserMenuOpen ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"></path><path d="m7 9 5-5 5 5"></path></svg>
                    </div>
                </div>
            </aside>

            <main className="dash-main">
                {breadcrumb && <div className="dash-breadcrumb">{breadcrumb}</div>}
                {title && <h1>{title}</h1>}
                {children}
            </main>
        </div>
    );
};

export default App;

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './styles/landing.css';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
        window.location.reload();
    };

    return (
        <div className={`landing-page ${isMenuOpen ? 'menu-open' : ''}`}>
            <nav className="navbar">
                <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>ANATOMY<span>3D</span></div>
                
                <button className="mobile-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    {isMenuOpen ? '×' : '☰'}
                </button>

                <div className={`nav-container ${isMenuOpen ? 'open' : ''}`}>
                    <div className="nav-links">
                        <a href="#features" onClick={() => setIsMenuOpen(false)}>Fonctionnalités</a>
                        <a href="#about" onClick={() => setIsMenuOpen(false)}>À propos</a>
                    </div>
                    <div className="nav-auth">
                        {!token ? (
                            <>
                                <Link to="/login" className="link-login">Connexion</Link>
                                <Link to="/register" className="btn-nav">S'inscrire</Link>
                            </>
                        ) : (
                            <>
                                <Link to="/dash" className="link-login">Dashboard</Link>
                                <button onClick={handleLogout} className="btn-nav btn-logout">Déconnexion</button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            <header className="hero">
                <div className="hero-content">
                    <div className="hero-badge">
                        <span>L'anatomie à portée de main au Bénin 🇧🇯</span>
                    </div>
                    <h1>
                        Maitriser le Corps Humain en <span>3D Interactive.</span>
                    </h1>
                    <p>
                        Si vous êtes en apprentissage en anatomie, découvrez une plateforme révolutionnaire conçue pour les facultés de médecine (FSS/FM). 
                        Une précision médicale sans compromis, accessible partout.
                    </p>
                    <div className="hero-btns">
                        {!token ? (
                            <Link to="/register" className="btn-main">Commencer l'Étude</Link>
                        ) : (
                            <Link to="/dash" className="btn-main">Accéder au Tableau de Bord</Link>
                        )}
                        <a href="#features" className="btn-outline">En savoir plus</a>
                    </div>
                </div>
                <div className="hero-image">
                    <img 
                        src="https://i.pinimg.com/736x/a8/1f/23/a81f230d32134e858c3765390411c9df.jpg" 
                        alt="Anatomy Preview" 
                    />
                </div>
            </header>

            <section className="features" id="features">
                <div className="section-header">
                    <h2>Une Expérience d'Apprentissage Incomparable</h2>
                    <p className="section-subtitle">
                        Découvrez une nouvelle façon d'explorer le corps humain grâce à nos outils de visualisation optimisés.
                    </p>
                </div>

                <div className="feature-grid">
                    <div className="feature-item">
                        <div className="feature-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20M5.5 5.5l13 13M18.5 5.5l-13 13"/></svg>
                        </div>
                        <h3>Squelette 3D Précis</h3>
                        <p>Visualisation détaillée du système osseux basée sur des scans médicaux réels, optimisée pour un apprentissage rigoureux.</p>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 8-8 8M8 8l8 8"/></svg>
                        </div>
                        <h3>Raycasting Interactif</h3>
                        <p>Identification instantanée des structures anatomiques par interaction directe sur le modèle 3D.</p>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="m10 14 2 2 4-4"/></svg>
                        </div>
                        <h3>Accès Hors-Ligne</h3>
                        <p>Étudiez même sans connexion internet grâce à notre système de stockage local intelligent des modèles.</p>
                    </div>
                </div>
            </section>

            <section className="about-section" id="about">
                <div className="about-image">
                    <img 
                        src="https://i.pinimg.com/736x/82/33/2c/82332cb942af1f447c67e24b650a1a82.jpg" 
                        alt="Mobile Preview" 
                    />
                </div>
                <div className="about-content">
                    <h2>Au service de l'Excellence Médicale au Bénin.</h2>
                    <p>
                        Développé spécifiquement pour répondre aux défis des étudiants de la <strong>FSS</strong> et de la <strong>FM</strong>, ce projet vise à démocratiser l'accès à des outils pédagogiques de pointe.
                    </p>
                    <p>
                        Notre technologie de compression Draco permet de naviguer parmi des milliers de polygones sur n'importe quel smartphone, garantissant une fluidité de 30 FPS.
                    </p>
                    <ul className="check-list">
                        <li><span>✓</span> Optimisé pour les terminaux mobiles</li>
                        <li><span>✓</span> Données médicales validées</li>
                        <li><span>✓</span> Initiative éducative locale</li>
                    </ul>
                </div>
            </section>

            <footer className="landing-footer">
                <div className="footer-grid">
                    <div className="footer-info">
                        <div className="logo white">ANATOMY<span>3D</span></div>
                        <p>
                            Simplifier l'apprentissage de l'anatomie grâce à la technologie 3D haute définition. Une initiative dédiée à l'excellence médicale.
                        </p>
                    </div>
                    <div className="footer-links">
                        <h4>Ressources</h4>
                        <ul>
                            <li>Documentation</li>
                            <li>Tutoriels 3D</li>
                        </ul>
                    </div>
                    <div className="footer-links">
                        <h4>Contact</h4>
                        <ul>
                            <li>Support technique</li>
                            <li>FSS / Université d'Abomey-Calavi</li>
                        </ul>
                    </div>
                </div>
                <div className="footer-bottom">
                    © 2026 Anatomy 3D Explorer. L'anatomie à portée de main au Bénin.
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;

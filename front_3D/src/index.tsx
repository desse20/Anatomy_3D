import React from 'react';
import { Link } from 'react-router-dom';
import './styles/landing.css';

const LandingPage: React.FC = () => {
    return (
        <div className="landing-page">
            <nav className="navbar">
                <div className="logo">ANATOMY<span>3D</span></div>
                <div className="nav-links">
                    <a href="#features">Fonctionnalités</a>
                    <a href="#about">À propos</a>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Link to="/login" style={{ textDecoration: 'none', color: 'var(--text-main)', fontWeight: '700', padding: '10px 20px' }}>Connexion</Link>
                    <Link to="/register" className="btn-nav">S'inscrire</Link>
                </div>
            </nav>

            <header className="hero">
                <div className="hero-content">
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(12, 121, 242, 0.08)', color: 'var(--primary)', borderRadius: '100px', fontSize: '11px', fontWeight: '800', marginBottom: '20px', border: '1px solid rgba(12, 121, 242, 0.15)' }}>
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
                        <Link to="/register" className="btn-main">Commencer l'Étude</Link>
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
                    <p style={{ color: 'var(--text-muted)', maxWidth: '700px', margin: '0 auto' }}>
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

            <section id="about" style={{ padding: '100px 10%', display: 'flex', gap: '80px', alignItems: 'center', background: 'var(--bg-white)' }}>
                <div style={{ flex: 0.7, display: 'flex', justifyContent: 'center' }}>
                    <img 
                        src="https://i.pinimg.com/736x/82/33/2c/82332cb942af1f447c67e24b650a1a82.jpg" 
                        alt="Mobile Preview" 
                        style={{ width: '100%', maxWidth: '450px', borderRadius: '30px', boxShadow: '0 40px 80px rgba(0,0,0,0.15)' }} 
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '42px', fontWeight: '800', marginBottom: '24px' }}>Au service de l'Excellence Médicale au Bénin.</h2>
                    <p style={{ fontSize: '18px', color: 'var(--text-muted)', marginBottom: '32px' }}>
                        Développé spécifiquement pour répondre aux défis des étudiants de la <strong>FSS</strong> et de la <strong>FM</strong>, ce projet vise à démocratiser l'accès à des outils pédagogiques de pointe.
                    </p>
                    <p style={{ fontSize: '18px', color: 'var(--text-muted)', marginBottom: '32px' }}>
                        Notre technologie de compression Draco permet de naviguer parmi des milliers de polygones sur n'importe quel smartphone, garantissant une fluidité de 30 FPS.
                    </p>
                    <ul style={{ listStyle: 'none' }}>
                        <li style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600' }}>
                           <span style={{ color: 'var(--primary)' }}>✓</span> Optimisé pour les terminaux mobiles
                        </li>
                        <li style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600' }}>
                           <span style={{ color: 'var(--primary)' }}>✓</span> Données médicales validées
                        </li>
                        <li style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600' }}>
                           <span style={{ color: 'var(--primary)' }}>✓</span> Initiative éducative locale
                        </li>
                    </ul>
                </div>
            </section>

            <section id="roles" style={{ padding: '100px 10%', background: 'var(--bg-light)' }}>
                <div className="section-header">
                    <h2>Une Plateforme, Deux Missions</h2>
                    <p>Répondre aux besoins spécifiques de la communauté académique médicale.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                    <div style={{ background: 'white', padding: '40px', borderRadius: '20px', boxShadow: 'var(--shadow)' }}>
                        <div style={{ width: '50px', height: '50px', background: 'var(--accent-light)', color: 'var(--primary)', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '24px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
                        </div>
                        <h3 style={{ fontSize: '24px', marginBottom: '15px' }}>Pour les Étudiants</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                            Visualisez des structures complexes en 3D, maîtrisez la nomenclature anatomique et préparez vos examens avec des outils d'auto-évaluation interactifs.
                        </p>
                        <ul style={{ listStyle: 'none', color: 'var(--text-main)', fontWeight: '600' }}>
                            <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: 'var(--primary)' }}>•</span> Exploration libre des systèmes
                            </li>
                            <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: 'var(--primary)' }}>•</span> Quiz d'entraînement dynamique
                            </li>
                            <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: 'var(--primary)' }}>•</span> Accès mobile 24h/24
                            </li>
                        </ul>
                    </div>
                    <div style={{ background: 'white', padding: '40px', borderRadius: '20px', boxShadow: 'var(--shadow)' }}>
                        <div style={{ width: '50px', height: '50px', background: 'var(--accent-light)', color: 'var(--primary)', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '24px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2z"/></svg>
                        </div>
                        <h3 style={{ fontSize: '24px', marginBottom: '15px' }}>Pour les Professeurs</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                            Utilisez un support pédagogique moderne pour vos cours magistraux. Référentiel anatomique validé pour illustrer vos démonstrations cliniques.
                        </p>
                        <ul style={{ listStyle: 'none', color: 'var(--text-main)', fontWeight: '600' }}>
                            <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: 'var(--primary)' }}>•</span> Support de cours interactif
                            </li>
                            <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: 'var(--primary)' }}>•</span> Illustration de pathologies
                            </li>
                            <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: 'var(--primary)' }}>•</span> Outil de référence académique
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <footer style={{ padding: '80px 10% 40px', background: '#09111A', color: 'white' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '80px', marginBottom: '60px' }}>
                    <div>
                        <div className="logo" style={{ color: 'white', marginBottom: '24px' }}>ANATOMY<span style={{ color: 'var(--primary)' }}>3D</span></div>
                        <p style={{ color: 'var(--grey-60)', lineHeight: '1.8' }}>
                            Simplifier l'apprentissage de l'anatomie grâce à la technologie 3D haute définition. Une initiative dédiée à l'excellence médicale.
                        </p>
                    </div>
                    <div>
                        <h4 style={{ marginBottom: '24px', fontSize: '18px' }}>Ressources</h4>
                        <ul style={{ listStyle: 'none', color: 'var(--n-grey-40)', display: 'grid', gap: '12px' }}>
                            <li>Documentation</li>
                            <li>Tutoriels 3D</li>
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ marginBottom: '24px', fontSize: '18px' }}>Contact</h4>
                        <ul style={{ listStyle: 'none', color: 'var(--n-grey-40)', display: 'grid', gap: '12px' }}>
                            <li>Support technique</li>
                            <li>FSS / Université d'Abomey-Calavi</li>
                        </ul>
                    </div>
                </div>
                <div style={{ paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', color: 'var(--n-grey-60)', fontSize: '14px' }}>
                    © 2026 Anatomy 3D Explorer. L'anatomie à portée de main au Bénin.
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;

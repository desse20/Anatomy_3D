/**
 * Test.tsx — Version Finale avec Inscription Complète & Email à jour
 * Features: Password visibility toggle, updated email, active scroll links.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from './services/api';
import './styles/landing.css';

/* ── SVGs ── */
const ArrowSm = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M0.972942 8.47123C0.727161 8.71701 0.727161 9.1155 0.972942 9.36129C1.21872 9.60707 1.61721 9.60707 1.863 9.36129L1.41797 8.91626L0.972942 8.47123ZM9.8798 1.08379C9.8798 0.736203 9.59803 0.454427 9.25044 0.454427H3.58617C3.23859 0.454427 2.95681 0.736203 2.95681 1.08379C2.95681 1.43138 3.23859 1.71315 3.58617 1.71315L8.62108 1.71315V6.74805C8.62108 7.09564 8.90285 7.37742 9.25044 7.37742C9.59803 7.37742 9.8798 7.09564 9.8798 6.74805V1.08379ZM1.41797 8.91626L1.863 9.36129L9.69547 1.52882L9.25044 1.08379L8.80541 0.638763L0.972942 8.47123L1.41797 8.91626Z" fill="white"/>
  </svg>
);

const ArrowLg = () => (
  <svg width="33" height="33" viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.433594" y="0.171875" width="32" height="32" rx="16" fill="currentColor"/>
    <path d="M12.0226 19.5929C11.7492 19.8663 11.7492 20.3095 12.0226 20.5829C12.296 20.8562 12.7392 20.8562 13.0126 20.5829L12.0226 19.5929ZM21.05 12.2554C21.05 11.8688 20.7366 11.5554 20.35 11.5554L14.05 11.5554C13.6634 11.5554 13.35 11.8688 13.35 12.2554C13.35 12.642 13.6634 12.9554 14.05 12.9554L19.65 12.9554L19.65 18.5554C19.65 18.942 19.9634 19.2554 20.35 19.2554C20.7366 19.2554 21.05 18.942 21.05 18.5554L21.05 12.2554ZM13.0126 20.5829L20.845 12.7504L19.8551 11.7604L12.0226 19.5929L13.0126 20.5829Z" fill="white"/>
  </svg>
);

const ArrowBlue = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M0.638958 8.47123C0.393176 8.71701 0.393176 9.1155 0.638958 9.36129C0.884739 9.60707 1.28323 9.60707 1.52901 9.36129L1.08398 8.91626L0.638958 8.47123ZM9.54582 1.08379C9.54582 0.736203 9.26404 0.454427 8.91645 0.454427H3.25219C2.9046 0.454427 2.62283 0.736203 2.62283 1.08379C2.62283 1.43138 2.9046 1.71315 3.25219 1.71315L8.28709 1.71315V6.74805C8.28709 7.09564 8.56887 7.37742 8.91645 7.37742C9.26404 7.37742 9.54582 7.09564 9.54582 6.74805V1.08379ZM1.08398 8.91626L1.52901 9.36129L9.36148 1.52882L8.91645 1.08379L8.47143 0.638763L0.638958 8.47123L1.08398 8.91626Z" fill="#9DC7FF"/>
  </svg>
);

const EyeOpen = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
);

const EyeClosed = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
);

/* ── SERVICES DATA ── */
const SERVICES = [
  {
    id: "viewer-3d",
    title: "Atlas 3D Interactif",
    desc: "Prenez le contrôle total de l'anatomie : rotation, dissection et transparence en temps réel pour une compréhension spatiale sans précédent.",
    img: "https://storage.googleapis.com/dev_resources_voka_io_303011/common/advanced-MoD-animation.webp",
    href: "/atlas",
  },
  {
    id: "prof-tools",
    title: "Outils de Transmission",
    desc: "Professeurs, générez des liens directs vers des structures précises. Fini les schémas au tableau, partagez la 3D en un clic avec vos étudiants.",
    img: "https://storage.googleapis.com/dev_resources_voka_io_303011/video%20posters/advanced-moa.webp",
    href: "#",
  },
  {
    id: "quiz-secondary",
    title: "Auto-évaluation Intelligente",
    desc: "Après la manipulation, testez vos connaissances avec des QCM et Vrai/Faux générés par IA basés sur votre session d'étude.",
    img: "https://storage.googleapis.com/dev_resources_voka_io_303011/common/advanced-medical-device-animation.webp",
    href: "/quiz",
  },
  {
    id: "mobile-tech",
    title: "Liberté Totale",
    desc: "Étudiez au laboratoire ou à la maison. L'atlas 3D est fluide sur tous supports pour un apprentissage sans contrainte technique.",
    img: "https://storage.googleapis.com/dev_resources_voka_io_303011/common/advanced-biotech.webp",
    href: "#",
  },
  {
    id: "offline-mode",
    title: "Focus & Immersion",
    desc: "Plongez dans les détails sans distractions. Un environnement conçu pour la concentration et la mémorisation visuelle.",
    img: "https://storage.googleapis.com/dev_resources_voka_io_303011/video%20posters/advanced-surgery.webp",
    href: "#",
  },
];

/* ── RIGHT ITEMS ── */
const MODELING_ITEMS = [
  { title: "Visualisation Directe", desc: "Contrôle total des structures anatomiques sans intermédiaire.", href: "/atlas" },
  { title: "Génération de Liens", desc: "Professeurs : ciblez une partie et partagez-la instantanément.", href: "/atlas" },
  { title: "Raycasting Précis", desc: "Identifiez chaque organe et structure par simple survol.", href: "/atlas" },
  { title: "Quiz IA Adaptatifs", desc: "S'évaluer après avoir manipulé le modèle 3D.", href: "/quiz" },
];

/* ── MAIN COMPONENT ── */
const TestPage: React.FC = () => {
  const navigate = useNavigate();
  const token    = localStorage.getItem('token');

  const [skinny,               setSkinny]              = useState(false);
  const [activeSection,        setActiveSection]       = useState('hiro');
  const [mobileOpen,           setMobileOpen]          = useState(false);
  const [showPassword,         setShowPassword]        = useState(false);
  const [showConfirmPassword,  setShowConfirmPassword] = useState(false);
  const [formData,             setFormData]            = useState({ firstname:'', lastname:'', email:'', password:'', confirmPassword:'', profile:'student' });
  const [error,                setError]               = useState<string | null>(null);
  const [sent,                 setSent]                = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY || document.documentElement.scrollTop;
      setSkinny(scrolled > 20);
    };
    const observedIds = ['hiro', 'features', 'quiz', 'about', 'register'];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          setActiveSection(entry.target.id);
        }
      });
    }, { threshold: 0.5 });
    observedIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    window.location.reload();
  };

  const handleField = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    try {
      const resp = await authService.register({
        firstname: formData.firstname,
        lastname: formData.lastname,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
        role: formData.profile === 'professor' ? 'teacher' : 'student'
      });
      if (resp?.token) localStorage.setItem('token', resp.token);
      if (resp?.data)  localStorage.setItem('user', JSON.stringify(resp.data));
      setSent(true);
      setTimeout(() => navigate('/dash'), 1500);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription.");
    }
  };

  return (
    <div id="page" className="site">
      <header id="masthead" ref={headerRef} className={`site-header${skinny || mobileOpen ? ' skinny' : ''}`}>
        <div className="left-side">
          <span className="header-logo" onClick={() => navigate('/test')}>
            ANATOMY<span>3D</span>
          </span>
          <div className="header-links-wrapper">
            <a href="#features" className={`header-link${activeSection === 'features' ? ' active' : ''}`}>Visualiseur 3D</a>
            <a href="#quiz"     className={`header-link${activeSection === 'quiz' ? ' active' : ''}`}>Apprentissage</a>
            <a href="#about"    className={`header-link${activeSection === 'about' ? ' active' : ''}`}>À propos</a>
          </div>
        </div>
        <div className="right-side">
          {!token ? (
            <>
              <Link to="/login"    className="header-link">Connexion</Link>
              <a href="#register" className="demo-button custom-button blue">S'inscrire &nbsp;<ArrowLg /></a>
            </>
          ) : (
            <>
              <Link to="/dash" className="header-link">Dashboard</Link>
              <button onClick={handleLogout} className="demo-button custom-button blue arrows-button-blue">Déconnexion</button>
            </>
          )}
          <button id="mobile-menu-button" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen
              ? <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.34277 1.34277L12.6565 12.6565" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M1.34277 12.6572L12.6565 1.34352" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              : <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M10.9082 15.4541H29.09" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M10.9082 24.5459H29.09" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            }
          </button>
        </div>
      </header>

      <nav className={`mobile-header-menu${mobileOpen ? ' open' : ''}`}>
        <a href="#features" className={`header-link${activeSection === 'features' ? ' active' : ''}`} onClick={() => setMobileOpen(false)}>Visualiseur 3D</a>
        <a href="#quiz"     className={`header-link${activeSection === 'quiz' ? ' active' : ''}`} onClick={() => setMobileOpen(false)}>Apprentissage</a>
        <a href="#about"    className={`header-link${activeSection === 'about' ? ' active' : ''}`} onClick={() => setMobileOpen(false)}>À propos</a>
        <div className="bottom-mobile">
          {!token ? (
            <a href="#register" className="custom-button blue large" onClick={() => setMobileOpen(false)}>
              S'inscrire <ArrowLg />
            </a>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <Link to="/dash" className="custom-button blue large" onClick={() => setMobileOpen(false)}>
                Dashboard <ArrowLg />
              </Link>
              <button 
                onClick={() => { handleLogout(); setMobileOpen(false); }} 
                className="custom-button white large"
                style={{ justifyContent: 'center' }}
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </nav>

      <section className="hiro-section" id="hiro">
        <div className="background-layout">
          <img src="https://storage.googleapis.com/dev_resources_voka_io_303011/common/Frame%201597887620%20(1).webp" alt="Anatomy 3D" />
        </div>
        <div className="hiro-section-content">
          <h1 className="main-h1">Maîtrisez l'Anatomie Humaine par Immersion 3D Totale</h1>
          <p className="subtitle-semibold">Explorez, manipulez et interagissez avec le corps humain en temps réel. Destiné aux étudiants pour une visualisation précise et aux professeurs pour moderniser leurs cours sans dessins manuels.</p>
          {!token ? <a href="#register" className="custom-button blue large">Démarrer gratuitement <ArrowLg /></a> : <Link to="/dash" className="custom-button blue large">Accéder à mon espace <ArrowLg /></Link>}
        </div>
      </section>

      <section className="about-us-columns-cards-section" id="about">
        <div className="about-us-columns-cards-header">
          <div className="about-us-columns-cards-tab"><div className="about-us-columns-cards-dot"></div><p className="subtitle-semibold">Notre Mission</p></div>
          <p className="main-h3">Remplacer le schéma traditionnel par l'interaction 3D immersive pour une meilleure compréhension spatiale</p>
        </div>
        <div className="about-us-columns-grid">
          {[
            { label: 'Modèle 3D complet',   value: '1', nowrap: true },
            { label: 'Quiz générés',     value: '5 000+', nowrap: true },
            { label: 'Outils Professeurs',  value: 'Lien direct', nowrap: true },
            { label: 'Langues supportées',    value: 'Français & Anglais', nowrap: false },
          ].map((s, i) => (
            <div key={i} className="about-us-columns-grid-item">
              <p className="subtitle-semibold">{s.label}</p>
              <p className={`main-numbers ${s.nowrap ? 'no-wrap' : ''}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="advanced-visualization-section" id="features">
        <div className="advanced-visualization-header">
          <div className="advanced-visualization-tab"><div className="advanced-visualization-dot"></div><p className="subtitle-semibold">L'expérience</p></div>
          <h2 className="main-h2">Visualisation, Contrôle & Enseignement</h2>
        </div>
        <div className="advanced-visualization-grid">
          {SERVICES.map((s, i) => (
            <Link key={i} className="grid-item" to={s.href}>
              <div className="grid-item-bg-layout"><img className="grid-item-bg-image" src={s.img} alt={s.title} /><div className="link-arrow-icon"><ArrowSm /></div></div>
              <div className="grid-item-content"><p className="main-h4">{s.title}</p><p className="main-text-medium">{s.desc}</p></div>
            </Link>
          ))}
          <div className="grid-item portfolio-grid-item"><Link to="/quiz" className="custom-button white large">S'évaluer maintenant <ArrowLg /></Link></div>
        </div>
      </section>

      <section className="centered-footer-cta-section" id="quiz">
        <div className="cta-content">
          <p className="cta-subtitle">De l'observation à la maîtrise</p>
          <div className="line-with-dot"><div className="line"></div><div className="dot"></div><div className="line"></div></div>
          <p className="main-h3">Après la visualization 3D, testez vos connaissances avec nos <span style={{ color: '#9DC7FF' }}>Quiz Interactifs</span> sur mesure.</p>
        </div>
        <Link to="/quiz" className="custom-button white large">Accéder aux Quiz <ArrowLg /></Link>
      </section>

      <section className="modeling-and-simulation-section">
        <div className="modeling-and-simulation-header">
          <div className="modeling-simulation-tab"><div className="modeling-simulation-dot"></div><p className="subtitle-semibold">L'outil Professeurs</p></div>
          <h2 className="main-h2">Fini les dessins au tableau & les atlas papier coûteux</h2>
        </div>
        <div className="modeling-and-simulation-grid">
          <Link className="left-item" to="/atlas">
            <div className="left-video-overlay"><img src="https://storage.googleapis.com/dev_resources_voka_io_303011/common/voka-product-image.webp" alt="Enseignement" /></div>
            <p className="main-h4">Partage de structures ciblées</p>
            <p className="main-text-medium">Générez un lien unique vers un organe et partagez-le instantanément. Évitez les atlas papier onéreux pour de simples visuels et passez à l'immersion 3D totale.</p>
            <div className="arrow-icon"><ArrowSm /></div>
          </Link>
          <div className="right-items-col">
            {MODELING_ITEMS.map((item, i) => (
              <Link key={i} className="right-item" to={item.href}>
                <div className="right-item-text"><p className="main-h4">{item.title}</p><p className="main-text-medium">{item.desc}</p></div>
                <div className="arrow-icon"><ArrowBlue /></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="product-suite-section">
        <img className="left-highlight-gradient" src="https://storage.googleapis.com/dev_resources_voka_io_303011/common/left-highlight-gradient.webp" alt="" />
        <img className="right-highlight-gradient" src="https://storage.googleapis.com/dev_resources_voka_io_303011/common/right-highlight-gradient.webp" alt="" />
        <div className="product-suite-header">
          <div className="product-suite-tab"><div className="product-suite-dot"></div><p className="subtitle-semibold">La Suite Anatomy 3D</p></div>
          <h2 className="main-h2">Conçu pour les Étudiants et les Professeurs</h2>
        </div>
        <div className="product-suite-items">
          <div className="product-suite-item">
            <div className="product-suite-item-image"><img src="https://storage.googleapis.com/dev_resources_voka_io_303011/common/voka-product-image.webp" alt="Visualiseur" /></div>
            <div className="product-suite-item-content">
              <p className="main-h3">Atlas Complet en Anatomie Humaine</p>
              <p className="main-text-medium">Explorez chaque détail, identifiez les structures et manipulez le modèle 3D avec une liberté totale pour une mémorisation visuelle durable.</p>
              <Link to="/atlas" className="custom-button white large explore-button">Visualiser <ArrowLg /></Link>
            </div>
          </div>
          <div className="product-suite-item">
            <div className="product-suite-item-image"><img src="https://storage.googleapis.com/dev_resources_voka_io_303011/common/wiki-product-image.webp" alt="Outils" /></div>
            <div className="product-suite-item-content">
              <p className="main-h3">Évaluation & Transmission</p>
              <p className="main-text-medium">Plus qu'un atlas : un outil de partage pour les enseignants et une batterie de tests interactifs pour les étudiants voulant valider leurs acquis.</p>
              <Link to="/quiz" className="custom-button white large explore-button">Tester <ArrowLg /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-form-section dark-theme" id="register">
        <div className="left-side">
          <div className="left-side-content">
            {!token ? (
              <>
                <div className="form-description">
                  <h2>Commencez dès maintenant</h2>
                  <p className="main-text-medium">Créez votre compte pour sauvegarder votre progression et accéder aux outils enseignants.</p>
                </div>
                {error && <div style={{ padding: '12px', background: 'rgba(255,0,0,.15)', border: '1px solid rgba(255,0,0,.3)', borderRadius: 12, color: '#ffb3b3', fontSize: 13, marginBottom: 20 }}>✕ {error}</div>}
                {sent && <div style={{ padding: '14px 20px', background: 'rgba(5,108,242,.2)', border: '1px solid rgba(5,108,242,.4)', borderRadius: 12, color: '#9DC7FF', fontSize: 14, marginBottom: 20 }}>✓ Inscription réussie !</div>}
                <form className="form-container" onSubmit={handleSubmit}>
                  <div className="top-fields">
                    <p><label htmlFor="ct-fname">Prénom</label><input id="ct-fname" name="firstname" type="text" placeholder="Ex: Koffi" value={formData.firstname} onChange={handleField} required /></p>
                    <p><label htmlFor="ct-lname">Nom</label><input id="ct-lname" name="lastname" type="text" placeholder="Ex: SOGLO" value={formData.lastname} onChange={handleField} required /></p>
                    <p style={{ gridColumn: '1 / -1' }}><label htmlFor="ct-email">Email</label><input id="ct-email" name="email" type="email" placeholder="votre@email.com" value={formData.email} onChange={handleField} required /></p>
                    <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <p><label htmlFor="ct-pass">Mot de passe</label>
                        <div className="password-input-wrapper">
                          <input id="ct-pass" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password} onChange={handleField} required />
                          <span className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeClosed /> : <EyeOpen />}</span>
                        </div>
                      </p>
                      <p><label htmlFor="ct-conf">Confirmation</label>
                        <div className="password-input-wrapper">
                          <input id="ct-conf" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={formData.confirmPassword} onChange={handleField} required />
                          <span className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeClosed /> : <EyeOpen />}</span>
                        </div>
                      </p>
                    </div>
                    <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,.65)', marginBottom: '10px', display: 'block' }}>QUEL PROFIL VOUS CORRESPOND ?</label>
                      <div style={{ display: 'flex', gap: '20px' }}>
                        <label style={{ color: '#fff', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><input type="radio" name="profile" value="student" checked={formData.profile === 'student'} onChange={handleField} /> Étudiant</label>
                        <label style={{ color: '#fff', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><input type="radio" name="profile" value="professor" checked={formData.profile === 'professor'} onChange={handleField} /> Professeur</label>
                      </div>
                    </div>
                  </div>
                  <div className="middle-fields" style={{ marginTop: '24px' }}>
                    <p id="form-agree">
                      <span className="description-medium">En cliquant sur Démarrer maintenant, vous accédez à l'expérience complète Anatomy 3D.</span>
                      <button type="submit" className="custom-button blue large arrows-button-blue" style={{ width: '100%', justifyContent: 'center' }}>Démarrer maintenant <ArrowLg /></button>
                    </p>
                  </div>
                </form>
              </>
            ) : (
              <div className="welcome-back-card" style={{ padding: '40px 0' }}>
                <h2 style={{ fontSize: '36px', marginBottom: '20px', color: '#fff' }}>Bon retour parmi nous !</h2>
                <p className="main-text-medium" style={{ marginBottom: '30px', opacity: 0.8, color: 'rgba(255,255,255,0.8)' }}>
                  Vous êtes déjà connecté à votre espace personnel. Prêt à reprendre votre exploration de l'anatomie humaine ?
                </p>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <Link to="/atlas" className="custom-button blue large">Aller à l'Atlas <ArrowLg /></Link>
                  <Link to="/dash" className="custom-button white large">Mon Dashboard <ArrowLg /></Link>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="right-side">
          <div className="description-wrapper">
            <div className="banner-titles"><p className="h3-small">Visualisation, Interactions, Maîtrise —</p><p className="main-text-medium">Une nouvelle façon d'enseigner et d'apprendre l'anatomie.</p></div>
            <div className="banner-list-wrapper">
              <p className="main-text-bold">L'essentiel :</p>
              <div className="banner-list bullets">
                {["Visualisation 3D directe", "Génération de liens pour les cours", "Évaluation par quiz IA", "Contrôle total des structures"].map((txt, i) => (
                  <div key={i} className="list-item"><div className="item-bullet"></div><p className="main-text-medium">{txt}</p></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer id="colophon" className="site-footer">
        <div className="footer-container">
          <div className="footer-content">
            {[
              { title: 'Outils', links: [{ label: 'Visualiseur 3D', href: '/atlas' }, { label: 'Quiz Interactifs', href: '/quiz' }, { label: 'Outil Professeur', href: '#' }]},
              { title: 'Informations', links: [{ label: 'À propos', href: '#about' }, { label: 'Conditions', href: '#' }]},
              { title: 'Accès', links: [
                { label: token ? 'Dashboard' : 'Connexion', href: token ? '/dash' : '/login' },
                { label: token ? 'Mon Profil' : 'S\'inscrire', href: token ? '/profile' : '#register' }
              ]},
            ].map((col, ci) => (
              <div key={ci} className="menu-block">
                <div className="footer-section">
                  <p className="menu-title">{col.title}</p>
                  <ul className="menu">
                    {col.links.map((lnk, li) => (
                      <li key={li}>
                        {lnk.href.startsWith('#') ? (
                          <a href={lnk.href}>{lnk.label}</a>
                        ) : (
                          <Link to={lnk.href}>{lnk.label}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          <div className="footer-information">
            <div className="footer-info-logo-container">
              <span className="footer-logo">ANATOMY<span>3D</span></span>
              <p className="footer-info-text">Maîtriser l'anatomie humaine par la manipulation 3D directe et l'évaluation personnalisée.</p>
            </div>
            <div className="footer-contacts-desktop">
              <div className="contact-items"><a href="mailto:anatomy3d@gmail.com">anatomy3d@gmail.com</a></div>
              {!token ? (
                <a href="#register" className="custom-button blue large without-arrow desktop-contact-us">Démarrer maintenant</a>
              ) : (
                <Link to="/dash" className="custom-button blue large without-arrow desktop-contact-us">Dashboard</Link>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TestPage;

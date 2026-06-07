/**
 * index.tsx — Version Finale avec Inscription Complète & Email à jour
 * Features: Password visibility toggle, updated email, active scroll links.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService, apiCall, reviewService } from './services/api';
import { useLanguage } from './contexts/LanguageContext';
import FloatingActionsDrawer from './components/FloatingActionsDrawer';
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
const getServices = (lang: string) => [
  {
    id: "viewer-3d",
    title: lang === 'fr' ? "Atlas 3D Interactif" : "Interactive 3D Atlas",
    desc: lang === 'fr' ? "Prenez le contrôle total de l'anatomie : rotation, dissection et transparence en temps réel pour une compréhension spatiale sans précédent." : "Take full control of anatomy: real-time rotation, dissection, and transparency for unprecedented spatial understanding.",
    img: "https://storage.googleapis.com/dev_resources_voka_io_303011/common/advanced-MoD-animation.webp",
    href: "/atlas",
  },
  {
    id: "prof-tools",
    title: lang === 'fr' ? "Outils de Transmission" : "Transmission Tools",
    desc: lang === 'fr' ? "Professeurs, générez des liens directs vers des structures précises. Fini les schémas au tableau, partagez la 3D en un clic avec vos étudiants." : "Teachers, generate direct links to specific structures. No more blackboard drawings, share 3D in one click with your students.",
    img: "https://storage.googleapis.com/dev_resources_voka_io_303011/video%20posters/advanced-moa.webp",
    href: "#",
  },
  {
    id: "quiz-secondary",
    title: lang === 'fr' ? "Auto-évaluation Intelligente" : "Smart Self-evaluation",
    desc: lang === 'fr' ? "Après la manipulation, testez vos connaissances avec des QCM et Vrai/Faux générés par IA basés sur votre session d'étude." : "After manipulation, test your knowledge with AI-generated MCQs and True/False based on your study session.",
    img: "https://storage.googleapis.com/dev_resources_voka_io_303011/common/advanced-medical-device-animation.webp",
    href: "/quiz",
  },
  {
    id: "mobile-tech",
    title: lang === 'fr' ? "Liberté Totale" : "Total Freedom",
    desc: lang === 'fr' ? "Étudiez au laboratoire ou à la maison. L'atlas 3D est fluide sur tous supports pour un apprentissage sans contrainte technique." : "Study in the lab or at home. The 3D atlas runs smoothly on all devices for learning without technical constraints.",
    img: "https://storage.googleapis.com/dev_resources_voka_io_303011/common/advanced-biotech.webp",
    href: "#",
  },
  {
    id: "offline-mode",
    title: lang === 'fr' ? "Focus & Immersion" : "Focus & Immersion",
    desc: lang === 'fr' ? "Plongez dans les détails sans distractions. Un environnement conçu pour la concentration et la mémorisation visuelle." : "Dive into the details without distractions. An environment designed for concentration and visual retention.",
    img: "https://storage.googleapis.com/dev_resources_voka_io_303011/video%20posters/advanced-surgery.webp",
    href: "#",
  },
];

/* ── RIGHT ITEMS ── */
const getModelingItems = (lang: string) => [
  { title: lang === 'fr' ? "Visualisation Directe" : "Direct Visualization", desc: lang === 'fr' ? "Contrôle total des structures anatomiques sans intermédiaire." : "Full control of anatomical structures without intermediaries.", href: "/atlas" },
  { title: lang === 'fr' ? "Génération de Liens" : "Link Generation", desc: lang === 'fr' ? "Professeurs : ciblez une partie et partagez-la instantanément." : "Professors: target a part and share it instantly.", href: "/atlas" },
  { title: lang === 'fr' ? "Raycasting Précis" : "Precise Raycasting", desc: lang === 'fr' ? "Identifiez chaque organe et structure par simple survol." : "Identify every organ and structure by simply hovering.", href: "/atlas" },
  { title: lang === 'fr' ? "Quiz IA Adaptatifs" : "Adaptive AI Quizzes", desc: lang === 'fr' ? "S'évaluer après avoir manipulé le modèle 3D." : "Evaluate yourself after manipulating the 3D model.", href: "/quiz" },
];

/* ── MAIN COMPONENT ── */
const TestPage: React.FC = () => {
  const navigate = useNavigate();
  const token    = localStorage.getItem('token');
  const { language, setLanguage } = useLanguage();

  const [skinny,               setSkinny]              = useState(false);
  const [activeSection,        setActiveSection]       = useState('hiro');
  const [mobileOpen,           setMobileOpen]          = useState(false);
  const [showPassword,         setShowPassword]        = useState(false);
  const [showConfirmPassword,  setShowConfirmPassword] = useState(false);
  const [formData,             setFormData]            = useState({ firstname:'', lastname:'', email:'', password:'', confirmPassword:'', profile:'student', code:'' });
  const [error,                setError]               = useState<string | null>(null);
  const [sent,                 setSent]                = useState(false);
  const [step,                 setStep]                = useState(1);
  const [publicStats,          setPublicStats]         = useState<{models_count: number, quizzes_count: number}>({ models_count: 1, quizzes_count: 5000 });
  const [reviews,              setReviews]             = useState<any[]>([]);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResp, reviewsResp] = await Promise.all([
          apiCall('/public/stats'),
          reviewService.getPublic(),
        ]);
        if (statsResp) setPublicStats(statsResp);
        if (Array.isArray(reviewsResp)) setReviews(reviewsResp);
      } catch (err) { console.error("Public data fetch failed", err); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (window.location.hash) {
      setTimeout(() => {
        const el = document.querySelector(window.location.hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

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

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    let newCode = (formData.code || '').split('');
    while(newCode.length < 6) newCode.push('');
    newCode[index] = digit;
    
    // Si on a tapé un truc vide mais qu'avant y'avait qqch, on l'enlève
    if (!digit && value === '') newCode[index] = '';

    const stringCode = newCode.join('').slice(0, 6);
    setFormData(p => ({ ...p, code: stringCode }));

    if (digit && index < 5) {
      setTimeout(() => document.getElementById(`otp-${index + 1}`)?.focus(), 10);
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !(formData.code || '')[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste) {
      setFormData(p => ({ ...p, code: paste }));
      setTimeout(() => document.getElementById(`otp-${Math.min(paste.length - 1, 5)}`)?.focus(), 10);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      if (formData.password !== formData.confirmPassword) {
        setError(language === 'fr' ? "Les mots de passe ne correspondent pas." : "Passwords do not match.");
        return;
      }
      try {
        await authService.sendRegistrationCode({
          firstname: formData.firstname,
          lastname: formData.lastname,
          email: formData.email,
          password: formData.password,
          password_confirmation: formData.confirmPassword
        });
        setStep(2);
        setError(null);
      } catch (err: any) {
        setError(err.message || (language === 'fr' ? "Erreur lors de l'envoi du code." : "Error while sending the code."));
      }
    } else {
      try {
        const resp = await authService.register({
          firstname: formData.firstname,
          lastname: formData.lastname,
          email: formData.email,
          password: formData.password,
          password_confirmation: formData.confirmPassword,
          role: formData.profile === 'professor' ? 'teacher' : 'student',
          code: formData.code
        });
        if (resp?.token) localStorage.setItem('token', resp.token);
        if (resp?.data)  localStorage.setItem('user', JSON.stringify(resp.data));
        setSent(true);
        setTimeout(() => navigate('/dash'), 1500);
      } catch (err: any) {
        setError(err.message || (language === 'fr' ? "Erreur lors de l'inscription." : "Error during registration."));
      }
    }
  };

  return (
    <div id="page" className="site">
      <header id="masthead" ref={headerRef} className={`site-header${skinny || mobileOpen ? ' skinny' : ''}`}>
        <div className="left-side">
          <span className="header-logo" onClick={() => navigate('/')}>
            ANATOMY<span>3D</span>
          </span>
          <div className="header-links-wrapper">
            <a href="#features" className={`header-link${activeSection === 'features' ? ' active' : ''}`}>{language === 'fr' ? 'Visualiseur 3D' : '3D Viewer'}</a>
            <a href="#quiz"     className={`header-link${activeSection === 'quiz' ? ' active' : ''}`}>{language === 'fr' ? 'Apprentissage' : 'Learning'}</a>
            <a href="#about"    className={`header-link${activeSection === 'about' ? ' active' : ''}`}>{language === 'fr' ? 'À propos' : 'About Us'}</a>
          </div>
        </div>
        <div className="right-side">
          {!token ? (
            <>
              <Link to="/login"    className="header-link">{language === 'fr' ? 'Connexion' : 'Login'}</Link>
              <a href="#register" className="demo-button custom-button blue">{language === 'fr' ? "S'inscrire" : "Sign Up"} &nbsp;<ArrowLg /></a>
            </>
          ) : (
            <>
              <Link to="/dash" className="header-link">Dashboard</Link>
              <button onClick={handleLogout} className="demo-button custom-button blue arrows-button-blue">{language === 'fr' ? 'Déconnexion' : 'Logout'}</button>
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
        <a href="#features" className={`header-link${activeSection === 'features' ? ' active' : ''}`} onClick={() => setMobileOpen(false)}>{language === 'fr' ? 'Visualiseur 3D' : '3D Viewer'}</a>
        <a href="#quiz"     className={`header-link${activeSection === 'quiz' ? ' active' : ''}`} onClick={() => setMobileOpen(false)}>{language === 'fr' ? 'Apprentissage' : 'Learning'}</a>
        <a href="#about"    className={`header-link${activeSection === 'about' ? ' active' : ''}`} onClick={() => setMobileOpen(false)}>{language === 'fr' ? 'À propos' : 'About Us'}</a>
        
        <div className="bottom-mobile">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', gap: '15px' }} className="lang-switcher-mobile">
            <button onClick={() => setLanguage('fr')} style={{ background: 'none', border: 'none', color: language === 'fr' ? 'var(--blue)' : 'rgba(11,21,33,0.5)', fontSize: '16px', fontWeight: language === 'fr' ? 'bold' : 'normal', cursor: 'pointer', padding: '10px' }}>FR</button>
            <span style={{ color: 'rgba(11,21,33,0.2)', fontSize: '16px', padding: '10px 0' }}>|</span>
            <button onClick={() => setLanguage('en')} style={{ background: 'none', border: 'none', color: language === 'en' ? 'var(--blue)' : 'rgba(11,21,33,0.5)', fontSize: '16px', fontWeight: language === 'en' ? 'bold' : 'normal', cursor: 'pointer', padding: '10px' }}>EN</button>
          </div>

          {!token ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <Link to="/login" className="custom-button outline large" style={{ justifyContent: 'center' }} onClick={() => setMobileOpen(false)}>
                {language === 'fr' ? 'Se connecter' : 'Login'}
              </Link>
              <a href="#register" className="custom-button blue large" style={{ justifyContent: 'center' }} onClick={() => setMobileOpen(false)}>
                {language === 'fr' ? "S'inscrire" : "Sign Up"} <ArrowLg />
              </a>
            </div>
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
                {language === 'fr' ? 'Déconnexion' : 'Logout'}
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
          <div className="hiro-text">
            <h1 className="main-h1">{language === 'fr' ? "Maîtrisez l'Anatomie Humaine par Immersion 3D Totale" : "Master Human Anatomy via Total 3D Immersion"}</h1>
            <p className="subtitle-semibold">{language === 'fr' ? "Explorez, manipulez et interagissez avec le corps humain en temps réel. Destiné aux étudiants pour une visualisation précise et aux professeurs pour moderniser leurs cours sans dessins manuels." : "Explore, manipulate and interact with the human body in real time. Designed for students for precise visualization and for professors to modernize their classes without manual drawings."}</p>
            {!token ? (
              <a href="#register" className="custom-button blue large">{language === 'fr' ? "Démarrer gratuitement" : "Start for free"} <ArrowLg /></a>
            ) : (
              <Link to="/dash" className="custom-button blue large">{language === 'fr' ? "Accéder à mon espace" : "Access my workspace"} <ArrowLg /></Link>
            )}
          </div>

          <div className="hiro-visual">
            <div className="video-phone-frame">
              <iframe 
                src="https://www.youtube.com/embed/qbBPYTuQVnk?autoplay=1&mute=1&controls=0&loop=1&playlist=qbBPYTuQVnk&modestbranding=1&rel=0&disablekb=1&fs=0"
                title="Anatomy 3D Preview"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      <section className="about-us-columns-cards-section" id="about">
        <div className="about-us-columns-cards-header">
          <div className="about-us-columns-cards-tab"><div className="about-us-columns-cards-dot"></div><p className="subtitle-semibold">{language === 'fr' ? "Notre Mission" : "Our Mission"}</p></div>
          <p className="main-h3">{language === 'fr' ? "Remplacer le schéma traditionnel par l'interaction 3D immersive pour une meilleure compréhension spatiale" : "Replacing traditional diagrams with immersive 3D interaction for better spatial understanding"}</p>
        </div>
        <div className="about-us-columns-grid">
          {[
            { label: language === 'fr' ? 'Modèle 3D complet' : 'Complete 3D Model',   value: publicStats.models_count.toString(), nowrap: true },
            { label: language === 'fr' ? 'Quiz générés' : 'Generated Quizzes',     value: `${publicStats.quizzes_count.toLocaleString()}+`, nowrap: true },
            { label: language === 'fr' ? 'Outils Professeurs' : 'Teacher Tools',  value: language === 'fr' ? 'Lien direct' : 'Direct link', nowrap: true },
            { label: language === 'fr' ? 'Langues supportées' : 'Supported Languages',    value: language === 'fr' ? 'Français & Anglais' : 'French & English', nowrap: false },
          ].map((s, i) => (
            <div key={i} className="about-us-columns-grid-item">
              <p className="subtitle-semibold">{s.label}</p>
              <p className={`main-numbers ${s.nowrap ? 'no-wrap' : ''}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {reviews.length > 0 && (
          <div className="reviews-section-wrapper">
            <div className="about-us-columns-cards-tab" style={{ marginBottom: '16px' }}>
              <div className="about-us-columns-cards-dot"></div>
              <p className="subtitle-semibold">{language === 'fr' ? 'Témoignages' : 'Testimonials'}</p>
            </div>
            <p className="main-h3" style={{ marginBottom: '32px' }}>{language === 'fr' ? "Retours d'expérience sur l'utilisation de la plateforme" : 'They share their experience'}</p>
            <div className="reviews-carousel-track">
              {[...reviews, ...reviews].map((r, i) => (
                <div key={i} className="review-card">
                  <div className="review-card-top">
                    <div className="review-avatar">{r.user_name?.charAt(0)?.toUpperCase() || '?'}</div>
                    <div>
                      <p className="review-author">{r.user_name}</p>
                      <div className="review-stars">
                        {[1, 2, 3, 4, 5].map(s => (
                          <span key={s} className={`star ${s <= r.rating ? 'filled' : ''}`}>★</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="review-comment">"{r.comment}"</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="advanced-visualization-section" id="features">
        <div className="advanced-visualization-header">
          <div className="advanced-visualization-tab"><div className="advanced-visualization-dot"></div><p className="subtitle-semibold">{language === 'fr' ? "L'expérience" : "The Experience"}</p></div>
          <h2 className="main-h2">{language === 'fr' ? "Visualisation, Contrôle & Enseignement" : "Visualization, Control & Teaching"}</h2>
        </div>
        <div className="advanced-visualization-grid">
          {getServices(language).map((s, i) => (
            <Link key={i} className="grid-item" to={s.href}>
              <div className="grid-item-bg-layout"><img className="grid-item-bg-image" src={s.img} alt={s.title} /><div className="link-arrow-icon"><ArrowSm /></div></div>
              <div className="grid-item-content"><p className="main-h4">{s.title}</p><p className="main-text-medium">{s.desc}</p></div>
            </Link>
          ))}
          <div className="grid-item portfolio-grid-item"><Link to="/quiz" className="custom-button white large">{language === 'fr' ? "S'évaluer maintenant" : "Evaluate yourself now"} <ArrowLg /></Link></div>
        </div>
      </section>

      <section className="centered-footer-cta-section" id="quiz">
        <div className="cta-content">
          <p className="cta-subtitle">{language === 'fr' ? "De l'observation à la maîtrise" : "From observation to mastery"}</p>
          <div className="line-with-dot"><div className="line"></div><div className="dot"></div><div className="line"></div></div>
          <p className="main-h3">{language === 'fr' ? "Après la visualisation 3D, testez vos connaissances avec nos" : "After 3D visualization, test your knowledge with our custom"} <span style={{ color: '#9DC7FF' }}>{language === 'fr' ? "Quiz Interactifs" : "Interactive Quizzes"}</span> {language === 'fr' ? "sur mesure." : "."}</p>
        </div>
        <Link to="/quiz" className="custom-button white large">{language === 'fr' ? "Accéder aux Quiz" : "Access Quizzes"} <ArrowLg /></Link>
      </section>

      <section className="visual-customization-section" id="customization">
        <div className="visual-customization-container">
          <div className="advanced-visualization-tab" style={{ margin: '0 auto 24px', width: 'fit-content' }}>
            <div className="advanced-visualization-dot"></div>
            <p className="subtitle-semibold">{language === 'fr' ? 'Sur demande' : 'On request'}</p>
          </div>
          <h2 className="main-h2" style={{ marginBottom: '10px' }}>{language === 'fr' ? 'Personnalisation Visuelle' : 'Visual Customization'}</h2>
          
          <div className="visual-items-grid">
            <div className="visual-item">
              <img decoding="async" src="https://storage.googleapis.com/dev_resources_voka_io_303011/common/PaintBucket-iframe.webp" alt="Background" />
              <h4>{language === 'fr' ? 'Arrière-plan' : 'Background'}</h4>
            </div>
            <div className="visual-item" style={{ overflow: 'hidden' }}>
              <img decoding="async" src="https://i.pinimg.com/1200x/94/c1/11/94c111322afcd50995a071043a1d9614.jpg" alt="Isolation & Hiding" style={{ objectFit: 'cover', height: '100%' }} />
              <h4>{language === 'fr' ? 'Isolation & Masquage' : 'Isolation & Hiding'}</h4>
            </div>
            <div className="visual-item">
              <img decoding="async" src="https://storage.googleapis.com/dev_resources_voka_io_303011/common/toggle-iframe.webp" alt="Light/dark mode" />
              <h4>{language === 'fr' ? 'Mode Clair/Sombre' : 'Light/dark mode'}</h4>
            </div>
          </div>
        </div>
      </section>

      <section className="modeling-and-simulation-section">
        <div className="modeling-and-simulation-header">
          <div className="modeling-simulation-tab"><div className="modeling-simulation-dot"></div><p className="subtitle-semibold">{language === 'fr' ? "L'outil Professeurs" : "The Teachers Tool"}</p></div>
          <h2 className="main-h2">{language === 'fr' ? "Fini les dessins au tableau & les atlas papier coûteux" : "No more blackboard drawings & expensive paper atlases"}</h2>
        </div>
        <div className="modeling-and-simulation-grid">
          <Link className="left-item" to="/atlas">
            <div className="left-video-overlay"><img src="https://storage.googleapis.com/dev_resources_voka_io_303011/common/voka-product-image.webp" alt="Enseignement" /></div>
            <p className="main-h4">{language === 'fr' ? "Partage de structures ciblées" : "Targeted Structure Sharing"}</p>
            <p className="main-text-medium">{language === 'fr' ? "Générez un lien unique vers un organe et partagez-le instantanément. Évitez les atlas papier onéreux pour de simples visuels et passez à l'immersion 3D totale." : "Generate a unique link to an organ and share it instantly. Skip the expensive paper atlases for basic visuals and switch to total 3D immersion."}</p>
            <div className="arrow-icon"><ArrowSm /></div>
          </Link>
          <div className="right-items-col">
            {getModelingItems(language).map((item, i) => (
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
          <div className="product-suite-tab"><div className="product-suite-dot"></div><p className="subtitle-semibold">{language === 'fr' ? "La Suite Anatomy 3D" : "The Anatomy 3D Suite"}</p></div>
          <h2 className="main-h2">{language === 'fr' ? "Conçu pour les Étudiants et les Professeurs" : "Designed for Students and Professors"}</h2>
        </div>
        <div className="product-suite-items">
          <div className="product-suite-item">
            <div className="product-suite-item-image"><img src="https://storage.googleapis.com/dev_resources_voka_io_303011/common/voka-product-image.webp" alt="Visualiseur" /></div>
            <div className="product-suite-item-content">
              <p className="main-h3">{language === 'fr' ? "Atlas Complet en Anatomie Humaine" : "Complete Human Anatomy Atlas"}</p>
              <p className="main-text-medium">{language === 'fr' ? "Explorez chaque détail, identifiez les structures et manipulez le modèle 3D avec une liberté totale pour une mémorisation visuelle durable." : "Explore every detail, identify structures, and manipulate the 3D model with total freedom for long-lasting visual memory."}</p>
              <Link to="/atlas" className="custom-button white large explore-button">{language === 'fr' ? "Visualiser" : "Visualize"} <ArrowLg /></Link>
            </div>
          </div>
          <div className="product-suite-item">
            <div className="product-suite-item-image"><img src="https://storage.googleapis.com/dev_resources_voka_io_303011/common/wiki-product-image.webp" alt="Outils" /></div>
            <div className="product-suite-item-content">
              <p className="main-h3">{language === 'fr' ? "Évaluation & Transmission" : "Evaluation & Transmission"}</p>
              <p className="main-text-medium">{language === 'fr' ? "Plus qu'un atlas : un outil de partage pour les enseignants et une batterie de tests interactifs pour les étudiants voulant valider leurs acquis." : "More than an atlas: a sharing tool for teachers and a set of interactive tests for students wanting to validate their knowledge."}</p>
              <Link to="/quiz" className="custom-button white large explore-button">{language === 'fr' ? "Tester" : "Test"} <ArrowLg /></Link>
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
                  <h2>{language === 'fr' ? "Commencez dès maintenant" : "Start right now"}</h2>
                  <p className="main-text-medium">{language === 'fr' ? "Créez votre compte pour sauvegarder votre progression et accéder aux outils enseignants." : "Create your account to save your progress and access teaching tools."}</p>
                </div>
                {error && <div style={{ padding: '12px', background: 'rgba(255,0,0,.15)', border: '1px solid rgba(255,0,0,.3)', borderRadius: 12, color: '#ffb3b3', fontSize: 13, marginBottom: 20 }}>✕ {error}</div>}
                {sent && <div style={{ padding: '14px 20px', background: 'rgba(5,108,242,.2)', border: '1px solid rgba(5,108,242,.4)', borderRadius: 12, color: '#9DC7FF', fontSize: 14, marginBottom: 20 }}>✓ {language === 'fr' ? "Inscription réussie !" : "Registration successful!"}</div>}
                <form className="form-container" onSubmit={handleSubmit}>
                  {step === 1 ? (
                    <>
                      <div className="top-fields">
                        <p><label htmlFor="ct-fname">{language === 'fr' ? "Prénom" : "First name"}</label><input id="ct-fname" name="firstname" type="text" placeholder="Ex: Koffi" value={formData.firstname} onChange={handleField} required /></p>
                        <p><label htmlFor="ct-lname">{language === 'fr' ? "Nom" : "Last name"}</label><input id="ct-lname" name="lastname" type="text" placeholder="Ex: SOGLO" value={formData.lastname} onChange={handleField} required /></p>
                        <p style={{ gridColumn: '1 / -1' }}><label htmlFor="ct-email">Email</label><input id="ct-email" name="email" type="email" placeholder="votre@email.com" value={formData.email} onChange={handleField} required /></p>
                        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div><label htmlFor="ct-pass">{language === 'fr' ? "Mot de passe" : "Password"}</label>
                            <div className="password-input-wrapper">
                              <input id="ct-pass" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password} onChange={handleField} required />
                              <span className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeClosed /> : <EyeOpen />}</span>
                            </div>
                          </div>
                          <div><label htmlFor="ct-conf">{language === 'fr' ? "Confirmation" : "Confirmation"}</label>
                            <div className="password-input-wrapper">
                              <input id="ct-conf" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={formData.confirmPassword} onChange={handleField} required />
                              <span className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeClosed /> : <EyeOpen />}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,.5)', marginBottom: '12px', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {language === 'fr' ? "QUEL PROFIL VOUS CORRESPOND ?" : "WHICH PROFILE FITS YOU?"}
                          </label>
                          <div className="profile-selection-group">
                            <label className="profile-radio-label">
                              <input type="radio" name="profile" value="student" checked={formData.profile === 'student'} onChange={handleField} />
                              <span className="radio-checkmark"></span>
                              {language === 'fr' ? "Étudiant" : "Student"}
                            </label>
                            <label className="profile-radio-label">
                              <input type="radio" name="profile" value="professor" checked={formData.profile === 'professor'} onChange={handleField} />
                              <span className="radio-checkmark"></span>
                              {language === 'fr' ? "Professeur" : "Professor"}
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="middle-fields" style={{ marginTop: '24px' }}>
                        <p id="form-agree">
                          <span className="description-medium">{language === 'fr' ? "Un code de vérification vous sera envoyé par email." : "A verification code will be sent to your email."}</span>
                          <button type="submit" className="custom-button blue large arrows-button-blue" style={{ width: '100%', justifyContent: 'center' }}>{language === 'fr' ? "S'inscrire" : "Sign up"} <ArrowLg /></button>
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="top-fields">
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#fff', marginBottom: '20px' }}>
                          {language === 'fr' ? "Veuillez entrer le code à 6 chiffres envoyé à :" : "Please enter the 6-digit code sent to:"}<br />
                          <strong>{formData.email}</strong>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label htmlFor="ct-code" style={{ textAlign: 'center', width: '100%', display: 'block', marginBottom: '10px' }}>
                            {language === 'fr' ? "Code de vérification" : "Verification Code"}
                          </label>
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            {[0, 1, 2, 3, 4, 5].map(idx => (
                              <input
                                key={idx}
                                id={`otp-${idx}`}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={2}
                                value={(formData.code || '')[idx] || ''}
                                onChange={(e) => handleCodeChange(idx, e.target.value)}
                                onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                                onPaste={idx === 0 ? handlePaste : undefined}
                                required
                                style={{
                                  width: '45px',
                                  height: '55px',
                                  textAlign: 'center',
                                  fontSize: '24px',
                                  fontWeight: 'bold',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255,255,255,0.3)',
                                  background: 'rgba(255,255,255,0.05)',
                                  color: '#fff',
                                  outline: 'none',
                                  transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#056CF2'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="middle-fields" style={{ marginTop: '24px', display: 'flex', flexDirection: 'row', gap: '12px', flexWrap: 'nowrap' }}>
                        <button type="button" onClick={() => setStep(1)} className="custom-button outline large" style={{ flex: '1', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)' }}>{language === 'fr' ? "Retour" : "Back"}</button>
                        <button type="submit" className="custom-button blue large arrows-button-blue" style={{ flex: '2', justifyContent: 'center' }}>{language === 'fr' ? "Valider & Démarrer" : "Verify & Start"} <ArrowLg /></button>
                      </div>
                    </>
                  )}
                </form>
              </>
            ) : (
              <div className="welcome-back-card" style={{ padding: '40px 0' }}>
                <h2 style={{ fontSize: '36px', marginBottom: '20px', color: '#fff' }}>{language === 'fr' ? 'Bon retour parmi nous !' : 'Welcome back!'}</h2>
                <p className="main-text-medium" style={{ marginBottom: '30px', opacity: 0.8, color: 'rgba(255,255,255,0.8)' }}>
                  {language === 'fr' ? "Vous êtes déjà connecté à votre espace personnel. Prêt à reprendre votre exploration de l'anatomie humaine ?" : "You are already connected to your personal space. Ready to resume your exploration of human anatomy?"}
                </p>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <Link to="/atlas" className="custom-button blue large">{language === 'fr' ? "Aller à l'Atlas" : "Go to Atlas"} <ArrowLg /></Link>
                  <Link to="/dash" className="custom-button white large">{language === 'fr' ? "Mon Dashboard" : "My Dashboard"} <ArrowLg /></Link>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="right-side">
          <div className="description-wrapper">
            <div className="banner-titles"><p className="h3-small">{language === 'fr' ? "Visualisation, Interactions, Maîtrise —" : "Visualization, Interactions, Mastery —"}</p><p className="main-text-medium">{language === 'fr' ? "Une nouvelle façon d'enseigner et d'apprendre l'anatomie." : "A new way to teach and learn anatomy."}</p></div>
            <div className="banner-list-wrapper">
              <p className="main-text-bold">{language === 'fr' ? "L'essentiel :" : "The essentials:"}</p>
              <div className="banner-list bullets">
                {(language === 'fr' 
                  ? ["Visualisation 3D directe", "Génération de liens pour les cours", "Évaluation par quiz IA", "Contrôle total des structures"]
                  : ["Direct 3D visualization", "Link generation for classes", "AI quiz evaluation", "Total control over structures"]
                ).map((txt, i) => (
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
              { title: language === 'fr' ? 'Outils' : 'Tools', links: [{ label: language === 'fr' ? 'Visualiseur 3D' : '3D Viewer', href: '/atlas' }, { label: language === 'fr' ? 'Quiz Interactifs' : 'Interactive Quizzes', href: '/quiz' }, { label: language === 'fr' ? 'Outil Professeur' : 'Teacher Tool', href: '#' }]},
              { title: language === 'fr' ? 'Informations' : 'Information', links: [{ label: language === 'fr' ? 'À propos' : 'About', href: '#about' }, { label: language === 'fr' ? 'Conditions' : 'Terms', href: '#' }]},
              { title: language === 'fr' ? 'Accès' : 'Access', links: [
                { label: token ? 'Dashboard' : (language === 'fr' ? 'Connexion' : 'Login'), href: token ? '/dash' : '/login' },
                { label: token ? (language === 'fr' ? 'Mon Profil' : 'My Profile') : (language === 'fr' ? "S'inscrire" : 'Sign Up'), href: token ? '/profile' : '#register' }
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
            
            <div className="menu-block">
              <div className="footer-section">
                <p className="menu-title">{language === 'fr' ? "Langue" : "Language"}</p>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <button onClick={() => setLanguage('fr')} style={{ background: 'none', border: 'none', color: language === 'fr' ? 'var(--blue)' : 'rgba(255,255,255,0.4)', fontWeight: language === 'fr' ? 'bold' : 'normal', cursor: 'pointer', padding: 0 }}>FR</button>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                  <button onClick={() => setLanguage('en')} style={{ background: 'none', border: 'none', color: language === 'en' ? 'var(--blue)' : 'rgba(255,255,255,0.4)', fontWeight: language === 'en' ? 'bold' : 'normal', cursor: 'pointer', padding: 0 }}>EN</button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="footer-information">
            <div className="footer-info-logo-container">
              <span className="footer-logo">ANATOMY<span>3D</span></span>
              <p className="footer-info-text">{language === 'fr' ? "Maîtriser l'anatomie humaine par la manipulation 3D directe et l'évaluation personnalisée." : "Master human anatomy via direct 3D manipulation and customized evaluation."}</p>
            </div>
            <div className="footer-contacts-desktop">
              <div className="contact-items"><a href="mailto:anatomy3d@gmail.com">anatomy3d@gmail.com</a></div>
              {!token ? (
                <a href="#register" className="custom-button blue large without-arrow desktop-contact-us">{language === 'fr' ? "Démarrer maintenant" : "Start now"}</a>
              ) : (
                <Link to="/dash" className="custom-button blue large without-arrow desktop-contact-us">Dashboard</Link>
              )}
            </div>
          </div>
        </div>
      </footer>
      {token && <FloatingActionsDrawer />}
    </div>
  );
};

export default TestPage;

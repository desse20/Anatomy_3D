import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cookie, Check, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent_accepted');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent_accepted', 'true');
    setIsVisible(false);
  };

  const handleDecline = () => {
    alert(
      t(
        "⚠️ L'acceptation des cookies est obligatoire pour utiliser cette plateforme.",
        "⚠️ Cookie acceptance is required to use this platform."
      )
    );
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div style={styles.root}>
          {/* Backdrop — bloque tous les clics */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.backdrop}
          />

          {/* Card bas-gauche */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            style={styles.card}
          >
            {/* Header */}
            <div style={styles.header}>
              <div style={styles.iconWrap}>
                <Cookie size={26} color="#3b82f6" strokeWidth={1.8} />
              </div>
              <div>
                <h2 style={styles.title}>
                  {t('Cookies', 'Cookies')}
                </h2>
                <p style={styles.subtitle}>
                  {t('Votre vie privée', 'Your Privacy')}
                </p>
              </div>
            </div>

            {/* Description courte */}
            <p style={styles.description}>
              {t(
                'Nous utilisons des cookies pour assurer le bon fonctionnement de la plateforme et améliorer votre expérience.',
                'We use cookies to ensure the platform works properly and improve your experience.'
              )}
            </p>

            {/* Boutons */}
            <div style={styles.buttonRow}>
              <button
                onClick={handleAccept}
                style={styles.btnAccept}
                onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
                onMouseLeave={e => (e.currentTarget.style.background = '#3b82f6')}
              >
                <Check size={16} strokeWidth={2.5} />
                {t('Accepter', 'Accept')}
              </button>
              <button
                onClick={handleDecline}
                style={styles.btnDecline}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#e2e8f0';
                  e.currentTarget.style.color = '#1e293b';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.color = '#475569';
                }}
              >
                <X size={16} strokeWidth={2.5} />
                {t('Refuser', 'Decline')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: '28px',
    // Le root lui-même laisse passer les événements…
    pointerEvents: 'none',
  },
  // …mais le backdrop les bloque tous
  backdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)',
    pointerEvents: 'all', // ← bloque les clics en arrière-plan
  },
  card: {
    position: 'relative',
    width: '360px',
    background: '#ffffff',
    borderRadius: '18px',
    boxShadow: '0 16px 48px rgba(0,0,0,0.22), 0 4px 16px rgba(59,130,246,0.10)',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    pointerEvents: 'all', // ← la carte reste cliquable
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  iconWrap: {
    padding: '10px',
    background: '#eff6ff',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.4px',
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 500,
  },
  description: {
    margin: 0,
    fontSize: '13px',
    lineHeight: 1.65,
    color: '#475569',
  },
  buttonRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '4px',
  },
  btnAccept: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '11px 16px',
    background: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s',
    boxShadow: '0 4px 14px rgba(59,130,246,0.30)',
  },
  btnDecline: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '11px 16px',
    background: '#f1f5f9',
    color: '#475569',
    border: '1.5px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
  },
};

export default CookieConsent;

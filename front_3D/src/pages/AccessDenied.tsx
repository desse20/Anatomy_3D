import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const AccessDenied: React.FC = () => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;

    return (
        <div style={{ 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'var(--dash-bg, #f8fafc)',
            color: 'var(--dash-text, #1e293b)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '20px',
            textAlign: 'center'
        }}>
            <div style={{ 
                width: '80px', 
                height: '80px', 
                background: '#fee2e2', 
                color: '#ef4444', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '24px'
            }}>
                <ShieldAlert size={48} />
            </div>
            
            <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 12px 0' }}>{t('Accès Interdit', 'Access Denied')}</h1>
            <p style={{ 
                color: 'var(--dash-text-muted, #64748b)', 
                maxWidth: '450px', 
                lineHeight: 1.6,
                fontSize: '16px',
                margin: '0 0 32px 0'
            }}>
                {t("Désolé, vous ne disposez pas des privilèges nécessaires pour accéder à cette zone sécurisée de la plateforme. Si vous pensez qu'il s'agit d'une erreur, contactez votre administrateur technique.", "Sorry, you do not have the necessary privileges to access this secure area of the platform. If you think this is an error, please contact your technical administrator.")}
            </p>
            
            <Link to="/dash" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '12px 24px', 
                background: '#0ea5e9', 
                color: 'white', 
                borderRadius: '10px', 
                textDecoration: 'none', 
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)',
                transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
                <ArrowLeft size={18} />
                {t('Retour au tableau de bord', 'Back to dashboard')}
            </Link>
        </div>
    );
};

export default AccessDenied;

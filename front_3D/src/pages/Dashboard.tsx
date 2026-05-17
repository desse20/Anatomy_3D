import { Link } from 'react-router-dom';
import App from '../components/layouts/App';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/dashboard.css';

const PlaceholderPattern: React.FC = () => (
    <svg className="card-placeholder-svg" fill="none" style={{ width: '100%', height: '100%' }}>
        <defs>
            <pattern id="pattern-1" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M-1 5L5 -1M3 9L8.5 3.5" stroke="currentColor" strokeWidth="0.5"></path>
            </pattern>
        </defs>
        <rect fill="url(#pattern-1)" width="100%" height="100%"></rect>
    </svg>
);

const ArrowLg = () => (
    <svg width="33" height="33" viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0.433594" y="0.171875" width="32" height="32" rx="16" fill="currentColor" opacity="0.18"/>
        <path d="M12.0226 19.5929C11.7492 19.8663 11.7492 20.3095 12.0226 20.5829C12.296 20.8562 12.7392 20.8562 13.0126 20.5829L12.0226 19.5929ZM21.05 12.2554C21.05 11.8688 20.7366 11.5554 20.35 11.5554L14.05 11.5554C13.6634 11.5554 13.35 11.8688 13.35 12.2554C13.35 12.642 13.6634 12.9554 14.05 12.9554L19.65 12.9554L19.65 18.5554C19.65 18.942 19.9634 19.2554 20.35 19.2554C20.7366 19.2554 21.05 18.942 21.05 18.5554L21.05 12.2554ZM13.0126 20.5829L20.845 12.7504L19.8551 11.7604L12.0226 19.5929L13.0126 20.5829Z" fill="currentColor"/>
    </svg>
);

const Dashboard: React.FC = () => {
    const { language } = useLanguage();
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    return (
        <App 
            breadcrumb={language === 'fr' ? 'Tableau de bord' : 'Dashboard'} 
            title={language === 'fr' ? 'Tableau de bord' : 'Dashboard'}
        >
            <Link to="/" className="dash-home-link-hero">
                <span className="home-link-text">{language === 'fr' ? "Retour au portail d'accueil" : "Back to Home Portal"}</span>
                <ArrowLg />
            </Link>

            <div style={{ position: 'absolute', top: '32px', right: '40px' }}>
                <div className="role-badge">
                    <div className="role-badge-dot"></div>
                    <span className="role-badge-text">
                        {user.role === 'teacher' 
                            ? (language === 'fr' ? 'Professeur' : 'Teacher')
                            : (language === 'fr' ? 'Étudiant' : 'Student')
                        }
                    </span>
                </div>
            </div>
            <div className="dash-grid">
                <div className="dash-card aspect-video p-0 overflow-hidden">
                    <PlaceholderPattern />
                </div>
                <div className="dash-card aspect-video p-0 overflow-hidden">
                    <PlaceholderPattern />
                </div>
                <div className="dash-card aspect-video p-0 overflow-hidden">
                    <PlaceholderPattern />
                </div>
                <div className="dash-card full-width p-0 overflow-hidden">
                    <PlaceholderPattern />
                </div>
            </div>
        </App>
    );
};

export default Dashboard;

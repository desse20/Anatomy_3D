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

const Dashboard: React.FC = () => {
    const { language } = useLanguage();
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    return (
        <App 
            breadcrumb={language === 'fr' ? 'Tableau de bord' : 'Dashboard'} 
            title={language === 'fr' ? 'Tableau de bord' : 'Dashboard'}
        >
            <div className="dash-internal-header" style={{ position: 'absolute', top: '32px', right: '40px' }}>
                <div style={{ padding: '6px 14px', background: 'rgba(12, 121, 242, 0.08)', color: 'var(--dash-primary)', borderRadius: '100px', fontSize: '12px', fontWeight: '800', border: '1px solid rgba(12, 121, 242, 0.15)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {user.role === 'teacher' 
                        ? (language === 'fr' ? 'Professeur' : 'Teacher')
                        : (language === 'fr' ? 'Étudiant' : 'Student')
                    }
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

import App from '../components/layouts/App';
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
    return (
        <App breadcrumb="Dashboard" title="Tableau de bord">
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

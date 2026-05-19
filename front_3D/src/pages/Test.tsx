import React from 'react';
import App from '../components/layouts/App';
import ProAnatomyExplorer from '../components/ProAnatomyExplorer';
import { useLanguage } from '../contexts/LanguageContext';

const Test: React.FC = () => {
    const { language } = useLanguage();

    return (
        <App 
            breadcrumb={language === 'fr' ? 'Explorateur 3D' : '3D Explorer'} 
            title={language === 'fr' ? 'Base de Données Anatomique' : 'Anatomy Database'}
        >
            <div style={{ height: 'calc(100vh - 150px)', width: '100%' }}>
                <ProAnatomyExplorer />
            </div>
        </App>
    );
};

export default Test;

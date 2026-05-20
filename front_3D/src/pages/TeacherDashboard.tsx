import React, { useState } from 'react';
import { Presentation, Copy, CheckCircle, Users } from 'lucide-react';
import App from '../components/layouts/App';
import { useLanguage } from '../contexts/LanguageContext';

const TeacherDashboard: React.FC = () => {
    const { language } = useLanguage();
    const t = (fr: string, en: string) => language === 'fr' ? fr : en;
    const [copied, setCopied] = useState(false);
    
    // Simulate generic lab room data
    const mockSalle = {
        id: 'S-7A9B',
        title: 'Cours: Ostéologie du Membre Inférieur',
        students_online: 42,
        created_at: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' }),
        link: 'https://anatomy.bj/salle/S-7A9B'
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(mockSalle.link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <App breadcrumb={t('Espace Professeur', 'Teacher Space')} title={t('Gestion des Salles de Cours (Labs)', 'Labs Management')}>
            
            <div className="dash-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'start' }}>
                
                {/* Create/Config Lab */}
                <div style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '24px' }}>
                    <Presentation size={32} color="#fbbf24" style={{ marginBottom: '16px' }} />
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>{t('Générer une Salle', 'Generate Room')}</h3>
                    <p style={{ color: 'var(--dash-text-muted)', fontSize: '13px', lineHeight: 1.5, marginBottom: '24px' }}>
                        {t('Configurez votre angle de vue 3D dans le catalogue, puis générez un lien. Vos étudiants rejoindront exactement cette configuration en temps réel.', 'Configure your 3D view in the catalog, then generate a link. Students will join this exact configuration in real time.')}
                    </p>
                    
                    <button style={{ width: '100%', padding: '12px', background: '#fbbf24', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        {t('Ouvrir l\'Atlas Professeur', 'Open Professor Atlas')}
                    </button>
                </div>

                {/* Active Session Info */}
                <div style={{ background: 'var(--dash-bg)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--dash-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>{mockSalle.title}</h3>
                            <span style={{ fontSize: '12px', color: 'var(--dash-text-muted)' }}>{t('Session de', 'Session of')} {mockSalle.created_at}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(52, 211, 153, 0.1)', padding: '6px 12px', borderRadius: '100px', color: '#34d399', fontSize: '13px', fontWeight: 600 }}>
                            <Users size={16} />
                            {mockSalle.students_online} {t('Étudiants connectés', 'Students online')}
                        </div>
                    </div>
                    
                    <div style={{ padding: '24px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--dash-text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                            {t('Lien de partage étudiant', 'Student Share Link')}
                        </label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <input 
                                type="text" 
                                readOnly 
                                value={mockSalle.link} 
                                style={{ flex: 1, minWidth: '200px', padding: '12px 16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--dash-border)', borderRadius: '8px', color: 'var(--dash-text)' }}
                            />
                            <button 
                                onClick={handleCopy}
                                style={{ flexShrink: 0, padding: '12px 20px', background: copied ? '#34d399' : 'color-mix(in srgb, var(--dash-text) 10%, transparent)', color: copied ? '#fff' : 'var(--dash-text)', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}>
                                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                            </button>
                        </div>
                        
                        <div style={{ marginTop: '32px' }}>
                            <h4 style={{ fontSize: '14px', margin: '0 0 16px 0' }}>{t('Liste de présence en direct (simulation)', 'Live Attendance List (Simulation)')}</h4>
                            <div style={{ border: '1px solid var(--dash-border)', borderRadius: '8px' }}>
                                {[1,2,3,4].map(i => (
                                    <div key={i} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: i !== 4 ? '1px solid var(--dash-border)' : 'none' }}>
                                        <span style={{ fontSize: '14px' }}>Etudiant {i}</span>
                                        <span style={{ fontSize: '12px', color: '#10b981' }}>{t('A rejoint à', 'Joined at')} {new Date(Date.now() - i * 60000).toLocaleTimeString('fr-FR', {minute:'2-digit', second:'2-digit'})}</span>
                                    </div>
                                ))}
                            </div>
                            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--dash-text-muted)', marginTop: '16px' }}>
                                (...et 38 autres étudiants)
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            
        </App>
    );
};

export default TeacherDashboard;

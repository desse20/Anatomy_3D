import React, { createContext, useContext, useState } from 'react';

type Language = 'fr' | 'en';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (fr: string, en?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(
        (localStorage.getItem('app_lang') as Language) || 'fr'
    );

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('app_lang', lang);
    };

    // Fonction t fantôme pour éviter les crashs si un fichier l'appelle encore
    const t = (fr: string, en?: string) => {
        if (language === 'en' && en) return en;
        return fr;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage doit être utilisé dans un LanguageProvider');
    }
    return context;
};

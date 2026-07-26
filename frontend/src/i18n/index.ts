import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import kn from './kn.json';

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('i18nextLng') : null;

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    kn: { translation: kn },
  },
  lng: savedLang || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  document.documentElement.setAttribute('lang', lng === 'kn' ? 'kn' : 'en-IN');
  localStorage.setItem('i18nextLng', lng);
});

export default i18n;

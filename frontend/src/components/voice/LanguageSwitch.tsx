import React from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  language: string;
  onChange: (lang: string) => void;
}

const LanguageSwitch: React.FC<Props> = ({ language, onChange }) => {
  const { t } = useTranslation();

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        onClick={() => onChange('en')}
        style={{
          padding: '6px 16px', borderRadius: 16, border: 'none',
          background: language === 'en' ? '#003366' : '#e0e0e0',
          color: language === 'en' ? 'white' : '#333',
          cursor: 'pointer', fontWeight: language === 'en' ? 600 : 400,
        }}
        aria-label={language === 'en' ? t('language.kn') : t('language.en')}
        title={language === 'en' ? t('language.kn') : t('language.en')}
      >
        {t('language.en')}
      </button>
      <button
        onClick={() => onChange('kn')}
        style={{
          padding: '6px 16px', borderRadius: 16, border: 'none',
          background: language === 'kn' ? '#003366' : '#e0e0e0',
          color: language === 'kn' ? 'white' : '#333',
          cursor: 'pointer', fontWeight: language === 'kn' ? 600 : 400,
        }}
        aria-label={language === 'kn' ? t('language.en') : t('language.kn')}
        title={language === 'kn' ? t('language.en') : t('language.kn')}
      >
        {t('language.kn')}
      </button>
    </div>
  );
};

export default LanguageSwitch;

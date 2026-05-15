import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const TranslateIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6h9" />
    <path d="M8 6c0 6-2.5 10-5 12" />
    <path d="M6 11c1.2 1.7 2.9 3.2 5 4.5" />
    <path d="M14 18h7" />
    <path d="m17.5 7 3.5 11" />
    <path d="m21 18-3.5-11L14 18" />
  </svg>
);

const LanguageSwitcher = ({ className = '', compact = false }) => {
  const { language, languages, setLanguage, t } = useLanguage();

  return (
    <label
      className={`flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 ${className}`}
    >
      <span className="text-slate-400 [&_svg]:h-[18px] [&_svg]:w-[18px]" aria-hidden="true"><TranslateIcon /></span>
      {!compact ? <span className="hidden text-xs font-semibold uppercase tracking-[0.16em] sm:inline">{t('language.label')}</span> : null}
      <select
        aria-label={t('language.label')}
        className="min-w-0 bg-transparent text-sm font-medium text-slate-700 outline-none dark:text-slate-200"
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
      >
        {languages.map((option) => (
          <option key={option.code} value={option.code}>
            {option.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
};

export default LanguageSwitcher;
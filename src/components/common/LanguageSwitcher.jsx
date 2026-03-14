import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const LanguageSwitcher = ({ className = '', compact = false }) => {
  const { language, languages, setLanguage, t } = useLanguage();

  return (
    <label
      className={`flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 ${className}`}
    >
      <span className="material-symbols-outlined text-[18px] text-slate-400">translate</span>
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
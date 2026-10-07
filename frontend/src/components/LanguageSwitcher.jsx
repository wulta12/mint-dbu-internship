import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'am', label: 'አማ' }
];

// Language switcher rendered as a compact dropdown showing only the active
// language code (EN / አማ); opening it offers English and Amharic. Works on the
// dark mint public header as well as on light backgrounds (portal topbar,
// auth pages).
const LanguageSwitcher = ({ dark = true }) => {
  const { lang, setLang, t } = useLanguage();

  const trigger = dark
    ? 'bg-white/10 text-white border-white/20 hover:bg-white/20'
    : 'bg-white text-gray-700 dark:text-gray-100 border-mint-border dark:border-slate-600 hover:bg-mint-light dark:hover:bg-slate-800 hover:text-mint-primary';

  const chevronColor = dark ? 'text-white/60' : 'text-gray-400 dark:text-gray-500';

  return (
    <div className="relative">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label={t('Language')}
        className={`
          appearance-none pl-3 pr-8 py-2 rounded-lg border text-sm font-semibold
          tracking-wide cursor-pointer transition-colors
          focus:outline-none focus:ring-2 focus:ring-mint-gold
          ${trigger}
        `}
      >
        {LANGUAGES.map((item) => (
          // No colour classes here on purpose: the global `select option` rule
          // in index.css styles the native popup, and the dark remap must not
          // reach into it.
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${chevronColor}`}
        aria-hidden="true"
      />
    </div>
  );
};

export default LanguageSwitcher;

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

// Light/dark toggle. `dark` styles the button for use on the dark mint public
// header; the portal topbar and auth pages use the default light treatment.
const ThemeToggle = ({ dark = false }) => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  const idle = dark
    ? 'text-white/70 hover:text-white hover:bg-white/10'
    : 'text-gray-500 hover:text-mint-primary hover:bg-mint-light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t('Switch to light mode') : t('Switch to dark mode')}
      title={isDark ? t('Switch to light mode') : t('Switch to dark mode')}
      className={`p-2 rounded-lg transition-colors ${idle}`}
    >
      {isDark ? (
        <Sun className="w-5 h-5" aria-hidden="true" />
      ) : (
        <Moon className="w-5 h-5" aria-hidden="true" />
      )}
    </button>
  );
};

export default ThemeToggle;

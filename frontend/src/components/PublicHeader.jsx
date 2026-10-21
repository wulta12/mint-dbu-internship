import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaHome,
  FaInfoCircle,
  FaBookOpen,
  FaEnvelope,
  FaSignInAlt,
  FaUserPlus,
  FaBars,
  FaTimes
} from 'react-icons/fa';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import mintLogo from '../images/mint-logo.png';

// Shared public header used across ALL public pages (Home, About, Contact,
// Trainings, TrainingDetails). Adds the language switcher to the original
// navigation so the language choice is available on every page.
const PublicHeader = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { to: '/', label: t('Home'), icon: FaHome },
    { to: '/about', label: t('About'), icon: FaInfoCircle },
    { to: '/trainings', label: t('Training Programs'), icon: FaBookOpen },
    { to: '/contact', label: t('Contact'), icon: FaEnvelope }
  ];

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <header className="bg-mint-primary dark:bg-slate-900 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-white dark:!bg-white rounded-lg p-1">
              <img
                src={mintLogo}
                alt="MinT Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            <div className="ml-2">
              <div className="text-white font-bold text-sm leading-tight tracking-wide">
                Ministry of Innovation and Technology
              </div>
              <div className="text-mint-border text-xs">
                Online Training Management System
              </div>
            </div>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-4">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-1.5 transition-colors font-medium text-sm tracking-wide ${
                      isActive(link.to)
                        ? 'text-mint-gold'
                        : 'text-white/80 hover:text-mint-gold'
                    }`}
                  >
                    <Icon className="text-mint-gold" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Language switcher */}
            <LanguageSwitcher dark />

            {/* Light / dark mode */}
            <ThemeToggle dark />

            {/* Auth buttons */}
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-4 py-2 text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium tracking-wide"
              >
                <FaSignInAlt className="text-mint-gold" />
                {t('Login')}
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1.5 px-4 py-2 bg-mint-gold text-mint-primary rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium tracking-wide"
              >
                <FaUserPlus />
                {t('Register')}
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition"
              aria-label="Toggle navigation menu"
            >
              {menuOpen ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden bg-mint-primary dark:bg-slate-900 border-t border-white/10 px-4 pb-4">
          <nav className="flex flex-col gap-1 py-3">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium tracking-wide transition-colors ${
                    isActive(link.to)
                      ? 'text-mint-gold bg-white/10'
                      : 'text-white/80 hover:text-mint-gold hover:bg-white/5'
                  }`}
                >
                  <Icon className="text-mint-gold" />
                  {link.label}
                </Link>
              );
            })}
            <div className="flex items-center gap-3 px-3 pt-3 border-t border-white/10">
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="flex-1 text-center px-4 py-2 text-white border border-white/30 rounded-lg text-sm font-medium"
              >
                {t('Login')}
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="flex-1 text-center px-4 py-2 bg-mint-gold text-mint-primary rounded-lg text-sm font-medium"
              >
                {t('Register')}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default PublicHeader;
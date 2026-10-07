import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaLinkedin, FaTelegram, FaTwitter } from 'react-icons/fa';
import { useLanguage } from '../i18n/LanguageContext';

// Official (working) social media channels for the Ministry of Innovation and
// Technology, Ethiopia.
export const SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/MInT.Ethiopia',
  linkedin: 'https://www.linkedin.com/company/ministry-of-innovation-and-technology-ethiopia',
  telegram: 'https://t.me/wul19',
  twitter: 'https://twitter.com/MinistryofInno2'
};

// Shared public footer used across ALL public pages, with real social links
// (previously placeholder "#" anchors).
const PublicFooter = () => {
  const { t } = useLanguage();

  const socials = [
    { icon: FaFacebook, href: SOCIAL_LINKS.facebook, label: 'Facebook' },
    { icon: FaLinkedin, href: SOCIAL_LINKS.linkedin, label: 'LinkedIn' },
    { icon: FaTelegram, href: SOCIAL_LINKS.telegram, label: 'Telegram' },
    { icon: FaTwitter, href: SOCIAL_LINKS.twitter, label: 'X (Twitter)' }
  ];

  return (
    <footer className="bg-mint-primary dark:bg-slate-900 border-t border-white/10 pt-12 pb-4">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4 tracking-wide">MinT</h3>
            <p className="text-white/60 text-sm tracking-wide">
              {t('Ministry of Innovation and Technology - Training Management System')}
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm tracking-wide">
              {t('Quick Links')}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-white/60 hover:text-mint-gold transition-colors tracking-wide">
                  {t('About Us')}
                </Link>
              </li>
              <li>
                <Link to="/trainings" className="text-white/60 hover:text-mint-gold transition-colors tracking-wide">
                  {t('Training Programs')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-white/60 hover:text-mint-gold transition-colors tracking-wide">
                  {t('Contact')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm tracking-wide">
              {t('Resources')}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/login" className="text-white/60 hover:text-mint-gold transition-colors tracking-wide">
                  {t('Login')}
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-white/60 hover:text-mint-gold transition-colors tracking-wide">
                  {t('Register')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm tracking-wide">
              {t('Contact')}
            </h3>
            <p className="text-white/60 text-sm tracking-wide">
              Ministry of Innovation and Technology<br />
              Addis Ababa, Ethiopia<br />
              <span className="text-mint-gold">training@mint.gov.et</span>
            </p>
            <div className="flex gap-3 mt-4">
              {socials.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="text-white/60 hover:text-mint-gold transition-colors"
                  >
                    <Icon />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 text-center text-sm text-white/40 tracking-wide">
          &copy; {new Date().getFullYear()} Ministry of Innovation and Technology (MinT). All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
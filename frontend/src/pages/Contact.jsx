import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhone,
  FaClock,
  FaPaperPlane,
  FaFacebook,
  FaLinkedin,
  FaTelegram,
  FaTwitter
} from 'react-icons/fa';
import api from '../services/api';
import { toast } from '../components/Toast';
import PublicLayout from '../components/PublicLayout';
import { useLanguage } from '../i18n/LanguageContext';
import { SOCIAL_LINKS } from '../components/PublicFooter';

const Contact = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [sending, setSending] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Honest contact form: the success message is shown ONLY after the message
  // has actually been saved to the backend (contact_messages table).
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const response = await api.post('/contact', formData);
      if (response.data?.success) {
        toast.success(response.data.message || 'Your message has been sent successfully!');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        toast.error(response.data?.message || 'Failed to send your message. Please try again.');
      }
    } catch (err) {
      console.error('Contact form error:', err);
      toast.error(err.response?.data?.message || 'Failed to send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <PublicLayout>

      {/* ========== CONTACT CONTENT ========== */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Page Title */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-16"
            >
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-mint-primary tracking-tight mb-3">
                {t('Contact Us')}
              </h1>
              <p className="text-mint-gray text-base md:text-lg tracking-wide font-light max-w-2xl mx-auto">
                Have questions about our training programs? Reach out to us and we'll get back to you promptly.
              </p>
              <div className="w-20 h-1 bg-mint-gold mx-auto mt-4 rounded-full"></div>
            </motion.div>

            {/* Contact Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
              {/* Left Side - Contact Info */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-2xl shadow-card p-6 md:p-8 border border-mint-border">
                  <h2 className="text-2xl font-bold text-mint-primary tracking-tight mb-6">
                    {t('Get in Touch')}
                  </h2>
                  
                  <div className="space-y-5">
                    {/* Address */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FaMapMarkerAlt className="text-mint-primary text-lg" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 tracking-wide">{t('Address')}</h4>
                        <p className="text-gray-600 text-sm leading-relaxed tracking-wide font-light">
                          Ministry of Innovation and Technology<br />
                          Addis Ababa, Ethiopia
                        </p>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FaEnvelope className="text-mint-primary text-lg" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 tracking-wide">{t('Email')}</h4>
                        <p className="text-gray-600 text-sm leading-relaxed tracking-wide font-light">
                          <span className="text-mint-primary">training@mint.gov.et</span>
                        </p>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FaPhone className="text-mint-primary text-lg" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 tracking-wide">{t('Phone')}</h4>
                        <p className="text-gray-600 text-sm leading-relaxed tracking-wide font-light">
                          +251-11-123-4567
                        </p>
                      </div>
                    </div>

                    {/* Working Hours */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FaClock className="text-mint-primary text-lg" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 tracking-wide">{t('Working Hours')}</h4>
                        <p className="text-gray-600 text-sm leading-relaxed tracking-wide font-light">
                          Monday - Friday: 8:00 AM - 5:00 PM<br />
                          Saturday - Sunday: Closed
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                <div className="bg-white rounded-2xl shadow-card p-6 md:p-8 border border-mint-border">
                  <h3 className="text-lg font-semibold text-mint-primary tracking-tight mb-4">
                    {t('Connect With Us')}
                  </h3>
                  <div className="flex gap-4">
                    <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center hover:bg-mint-primary hover:text-white transition text-mint-primary" aria-label="Facebook">
                      <FaFacebook className="text-lg" />
                    </a>
                    <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center hover:bg-mint-primary hover:text-white transition text-mint-primary" aria-label="LinkedIn">
                      <FaLinkedin className="text-lg" />
                    </a>
                    <a href={SOCIAL_LINKS.telegram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center hover:bg-mint-primary hover:text-white transition text-mint-primary" aria-label="Telegram">
                      <FaTelegram className="text-lg" />
                    </a>
                    <a href={SOCIAL_LINKS.twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center hover:bg-mint-primary hover:text-white transition text-mint-primary" aria-label="X (Twitter)">
                      <FaTwitter className="text-lg" />
                    </a>
                  </div>
                </div>
              </motion.div>

              {/* Right Side - Contact Form */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-white rounded-2xl shadow-card p-6 md:p-8 border border-mint-border"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center">
                    <FaPaperPlane className="text-mint-primary text-xl" />
                  </div>
                  <h2 className="text-2xl font-bold text-mint-primary tracking-tight">
                    {t('Send a Message')}
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 tracking-wide mb-1.5">
                      {t('Your Name')} *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      autoComplete="off"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition text-gray-700 text-sm"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 tracking-wide mb-1.5">
                      {t('Your Email')} *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      autoComplete="off"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition text-gray-700 text-sm"
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 tracking-wide mb-1.5">
                      {t('Subject')}
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition text-gray-700 text-sm"
                      placeholder="Enter subject"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 tracking-wide mb-1.5">
                      {t('Message')} *
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows="5"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition text-gray-700 text-sm resize-none"
                      placeholder="Write your message here..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-mint-primary text-white py-3 rounded-lg hover:bg-opacity-90 transition font-semibold text-base tracking-wide flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <FaPaperPlane className="text-sm" />
                    {sending ? t('Sending...') : t('Send Message')}
                  </button>
                </form>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Contact;
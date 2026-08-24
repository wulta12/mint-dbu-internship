import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaHome,
  FaInfoCircle,
  FaBookOpen,
  FaEnvelope,
  FaSignInAlt,
  FaUserPlus,
  FaFacebook,
  FaLinkedin,
  FaTelegram,
  FaTwitter,
  FaMapMarkerAlt,
  FaPhone,
  FaClock,
  FaPaperPlane
} from 'react-icons/fa';
import mintLogo from '../images/mint-logo.png';
import { toast } from '../components/Toast';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success('Your message has been sent successfully!');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-mint-light font-sans">
      {/* ========== HEADER - Same as Homepage ========== */}
      <header className="bg-mint-primary shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="bg-white rounded-lg p-1">
                <img 
                  src={mintLogo} 
                  alt="MinT Logo" 
                  className="h-10 w-auto object-contain"
                />
              </div>
              <div>
                <div className="text-white font-bold text-sm leading-tight tracking-wide">
                  Ministry of Innovation
                </div>
                <div className="text-mint-gold font-semibold text-xs tracking-wider">
                  Training Management System
                </div>
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-6">
              <nav className="hidden lg:flex items-center gap-4">
                <Link to="/" className="flex items-center gap-1.5 text-white/80 hover:text-mint-gold transition-colors font-medium text-sm tracking-wide">
                  <FaHome className="text-mint-gold" />
                  Home
                </Link>
                <Link to="/about" className="flex items-center gap-1.5 text-white/80 hover:text-mint-gold transition-colors font-medium text-sm tracking-wide">
                  <FaInfoCircle className="text-mint-gold" />
                  About
                </Link>
                <Link to="/trainings" className="flex items-center gap-1.5 text-white/80 hover:text-mint-gold transition-colors font-medium text-sm tracking-wide">
                  <FaBookOpen className="text-mint-gold" />
                  Training Programs
                </Link>
                <Link to="/contact" className="flex items-center gap-1.5 text-mint-gold transition-colors font-medium text-sm tracking-wide">
                  <FaEnvelope className="text-mint-gold" />
                  Contact
                </Link>
              </nav>

              {/* Auth Buttons */}
              <div className="flex items-center gap-2">
                <Link to="/login" className="flex items-center gap-1.5 px-4 py-2 text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium tracking-wide">
                  <FaSignInAlt className="text-mint-gold" />
                  Login
                </Link>
                <Link to="/register" className="flex items-center gap-1.5 px-4 py-2 bg-mint-gold text-mint-primary rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium tracking-wide">
                  <FaUserPlus />
                  Register
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

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
                Contact Us
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
                    Get in Touch
                  </h2>
                  
                  <div className="space-y-5">
                    {/* Address */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FaMapMarkerAlt className="text-mint-primary text-lg" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 tracking-wide">Address</h4>
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
                        <h4 className="text-sm font-semibold text-gray-700 tracking-wide">Email</h4>
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
                        <h4 className="text-sm font-semibold text-gray-700 tracking-wide">Phone</h4>
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
                        <h4 className="text-sm font-semibold text-gray-700 tracking-wide">Working Hours</h4>
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
                    Connect With Us
                  </h3>
                  <div className="flex gap-4">
                    <a href="#" className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center hover:bg-mint-primary hover:text-white transition text-mint-primary">
                      <FaFacebook className="text-lg" />
                    </a>
                    <a href="#" className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center hover:bg-mint-primary hover:text-white transition text-mint-primary">
                      <FaLinkedin className="text-lg" />
                    </a>
                    <a href="#" className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center hover:bg-mint-primary hover:text-white transition text-mint-primary">
                      <FaTelegram className="text-lg" />
                    </a>
                    <a href="#" className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center hover:bg-mint-primary hover:text-white transition text-mint-primary">
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
                    Send a Message
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 tracking-wide mb-1.5">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition text-gray-700 text-sm"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 tracking-wide mb-1.5">
                      Your Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition text-gray-700 text-sm"
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 tracking-wide mb-1.5">
                      Subject
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
                      Message *
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
                    className="w-full bg-mint-primary text-white py-3 rounded-lg hover:bg-opacity-90 transition font-semibold text-base tracking-wide flex items-center justify-center gap-2"
                  >
                    <FaPaperPlane className="text-sm" />
                    Send Message
                  </button>
                </form>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FOOTER - Same as Homepage ========== */}
      <footer className="bg-mint-primary border-t border-white/10 pt-12 pb-4">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4 tracking-wide">MinT</h3>
              <p className="text-white/60 text-sm tracking-wide">
                Ministry of Innovation and Technology - Training Management System
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4 text-sm tracking-wide">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="text-white/60 hover:text-mint-gold transition-colors tracking-wide">About Us</Link></li>
                <li><Link to="/trainings" className="text-white/60 hover:text-mint-gold transition-colors tracking-wide">Training Programs</Link></li>
                <li><Link to="/contact" className="text-white/60 hover:text-mint-gold transition-colors tracking-wide">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4 text-sm tracking-wide">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/login" className="text-white/60 hover:text-mint-gold transition-colors tracking-wide">Login</Link></li>
                <li><Link to="/register" className="text-white/60 hover:text-mint-gold transition-colors tracking-wide">Register</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4 text-sm tracking-wide">Contact</h3>
              <p className="text-white/60 text-sm tracking-wide">
                Ministry of Innovation and Technology<br />
                Addis Ababa, Ethiopia<br />
                <span className="text-mint-gold">training@mint.gov.et</span>
              </p>
              <div className="flex gap-3 mt-4">
                <a href="#" className="text-white/60 hover:text-mint-gold transition-colors"><FaFacebook /></a>
                <a href="#" className="text-white/60 hover:text-mint-gold transition-colors"><FaLinkedin /></a>
                <a href="#" className="text-white/60 hover:text-mint-gold transition-colors"><FaTelegram /></a>
                <a href="#" className="text-white/60 hover:text-mint-gold transition-colors"><FaTwitter /></a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 text-center text-sm text-white/40 tracking-wide">
            &copy; {new Date().getFullYear()} Ministry of Innovation and Technology (MinT). All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Contact;
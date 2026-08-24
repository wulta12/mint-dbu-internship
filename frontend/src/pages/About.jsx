import React from 'react';
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
  FaUniversity,
  FaBullseye,
  FaEye,
  FaUsers,
  FaAward,
  FaGraduationCap,
  FaChartLine
} from 'react-icons/fa';
import mintLogo from '../images/mint-logo.png';

const About = () => {
  return (
    <div className="min-h-screen bg-mint-light font-sans">
      {/* ========== HEADER ========== */}
      <header className="bg-mint-primary shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-20">
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

            <div className="flex items-center gap-6">
              <nav className="hidden lg:flex items-center gap-4">
                <Link to="/" className="flex items-center gap-1.5 text-white/80 hover:text-mint-gold transition-colors font-medium text-sm tracking-wide">
                  <FaHome className="text-mint-gold" />
                  Home
                </Link>
                <Link to="/about" className="flex items-center gap-1.5 text-mint-gold transition-colors font-medium text-sm tracking-wide">
                  <FaInfoCircle className="text-mint-gold" />
                  About
                </Link>
                <Link to="/trainings" className="flex items-center gap-1.5 text-white/80 hover:text-mint-gold transition-colors font-medium text-sm tracking-wide">
                  <FaBookOpen className="text-mint-gold" />
                  Training Programs
                </Link>
                <Link to="/contact" className="flex items-center gap-1.5 text-white/80 hover:text-mint-gold transition-colors font-medium text-sm tracking-wide">
                  <FaEnvelope className="text-mint-gold" />
                  Contact
                </Link>
              </nav>

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

      {/* ========== ABOUT CONTENT ========== */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            {/* Page Title */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-16"
            >
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-mint-primary tracking-tight mb-3">
                About MinT Training
              </h1>
              <p className="text-mint-gray text-base md:text-lg tracking-wide font-light">
                Ministry of Innovation and Technology, Ethiopia
              </p>
              <div className="w-20 h-1 bg-mint-gold mx-auto mt-4 rounded-full"></div>
            </motion.div>

            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-card p-8 md:p-12 border border-mint-border"
            >
              {/* Who We Are */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-mint-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FaUniversity className="text-mint-primary text-2xl" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-mint-primary tracking-tight">
                    Who We Are
                  </h2>
                </div>
                <p className="text-gray-700 text-base md:text-lg leading-relaxed tracking-wide mb-4 font-light">
                  The <span className="text-mint-primary font-semibold">Ministry of Innovation and Technology (MinT)</span> is Ethiopia's premier institution dedicated to fostering innovation, digital transformation, and technological advancement across the nation.
                </p>
                <p className="text-gray-600 text-base md:text-lg leading-relaxed tracking-wide font-light">
                  Our training programs are designed to equip professionals, students, and entrepreneurs with the skills they need to thrive in today's rapidly evolving technology landscape.
                </p>
              </div>

              {/* Mission & Vision Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-mint-light rounded-xl p-6 md:p-8 border border-mint-border hover:shadow-card-hover transition duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaBullseye className="text-mint-primary text-xl" />
                    </div>
                    <h3 className="text-xl font-bold text-mint-primary tracking-tight">Our Mission</h3>
                  </div>
                  <p className="text-gray-600 text-base leading-relaxed tracking-wide font-light">
                    To empower innovation and drive digital transformation through accessible, high-quality training and capacity building.
                  </p>
                </div>
                <div className="bg-mint-light rounded-xl p-6 md:p-8 border border-mint-border hover:shadow-card-hover transition duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaEye className="text-mint-primary text-xl" />
                    </div>
                    <h3 className="text-xl font-bold text-mint-primary tracking-tight">Our Vision</h3>
                  </div>
                  <p className="text-gray-600 text-base leading-relaxed tracking-wide font-light">
                    A digitally skilled workforce driving Ethiopia's innovation and economic growth through technology.
                  </p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-mint-light rounded-xl p-6 md:p-8 border border-mint-border hover:shadow-card-hover transition duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaUsers className="text-mint-primary text-xl" />
                    </div>
                    <h3 className="text-xl font-bold text-mint-primary tracking-tight">Our People</h3>
                  </div>
                  <p className="text-gray-600 text-base leading-relaxed tracking-wide font-light">
                    A diverse community of expert trainers, dedicated staff, and motivated learners working together to build a tech-savvy Ethiopia.
                  </p>
                </div>
                <div className="bg-mint-light rounded-xl p-6 md:p-8 border border-mint-border hover:shadow-card-hover transition duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-mint-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FaAward className="text-mint-primary text-xl" />
                    </div>
                    <h3 className="text-xl font-bold text-mint-primary tracking-tight">Our Commitment</h3>
                  </div>
                  <p className="text-gray-600 text-base leading-relaxed tracking-wide font-light">
                    Delivering excellence in training, certification, and professional development that meets international standards.
                  </p>
                </div>
              </div>

              {/* Stats Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 pt-8 border-t border-mint-border">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-mint-primary">500+</div>
                  <p className="text-xs md:text-sm text-mint-gray font-light">Trainings</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-mint-primary">50+</div>
                  <p className="text-xs md:text-sm text-mint-gray font-light">Trainers</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-mint-primary">1000+</div>
                  <p className="text-xs md:text-sm text-mint-gray font-light">Trained</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-mint-primary">95%</div>
                  <p className="text-xs md:text-sm text-mint-gray font-light">Success</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
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

export default About;
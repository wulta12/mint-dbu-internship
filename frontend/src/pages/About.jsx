import React from 'react';
import { motion } from 'framer-motion';
import { 
  FaUniversity,
  FaBullseye,
  FaEye,
  FaUsers,
  FaAward
} from 'react-icons/fa';
import PublicLayout from '../components/PublicLayout';
import { useLanguage } from '../i18n/LanguageContext';

const About = () => {
  const { t } = useLanguage();
  return (
    <PublicLayout>

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
                {t('About MinT Training')}
              </h1>
              <p className="text-mint-gray text-base md:text-lg tracking-wide font-light">
                {t('Ministry of Innovation and Technology, Ethiopia')}
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
                    {t('Who We Are')}
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
                    <h3 className="text-xl font-bold text-mint-primary tracking-tight">{t('Our Mission')}</h3>
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
                    <h3 className="text-xl font-bold text-mint-primary tracking-tight">{t('Our Vision')}</h3>
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
                    <h3 className="text-xl font-bold text-mint-primary tracking-tight">{t('Our People')}</h3>
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
                    <h3 className="text-xl font-bold text-mint-primary tracking-tight">{t('Our Commitment')}</h3>
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
    </PublicLayout>
  );
};

export default About;
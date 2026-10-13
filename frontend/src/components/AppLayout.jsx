import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Award,
  CalendarCheck,
  LogOut,
  Menu,
  User,
  ChevronDown,
  Users,
  UserPlus,
  ClipboardList,
  FileText,
  Settings,
  GraduationCap,
  PlusCircle,
  MessageSquare
} from 'lucide-react';
import Avatar from './Avatar';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import { useLanguage } from '../i18n/LanguageContext';

const roleLabels = {
  admin: 'Administrator Portal',
  trainer: 'Trainer Portal',
  trainee: 'Trainee Portal'
};

const AppLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const loadUser = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      } else {
        navigate('/login');
      }
    };

    loadUser();
    window.addEventListener('user-updated', loadUser);
    window.addEventListener('storage', loadUser);
    return () => {
      window.removeEventListener('user-updated', loadUser);
      window.removeEventListener('storage', loadUser);
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = {
    admin: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
      { icon: BookOpen, label: 'Trainings', path: '/admin/trainings' },
      { icon: PlusCircle, label: 'Create Training', path: '/admin/trainings/create' },
      { icon: ClipboardList, label: 'Enrollment Requests', path: '/admin/enrollments' },
      { icon: Users, label: 'Users', path: '/admin/users' },
      { icon: UserPlus, label: 'Trainers', path: '/admin/trainers' },
      { icon: CalendarCheck, label: 'Attendance', path: '/admin/attendance' },
      { icon: Award, label: 'Certificates', path: '/admin/certificates' },
      { icon: FileText, label: 'Reports', path: '/admin/reports' },
      { icon: MessageSquare, label: 'Messages', path: '/admin/messages' },
      { icon: Settings, label: 'Settings', path: '/admin/settings' },
    ],
    trainer: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/trainer/dashboard' },
      { icon: BookOpen, label: 'My Trainings', path: '/trainer/trainings' },
      { icon: Award, label: 'Certificates', path: '/trainer/certificates' },
      // Inbox for messages the administration sends directly.
      { icon: MessageSquare, label: 'Messages', path: '/messages' },
      { icon: User, label: 'Profile', path: '/trainer/profile' }
    ],
    trainee: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/trainee/dashboard' },
      { icon: BookOpen, label: 'Available Trainings', path: '/trainee/trainings' },
      { icon: CalendarCheck, label: 'My Trainings', path: '/trainee/my-trainings' },
      { icon: Award, label: 'Certificates', path: '/trainee/certificates' },
      // Inbox for messages the administration sends directly.
      { icon: MessageSquare, label: 'Messages', path: '/messages' },
      { icon: User, label: 'Profile', path: '/trainee/profile' }
    ]
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mint-light">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-primary"></div>
      </div>
    );
  }

  const items = (navItems[user.role] || navItems.trainee).map((item) => ({
    ...item,
    label: t(item.label)
  }));

  return (
    <div className="min-h-screen bg-mint-light dark:bg-slate-950">
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-mint-primary dark:bg-slate-900 text-white z-50
        transform transition-transform duration-300 ease-in-out
        flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/10 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mint-gold/15 border border-mint-gold/30 flex items-center justify-center shrink-0">
              <GraduationCap className="text-mint-gold w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold leading-tight text-white">{t('Ministry of Innovation')}</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mint-gold mt-1">
                {t('MinT Training System')}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path ||
              (item.path !== '/admin/dashboard' && item.path !== '/trainer/dashboard' && item.path !== '/trainee/dashboard' &&
               location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg
                  transition-all duration-200
                  ${active
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'}
                `}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-mint-gold" />
                )}
                <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-mint-gold' : ''}`} />
                <span className="text-[15px] leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 " onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className={`${sidebarOpen ? '' : 'lg:ml-64'}`}>
        {/* Top Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-mint-border dark:border-slate-700 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-mint-light dark:hover:bg-slate-800 rounded-lg transition"
                aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                <Menu className="w-5 h-5 text-mint-gray" />
              </button>
              <h1 className="text-lg font-bold text-mint-primary dark:text-blue-300 tracking-tight">
                {t(roleLabels[user.role] || `${user.role} Portal`)}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language switcher */}
              <LanguageSwitcher dark={false} />

              {/* Notifications */}
              <NotificationBell />

              {/* Light / dark mode */}
              <ThemeToggle />

              {/* Profile */}
              <div className="relative">
                <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-3 p-2 hover:bg-mint-light dark:hover:bg-slate-800 rounded-lg transition">
                  <Avatar user={user} size="sm" />
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">{user.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize leading-tight">{user.role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {showProfile && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-mint-border dark:border-slate-700 p-2 z-50">
                    <div className="px-3 py-2.5 border-b border-gray-100 dark:border-slate-700 mb-1 flex items-center gap-3">
                      <Avatar user={user} size="md" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user.full_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    {user.role === 'admin' && (
                      <Link to="/admin/profile" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-mint-light dark:hover:bg-slate-700 transition w-full text-left">
                        <User className="w-4 h-4 text-mint-gray" />
                        <span className="text-sm text-gray-800 dark:text-gray-100">{t('Profile')}</span>
                      </Link>
                    )}
                    {user.role === 'trainee' && (
                      <Link to="/trainee/profile" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-mint-light dark:hover:bg-slate-700 transition w-full text-left">
                        <User className="w-4 h-4 text-mint-gray" />
                        <span className="text-sm text-gray-800 dark:text-gray-100">{t('Profile')}</span>
                      </Link>
                    )}
                    {user.role === 'trainer' && (
                      <Link to="/trainer/profile" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-mint-light dark:hover:bg-slate-700 transition w-full text-left">
                        <User className="w-4 h-4 text-mint-gray" />
                        <span className="text-sm text-gray-800 dark:text-gray-100">{t('Profile')}</span>
                      </Link>
                    )}
                    <hr className="my-1 border-mint-border dark:border-slate-700" />
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition w-full text-left text-red-600 dark:text-red-400">
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">{t('Logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;

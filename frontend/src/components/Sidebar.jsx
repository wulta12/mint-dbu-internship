import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  CalendarCheck, 
  Award, 
  BarChart3, 
  Settings, 
  LogOut,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Menu
} from 'lucide-react';
import mintLogo from '../images/mint-logo.png';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({
    trainings: true,
    users: false
  });

  const toggleMenu = (menu) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/admin'
    },
    {
      icon: BookOpen,
      label: 'Training Management',
      path: '/admin/trainings',
      submenu: [
        { label: 'All Trainings', path: '/admin/trainings' },
        { label: 'Create Training', path: '/admin/trainings/create' }
      ]
    },
    {
      icon: Users,
      label: 'Trainer Management',
      path: '/admin/trainers',
      submenu: [
        { label: 'All Trainers', path: '/admin/trainers' },
        { label: 'Add Trainer', path: '/admin/trainers/add' }
      ]
    },
    {
      icon: GraduationCap,
      label: 'Trainee Management',
      path: '/admin/trainees',
      submenu: [
        { label: 'All Trainees', path: '/admin/trainees' },
        { label: 'Add Trainee', path: '/admin/trainees/add' }
      ]
    },
    {
      icon: CalendarCheck,
      label: 'Attendance',
      path: '/admin/attendance'
    },
    {
      icon: Award,
      label: 'Certificates',
      path: '/admin/certificates'
    },
    {
      icon: BarChart3,
      label: 'Reports',
      path: '/admin/reports'
    },
    {
      icon: Settings,
      label: 'Settings',
      path: '/admin/settings'
    }
  ];

  // Filter out Profile from admin sidebar only
  const items = navItems.filter(item => !(item.label === 'Profile'));

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-mint-primary text-white z-50
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo Section - Top Left */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img 
                src={mintLogo} 
                alt="MinT Logo" 
                className="h-12 w-auto object-contain"
              />
              <div>
                <p className="text-sm font-bold leading-tight">Ministry of Innovation</p>
                <p className="text-xs text-mint-gold">Training Management System</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition lg:hidden"
              aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
              title={isOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="mt-2">
            <p className="text-xs text-white/50">Administrator Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            if (item.submenu) {
              const menuKey = item.label.toLowerCase().replace(/\s/g, '');
              const isExpanded = expandedMenus[menuKey];
              return (
                <div key={item.path}>
                  <button
                    onClick={() => toggleMenu(menuKey)}
                    className={`
                      w-full flex items-center justify-between px-4 py-2.5 rounded-lg
                      transition-all duration-200 hover:bg-white/10
                      ${active ? 'bg-white/10 text-white' : 'text-white/70'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-9 mt-1 space-y-1">
                      {item.submenu.map((sub) => (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          className={`
                            block px-4 py-2 text-sm rounded-lg transition-all
                            ${isActive(sub.path) 
                              ? 'bg-mint-gold/20 text-mint-gold' 
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                            }
                          `}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-lg
                  transition-all duration-200 hover:bg-white/10
                  ${active ? 'bg-white/10 text-white' : 'text-white/70'}
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <Link
            to="/login"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-white/70 hover:bg-white/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Logout</span>
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
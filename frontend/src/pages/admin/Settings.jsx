import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Languages,
  Bell,
  Settings2,
  Building2,
  BookOpen,
  Plus,
  RefreshCw,
  Power,
  Save,
  X,
  Mail,
  Phone,
  Calendar,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import ProfilePictureUpload from '../../components/ProfilePictureUpload';
import { authService, departmentService, subjectService } from '../../services/api';
import { toast } from '../../components/Toast';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'language', label: 'Language', icon: Languages },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'system', label: 'System Configuration', icon: Settings2 }
];

const NOTIFICATION_ITEMS = [
  { key: 'enrollmentRequests', title: 'Enrollment Requests', description: 'Get notified when a trainee requests enrollment in a training' },
  { key: 'trainingDeadlines', title: 'Training Deadlines', description: 'Reminders about upcoming training start dates and deadlines' },
  { key: 'certificateIssued', title: 'Certificate Issued', description: 'Alerts when certificates are issued to trainees' },
  { key: 'systemUpdates', title: 'System Updates', description: 'Announcements about maintenance and new features' }
];

const NOTIFICATION_DEFAULTS = {
  enrollmentRequests: true,
  trainingDeadlines: true,
  certificateIssued: true,
  systemUpdates: false
};

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'አማርኛ (Amharic)' }
];

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-mint-primary' : 'bg-gray-300'}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
    />
  </button>
);

const PasswordField = ({ label, name, value, onChange, visible, onToggle, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 pr-10 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
        required
      />
      <button
        type="button"
        onClick={onToggle}
        tabIndex="-1"
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  </div>
);

const Settings = () => {
  const [activeSection, setActiveSection] = useState('profile');

  const [user, setUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '', phone: '' });
  const [profileSaving, setProfileSaving] = useState(false);

  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });

  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState(NOTIFICATION_DEFAULTS);

  const [sysTab, setSysTab] = useState('departments');
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sysLoading, setSysLoading] = useState(true);
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '', description: '', department_id: '' });
  const [editingDept, setEditingDept] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadProfile();
    loadSystemData();
    const savedLanguage = localStorage.getItem('mint_settings_language');
    if (savedLanguage) setLanguage(savedLanguage);
    try {
      const savedNotifications = JSON.parse(localStorage.getItem('mint_settings_notifications') || '{}');
      setNotifications({ ...NOTIFICATION_DEFAULTS, ...savedNotifications });
    } catch {
      setNotifications(NOTIFICATION_DEFAULTS);
    }
  }, []);

  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);

      const profileRes = await authService.getProfile();
      const current = profileRes.data?.user || currentUser;
      setUser(current);
      setProfileForm({
        full_name: current?.full_name || '',
        email: current?.email || '',
        phone: current?.phone || ''
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadSystemData = async () => {
    try {
      setSysLoading(true);
      const [deptRes, subjRes] = await Promise.all([
        departmentService.getAll(),
        subjectService.getAll()
      ]);
      setDepartments(deptRes.data?.departments || deptRes.departments || []);
      setSubjects(subjRes.data?.subjects || []);
    } catch (error) {
      console.error('Failed to fetch settings data:', error);
    } finally {
      setSysLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await authService.updateProfile({
        full_name: profileForm.full_name,
        phone: profileForm.phone
      });
      const updatedUser = res.data?.user;
      if (updatedUser) {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('user-updated'));
        setProfileForm({
          full_name: updatedUser.full_name || '',
          email: updatedUser.email || '',
          phone: updatedUser.phone || ''
        });
      }
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePwdChange = (e) => {
    setPwdForm({ ...pwdForm, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (pwdForm.new_password.length < 6) {
      toast.warning('New password must be at least 6 characters');
      return;
    }
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      toast.warning('New passwords do not match');
      return;
    }
    setPwdSaving(true);
    try {
      await authService.changePassword(pwdForm.current_password, pwdForm.new_password);
      toast.success('Password changed successfully');
      setPwdForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPwdSaving(false);
    }
  };

  const handleLanguageChange = (e) => {
    const value = e.target.value;
    setLanguage(value);
    localStorage.setItem('mint_settings_language', value);
    if (value === 'am') {
      toast.info('Amharic translations are coming soon. The interface will remain in English for now.');
    } else {
      toast.success('Language preference saved');
    }
  };

  const handleToggleNotification = (key) => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('mint_settings_notifications', JSON.stringify(next));
      return next;
    });
    toast.success('Notification preferences saved');
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingDept) {
        await departmentService.update(editingDept.id, deptForm);
        toast.success('Department updated successfully');
      } else {
        await departmentService.create(deptForm);
        toast.success('Department created successfully');
      }
      setDeptForm({ name: '', description: '' });
      setEditingDept(null);
      await loadSystemData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const handleDeptToggle = async (dept) => {
    try {
      await departmentService.toggleActive(dept.id, !dept.is_active);
      await loadSystemData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update department status');
    }
  };

  const startEditDept = (dept) => {
    setEditingDept(dept);
    setDeptForm({ name: dept.name, description: dept.description || '' });
  };

  const cancelEditDept = () => {
    setEditingDept(null);
    setDeptForm({ name: '', description: '' });
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    if (!subjectForm.department_id) {
      toast.warning('Please select a department');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...subjectForm, department_id: Number(subjectForm.department_id) };
      if (editingSubject) {
        await subjectService.update(editingSubject.id, payload);
        toast.success('Subject updated successfully');
      } else {
        await subjectService.create(payload);
        toast.success('Subject created successfully');
      }
      setSubjectForm({ name: '', description: '', department_id: '' });
      setEditingSubject(null);
      await loadSystemData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  };

  const handleSubjectToggle = async (subject) => {
    try {
      await subjectService.toggleActive(subject.id, !subject.is_active);
      await loadSystemData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update subject status');
    }
  };

  const startEditSubject = (subject) => {
    setEditingSubject(subject);
    setSubjectForm({
      name: subject.name,
      description: subject.description || '',
      department_id: String(subject.department_id)
    });
  };

  const cancelEditSubject = () => {
    setEditingSubject(null);
    setSubjectForm({ name: '', description: '', department_id: '' });
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-mint-gray mt-1">Manage your account and system configuration.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 lg:sticky lg:top-24">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                    active
                      ? 'bg-mint-primary text-white shadow-card'
                      : 'bg-white text-mint-gray hover:bg-mint-light hover:text-mint-primary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="lg:col-span-3">
          {activeSection === 'profile' && (
            profileLoading ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-2xl shadow-card p-6 text-center">
                    <div className="mx-auto w-fit">
                      <ProfilePictureUpload user={user} onUpdate={setUser} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mt-4">{user?.full_name}</h2>
                    <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
                    <p className="text-sm text-mint-primary mt-1">{user?.email}</p>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <form onSubmit={handleProfileSubmit} className="bg-white rounded-2xl shadow-card p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-6">Personal Information</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <User className="w-4 h-4 inline mr-1" />
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="full_name"
                          value={profileForm.full_name}
                          onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                          className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <Mail className="w-4 h-4 inline mr-1" />
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={profileForm.email}
                          disabled
                          className="w-full px-4 py-2 border border-mint-border rounded-lg bg-gray-50 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">Email address cannot be changed</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <Phone className="w-4 h-4 inline mr-1" />
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Member Since
                        </label>
                        <div className="text-gray-500 text-sm bg-gray-50 px-4 py-2 rounded-lg border border-mint-border">
                          {user?.created_at
                            ? new Date(user.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : 'Not available'}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-mint-border">
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {profileSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )
          )}

          {activeSection === 'security' && (
            <div className="max-w-2xl bg-white rounded-2xl shadow-card p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Change Password</h3>
              <p className="text-sm text-mint-gray mb-6">Use a strong password that you do not use elsewhere.</p>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <PasswordField
                  label="Current Password"
                  name="current_password"
                  value={pwdForm.current_password}
                  onChange={handlePwdChange}
                  visible={showPwd.current}
                  onToggle={() => setShowPwd({ ...showPwd, current: !showPwd.current })}
                  placeholder="Enter your current password"
                />
                <PasswordField
                  label="New Password"
                  name="new_password"
                  value={pwdForm.new_password}
                  onChange={handlePwdChange}
                  visible={showPwd.new}
                  onToggle={() => setShowPwd({ ...showPwd, new: !showPwd.new })}
                  placeholder="At least 6 characters"
                />
                <PasswordField
                  label="Confirm New Password"
                  name="confirm_password"
                  value={pwdForm.confirm_password}
                  onChange={handlePwdChange}
                  visible={showPwd.confirm}
                  onToggle={() => setShowPwd({ ...showPwd, confirm: !showPwd.confirm })}
                  placeholder="Re-enter your new password"
                />

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={pwdSaving}
                    className="flex items-center gap-2 px-6 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {pwdSaving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeSection === 'language' && (
            <div className="max-w-2xl bg-white rounded-2xl shadow-card p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Interface Language</h3>
              <p className="text-sm text-mint-gray mb-6">Choose the language used throughout the system.</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select
                  value={language}
                  onChange={handleLanguageChange}
                  className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                >
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <option key={lang.code} value={lang.code}>{lang.label}</option>
                  ))}
                </select>
              </div>

              {language === 'am' && (
                <div className="mt-4 p-4 rounded-lg bg-mint-light border border-mint-border text-sm text-mint-primary">
                  Amharic translations are coming soon. The interface will remain in English for now.
                </div>
              )}

              <p className="text-xs text-gray-400 mt-4">
                English is currently the only fully supported language. Your preference is saved on this device.
              </p>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="max-w-2xl bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="p-6 border-b border-mint-border">
                <h3 className="text-base font-semibold text-gray-900">Notification Preferences</h3>
                <p className="text-sm text-mint-gray mt-1">Choose which notifications you receive.</p>
              </div>
              <ul className="divide-y divide-mint-border">
                {NOTIFICATION_ITEMS.map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-4 p-6">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-sm text-mint-gray mt-0.5">{item.description}</p>
                    </div>
                    <Toggle
                      checked={notifications[item.key]}
                      onChange={() => handleToggleNotification(item.key)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeSection === 'system' && (
            isAdmin ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">System Configuration</h3>
                    <p className="text-sm text-mint-gray mt-1">Manage departments and subjects.</p>
                  </div>
                  <button
                    onClick={loadSystemData}
                    className="flex items-center gap-2 px-4 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSysTab('departments')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      sysTab === 'departments' ? 'bg-mint-primary text-white' : 'bg-white text-mint-gray hover:bg-mint-light'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    Departments
                  </button>
                  <button
                    onClick={() => setSysTab('subjects')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      sysTab === 'subjects' ? 'bg-mint-primary text-white' : 'bg-white text-mint-gray hover:bg-mint-light'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Subjects
                  </button>
                </div>

                {sysLoading ? (
                  <div className="flex items-center justify-center min-h-[200px]">
                    <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : sysTab === 'departments' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl shadow-card p-5 h-fit">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">
                        {editingDept ? 'Edit Department' : 'Add Department'}
                      </h3>
                      <form onSubmit={handleDeptSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                          <input
                            type="text"
                            value={deptForm.name}
                            onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                            className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                          <textarea
                            value={deptForm.description}
                            onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                            rows="3"
                            className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                            {editingDept ? 'Update' : 'Add Department'}
                          </button>
                          {editingDept && (
                            <button type="button" onClick={cancelEditDept} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          )}
                        </div>
                      </form>
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-card overflow-hidden">
                      <div className="p-5 border-b border-mint-border">
                        <h3 className="text-base font-semibold text-gray-900">Departments ({departments.length})</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-mint-light border-b border-mint-border">
                              <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Name</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Description</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Subjects</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Members</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Status</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {departments.length === 0 ? (
                              <tr><td colSpan="6" className="text-center py-8 text-mint-gray">No departments yet</td></tr>
                            ) : departments.map((dept) => (
                              <tr key={dept.id} className="border-b border-mint-border hover:bg-mint-light/50 transition">
                                <td className="py-3 px-4 text-sm font-medium text-gray-900">{dept.name}</td>
                                <td className="py-3 px-4 text-sm text-mint-gray max-w-[200px] truncate">{dept.description || '-'}</td>
                                <td className="py-3 px-4 text-sm text-mint-gray">{dept.subject_count || 0}</td>
                                <td className="py-3 px-4 text-sm text-mint-gray">{dept.member_count || 0}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    dept.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {dept.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => startEditDept(dept)}
                                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition"
                                      title="Edit"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeptToggle(dept)}
                                      className={`p-1.5 rounded transition ${dept.is_active ? 'text-yellow-500 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                                      title={dept.is_active ? 'Deactivate' : 'Activate'}
                                    >
                                      <Power className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl shadow-card p-5 h-fit">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">
                        {editingSubject ? 'Edit Subject' : 'Add Subject'}
                      </h3>
                      <form onSubmit={handleSubjectSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                          <select
                            value={subjectForm.department_id}
                            onChange={(e) => setSubjectForm({ ...subjectForm, department_id: e.target.value })}
                            className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                            required
                          >
                            <option value="">Select Department</option>
                            {departments.map((dept) => (
                              <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                          <input
                            type="text"
                            value={subjectForm.name}
                            onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                            className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                          <textarea
                            value={subjectForm.description}
                            onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                            rows="3"
                            className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                            {editingSubject ? 'Update' : 'Add Subject'}
                          </button>
                          {editingSubject && (
                            <button type="button" onClick={cancelEditSubject} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          )}
                        </div>
                      </form>
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-card overflow-hidden">
                      <div className="p-5 border-b border-mint-border">
                        <h3 className="text-base font-semibold text-gray-900">Subjects ({subjects.length})</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-mint-light border-b border-mint-border">
                              <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Name</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Department</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Trainings</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Status</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subjects.length === 0 ? (
                              <tr><td colSpan="5" className="text-center py-8 text-mint-gray">No subjects yet</td></tr>
                            ) : subjects.map((subject) => (
                              <tr key={subject.id} className="border-b border-mint-border hover:bg-mint-light/50 transition">
                                <td className="py-3 px-4 text-sm font-medium text-gray-900">{subject.name}</td>
                                <td className="py-3 px-4 text-sm text-mint-gray">{subject.department_name || '-'}</td>
                                <td className="py-3 px-4 text-sm text-mint-gray">{subject.training_count || 0}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    subject.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {subject.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => startEditSubject(subject)}
                                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition"
                                      title="Edit"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleSubjectToggle(subject)}
                                      className={`p-1.5 rounded transition ${subject.is_active ? 'text-yellow-500 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                                      title={subject.is_active ? 'Deactivate' : 'Activate'}
                                    >
                                      <Power className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-card p-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-mint-light flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-mint-primary" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Administrator access required</h3>
                <p className="text-sm text-mint-gray">
                  Only administrators can manage departments and subjects. Contact your system administrator if you believe this is a mistake.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;

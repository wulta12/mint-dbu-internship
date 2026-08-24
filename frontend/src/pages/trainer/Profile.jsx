import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Edit,
  Save,
  X,
  ArrowLeft,
  GraduationCap,
  Award,
  FileText
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import ProfilePictureUpload from '../../components/ProfilePictureUpload';
import { authService, departmentService } from '../../services/api';
import { toast } from '../../components/Toast';

const TrainerProfile = () => {
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    department_id: '',
    specialization: '',
    qualification: '',
    biography: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);

      const deptRes = await departmentService.getAll();
      setDepartments(deptRes.data?.departments || []);

      setFormData({
        full_name: currentUser?.full_name || '',
        email: currentUser?.email || '',
        phone: currentUser?.phone || '',
        department_id: currentUser?.department_id || '',
        specialization: currentUser?.specialization || '',
        qualification: currentUser?.qualification || '',
        biography: currentUser?.biography || ''
      });

      const profileRes = await authService.getProfile();
      const current = profileRes.data?.user || currentUser;
      setUser(current);
      setFormData({
        full_name: current?.full_name || '',
        email: current?.email || '',
        phone: current?.phone || '',
        department_id: current?.department_id || '',
        specialization: current?.specialization || '',
        qualification: current?.qualification || '',
        biography: current?.biography || ''
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await authService.updateProfile({
        full_name: formData.full_name,
        phone: formData.phone,
        department_id: formData.department_id,
        specialization: formData.specialization,
        qualification: formData.qualification,
        biography: formData.biography
      });

      const updatedUser = res.data?.user;
      if (updatedUser) {
        const selectedDept = departments.find(d => String(d.id) === String(formData.department_id));
        const enrichedUser = {
          ...updatedUser,
          department_name: selectedDept?.name || updatedUser.department_name || user?.department_name || null
        };
        setUser(enrichedUser);
        localStorage.setItem('user', JSON.stringify(enrichedUser));
      }
      setEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading profile...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to="/trainer" className="flex items-center gap-2 text-gray-500 hover:text-mint-primary transition text-sm mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-500">View and manage your personal and professional information</p>
            </div>
            <button
              onClick={() => {
                setEditing(!editing);
                if (editing) {
                  setFormData({
                    full_name: user?.full_name || '',
                    email: user?.email || '',
                    phone: user?.phone || '',
                    department_id: user?.department_id || '',
                    specialization: user?.specialization || '',
                    qualification: user?.qualification || '',
                    biography: user?.biography || ''
                  });
                }
              }}
              className="mt-3 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition"
            >
              {editing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="mx-auto w-fit">
                <ProfilePictureUpload user={user} onUpdate={setUser} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mt-4">{user?.full_name}</h2>
              <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
              <p className="text-sm text-mint-primary mt-1">{user?.email}</p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-mint-light rounded-full">
                <Building2 className="w-4 h-4 text-mint-primary" />
                <span className="text-sm font-medium text-mint-primary">
                  {user?.department_name || 'No department assigned'}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Professional Summary</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Specialization</p>
                    <p className="text-sm text-gray-900">{user?.specialization || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Award className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Qualification</p>
                    <p className="text-sm text-gray-900">{user?.qualification || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Biography</p>
                    <p className="text-sm text-gray-900">{user?.biography || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    disabled={!editing}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary ${
                      !editing ? 'bg-gray-50 cursor-not-allowed' : ''
                    }`}
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
                    value={formData.email}
                    disabled={true}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
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
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!editing}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary ${
                      !editing ? 'bg-gray-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Department
                  </label>
                  <select
                    name="department_id"
                    value={formData.department_id}
                    onChange={handleChange}
                    disabled={!editing}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary ${
                      !editing ? 'bg-gray-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <GraduationCap className="w-4 h-4 inline mr-1" />
                    Specialization
                  </label>
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="e.g. Full Stack Development & Cloud"
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary ${
                      !editing ? 'bg-gray-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Award className="w-4 h-4 inline mr-1" />
                    Qualification
                  </label>
                  <input
                    type="text"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="e.g. MSc in Computer Science"
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary ${
                      !editing ? 'bg-gray-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Biography
                  </label>
                  <textarea
                    name="biography"
                    rows="4"
                    value={formData.biography}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="Professional background and experience..."
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary ${
                      !editing ? 'bg-gray-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Member Since
                  </label>
                  <div className="text-gray-500 text-sm bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Not available'}
                  </div>
                </div>
              </div>

              {editing && (
                <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        full_name: user?.full_name || '',
                        email: user?.email || '',
                        phone: user?.phone || '',
                        department_id: user?.department_id || '',
                        specialization: user?.specialization || '',
                        qualification: user?.qualification || '',
                        biography: user?.biography || ''
                      });
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default TrainerProfile;

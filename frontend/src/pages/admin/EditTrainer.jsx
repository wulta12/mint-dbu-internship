import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { userService, departmentService } from '../../services/api';
import { toast } from '../../components/Toast';

const EditTrainer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    department_id: '',
    specialization: '',
    qualification: '',
    biography: '',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [userRes, deptRes] = await Promise.all([
        userService.getById(id),
        departmentService.getAll()
      ]);
      const user = userRes.data?.user;
      if (!user || user.role !== 'trainer') {
        toast.warning('Trainer not found');
        navigate('/admin/trainers');
        return;
      }
      setDepartments(deptRes.data?.departments || []);
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        department_id: user.department_id || '',
        specialization: user.specialization || '',
        qualification: user.qualification || '',
        biography: user.biography || '',
        is_active: user.is_active
      });
    } catch (error) {
      console.error('Failed to load trainer:', error);
      toast.warning('Trainer not found');
      navigate('/admin/trainers');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await userService.update(id, {
        full_name: formData.full_name,
        phone: formData.phone,
        department_id: formData.department_id,
        specialization: formData.specialization,
        qualification: formData.qualification,
        biography: formData.biography,
        is_active: formData.is_active
      });
      toast.success('Trainer updated successfully!');
      navigate(`/admin/trainers/${id}`);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update trainer');
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
            <p className="text-mint-gray">Loading trainer...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-mint-primary">Edit Trainer</h1>
        <p className="text-mint-gray">Update trainer account and professional information</p>
      </div>

      <div className="bg-white rounded-xl shadow-card p-6 max-w-2xl">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-mint-primary mb-1">Full Name *</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-mint-primary mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-2 border border-mint-border rounded-lg bg-gray-50 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-mint-primary mb-1">Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-mint-primary mb-1">Department</label>
              <select
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary bg-white"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-mint-primary mb-1">Specialization</label>
              <input
                type="text"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-mint-primary mb-1">Qualification</label>
              <input
                type="text"
                name="qualification"
                value={formData.qualification}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-mint-primary mb-1">Biography</label>
            <textarea
              name="biography"
              value={formData.biography}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-mint-primary mb-1">Account Status</label>
            <select
              name="is_active"
              value={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
              className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary bg-white"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-mint-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link to={`/admin/trainers/${id}`} className="text-mint-gray hover:text-mint-primary transition">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default EditTrainer;

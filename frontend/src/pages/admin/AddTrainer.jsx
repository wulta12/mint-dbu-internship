import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { departmentService } from '../../services/api';
import { toast } from '../../components/Toast';

const AddTrainer = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    department_id: '',
    specialization: '',
    qualification: '',
    biography: ''
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await departmentService.getAll();
        setDepartments(res.data?.departments || []);
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    fetchDepartments();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Get the admin token
      const token = localStorage.getItem('token');
      
      // Register as trainer using the admin API
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          role: 'trainer',
          department_id: formData.department_id,
          specialization: formData.specialization,
          qualification: formData.qualification,
          biography: formData.biography
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Trainer added successfully!');
        navigate('/admin/trainers');
      } else {
        setError(data.message || 'Failed to add trainer');
      }
    } catch (error) {
      console.error('Add trainer error:', error);
      setError('Failed to add trainer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-mint-primary">Add New Trainer</h1>
        <p className="text-mint-gray">Create a new trainer account (Admin only)</p>
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
              <label className="block text-sm font-semibold text-mint-primary mb-1">Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-mint-primary mb-1">Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                required
                minLength="6"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-mint-primary mb-1">Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                required
              />
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="mb-6">
            <label className="block text-sm font-semibold text-mint-primary mb-1">Biography</label>
            <textarea
              name="biography"
              value={formData.biography}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
              placeholder="Professional background and experience..."
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-mint-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Trainer'}
            </button>
            <Link to="/admin/trainers" className="text-mint-gray hover:text-mint-primary transition">
              Cancel
            </Link>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Only administrators can create trainer accounts. 
            Trainers will receive their login credentials via email.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default AddTrainer;

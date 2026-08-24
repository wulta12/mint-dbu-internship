import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { trainingService, departmentService, subjectService, userService } from '../../services/api';
import mintLogo from '../../images/mint-logo.png';
import { toast } from '../../components/Toast';

const EditTraining = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [formData, setFormData] = useState({
    training_title: '',
    training_description: '',
    training_type: 'Online',
    location_or_meeting_link: '',
    start_date: '',
    end_date: '',
    capacity: 20,
    status: 'draft',
    subject_id: '',
    department_id: '',
    trainer_id: '',
    is_all_departments: false
  });

  useEffect(() => {
    fetchTraining();
    fetchDepartments();
    fetchSubjects();
    fetchTrainers();
  }, [id]);

  const fetchDepartments = async () => {
    const res = await departmentService.getAll();
    setDepartments(res.data?.departments || []);
  };

  const fetchSubjects = async () => {
    const res = await subjectService.getAll();
    setSubjects(res.data?.subjects || []);
  };

  const fetchTrainers = async () => {
    const res = await userService.getAll();
    setTrainers(res.data?.users?.filter((u) => u.role === 'trainer') || []);
  };

  const fetchTraining = async () => {
    try {
      const res = await trainingService.getById(id);
      const training = res.data?.training || res.training;
      setFormData({
        training_title: training.training_title || '',
        training_description: training.training_description || '',
        training_type: training.training_type || 'Online',
        location_or_meeting_link: training.location_or_meeting_link || '',
        start_date: training.start_date ? training.start_date.slice(0, 16) : '',
        end_date: training.end_date ? training.end_date.slice(0, 16) : '',
        capacity: training.capacity || 20,
        status: training.status || 'draft',
        subject_id: training.subject_id || '',
        department_id: training.is_all_departments ? 'all' : (training.department_id || ''),
        trainer_id: training.trainer_id || '',
        is_all_departments: training.is_all_departments || false
      });
    } catch (error) {
      console.error('Failed to fetch training:', error);
      toast.warning('Training not found');
      navigate('/admin/trainings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'department_id') {
      setFormData({
        ...formData,
        department_id: value,
        subject_id: '',
        is_all_departments: value === 'all'
      });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const filteredSubjects = formData.department_id && formData.department_id !== 'all'
    ? subjects.filter((s) => String(s.department_id) === String(formData.department_id))
    : subjects;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await trainingService.update(id, formData);
      toast.success('Training updated successfully!');
      navigate(`/admin/trainings/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update training');
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
            <p className="text-mint-gray">Loading training...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <img 
          src={mintLogo} 
          alt="MinT Logo" 
          className="h-10 w-auto object-contain"
        />
        <div>
          <h1 className="text-2xl font-bold text-mint-primary">Edit Training</h1>
          <p className="text-mint-gray">Update training program details</p>
        </div>
      </div>

      {/* Back Button */}
      <Link to={`/admin/trainings/${id}`} className="flex items-center gap-2 text-mint-gray hover:text-mint-primary transition mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Details
      </Link>

      {/* Edit Form */}
      <div className="bg-white rounded-xl shadow-card p-6 max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-mint-primary mb-1">Training Title</label>
            <input
              type="text"
              name="training_title"
              value={formData.training_title}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-mint-primary mb-1">Description</label>
            <textarea
              name="training_description"
              value={formData.training_description}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-mint-primary mb-1">Training Type</label>
              <select
                name="training_type"
                value={formData.training_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
              >
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-mint-primary mb-1">Department</label>
              <select
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
              >
                <option value="">Select Department</option>
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              <p className="text-xs text-mint-gray mt-1">
                {formData.department_id === 'all'
                  ? 'Trainees from every department can request this training.'
                  : 'Only trainees in this department can request it.'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-mint-primary mb-1">Subject</label>
              <select
                name="subject_id"
                value={formData.subject_id}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                required
              >
                <option value="">Select Subject</option>
                {filteredSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-mint-primary mb-1">Assigned Trainer</label>
              <select
                name="trainer_id"
                value={formData.trainer_id}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
              >
                <option value="">Select Trainer</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>{trainer.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-mint-primary mb-1">Capacity</label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-mint-primary mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
              >
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-mint-primary mb-1">Location / Meeting Link</label>
            <input
              type="text"
              name="location_or_meeting_link"
              value={formData.location_or_meeting_link}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-mint-primary mb-1">Start Date</label>
              <input
                type="datetime-local"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-mint-primary mb-1">End Date</label>
              <input
                type="datetime-local"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-mint-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update Training'}
            </button>
            <Link to={`/admin/trainings/${id}`} className="text-mint-gray hover:text-mint-primary transition">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default EditTraining;

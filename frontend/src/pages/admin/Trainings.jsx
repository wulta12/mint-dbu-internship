import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Eye,
  BookOpen, Search
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { trainingService } from '../../services/api';
import mintLogo from '../../images/mint-logo.png';
import { toast } from '../../components/Toast';
import { confirm } from '../../components/ConfirmDialog';

const AdminTrainings = () => {
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState([]);
  const [filteredTrainings, setFilteredTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchTrainings();
  }, []);

  useEffect(() => {
    filterTrainings();
  }, [searchTerm, filterStatus, trainings]);

  const fetchTrainings = async () => {
    try {
      const res = await trainingService.getAll();
      setTrainings(res.data?.trainings || []);
      setFilteredTrainings(res.data?.trainings || []);
    } catch (error) {
      console.error('Failed to fetch trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTrainings = () => {
    let filtered = trainings;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(t =>
        t.training_title?.toLowerCase().includes(term) ||
        t.training_type?.toLowerCase().includes(term) ||
        t.status?.toLowerCase().includes(term)
      );
    }

    setFilteredTrainings(filtered);
  };

  const handleDelete = async (id) => {
    if (await confirm('Are you sure you want to delete this training?', { title: 'Delete Training', confirmText: 'Delete' })) {
      try {
        await trainingService.delete(id);
        fetchTrainings();
        toast.success('Training deleted successfully!');
      } catch (error) {
        toast.error('Failed to delete training');
      }
    }
  };

  const handleView = (id) => {
    navigate(`/admin/trainings/${id}`);
  };

  const handleEdit = (id) => {
    navigate(`/admin/trainings/${id}/edit`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-mint-gray">Loading trainings...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header with Logo */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img 
            src={mintLogo} 
            alt="MinT Logo" 
            className="h-10 w-auto object-contain"
          />
          <div>
            <h1 className="text-2xl font-bold text-mint-primary">Training Management</h1>
            <p className="text-mint-gray">Manage all training programs</p>
          </div>
        </div>
        <Link 
          to="/admin/trainings/create" 
          className="flex items-center gap-2 bg-mint-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          Create Training
        </Link>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search trainings by title, type, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition text-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition text-sm bg-white"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Results Count */}
      <p className="text-sm text-gray-500 mb-4">
        Showing <span className="font-semibold">{filteredTrainings.length}</span> of {trainings.length} trainings
        {searchTerm && ` (filtered by "${searchTerm}")`}
        {filterStatus !== 'all' && ` (status: ${filterStatus})`}
      </p>

      {/* Clear Filters */}
      {(searchTerm || filterStatus !== 'all') && (
        <button
          onClick={() => {
            setSearchTerm('');
            setFilterStatus('all');
          }}
          className="text-sm text-mint-primary hover:underline mb-4"
        >
          Clear filters
        </button>
      )}

      {/* Trainings Table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-mint-light border-b border-mint-border">
                <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Title</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Capacity</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrainings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-mint-gray">
                    {searchTerm ? (
                      <>
                        <p>No trainings found matching <span className="font-semibold">"{searchTerm}"</span></p>
                        <button
                          onClick={() => setSearchTerm('')}
                          className="text-mint-primary hover:underline mt-2"
                        >
                          Clear search
                        </button>
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-12 h-12 text-mint-gray mx-auto mb-3" />
                        <p>No trainings found. Create your first training!</p>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                filteredTrainings.map((training) => (
                  <tr key={training.id} className="border-b border-mint-border hover:bg-mint-light/50 transition">
                    <td className="py-3 px-4 text-mint-primary font-medium">
                      <div className="flex items-center gap-2">
                        {training.training_title}
                        {training.is_all_departments && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 whitespace-nowrap">
                            All Departments
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-mint-gray">{training.training_type}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        training.status === 'open' ? 'bg-green-100 text-green-700' :
                        training.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        training.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {training.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-mint-gray">{training.capacity}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleView(training.id)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEdit(training.id)}
                          className="p-1.5 text-yellow-500 hover:bg-yellow-50 rounded transition"
                          title="Edit Training"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(training.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"
                          title="Delete Training"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminTrainings;

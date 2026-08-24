import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, ArrowLeft, Search, Filter, BookOpen, FolderOpen, ClipboardList } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { trainingService } from '../../services/api';

const TrainerTrainings = () => {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const res = await trainingService.getMyTrainings();
      setTrainings(res.data?.trainings || []);
    } catch (error) {
      console.error('Error fetching trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrainings = trainings.filter(training => {
    const matchesSearch = training.training_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || training.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading trainings...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <Link to="/trainer" className="flex items-center gap-2 text-gray-500 hover:text-mint-primary transition text-sm mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Assigned Trainings</h1>
              <p className="text-gray-500">View all trainings assigned to you</p>
            </div>
            <div className="mt-3 sm:mt-0 flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search trainings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-primary"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-primary"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
        </div>

        {/* ONLY Training List - NO STATS, NO QUICK ACTIONS */}
        {filteredTrainings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No Trainings Found</h3>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTrainings.map((training) => (
              <div key={training.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{training.training_title}</h3>
                    <p className="text-gray-500 text-sm mt-1">{training.training_description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    training.status === 'open' ? 'bg-green-100 text-green-700' :
                    training.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    training.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {training.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(training.start_date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {training.capacity} capacity
                  </span>
                </div>

                <div className="flex gap-2 mt-4">
                  <Link 
                    to={`/trainer/participants/${training.id}`}
                    className="flex-1 text-center px-3 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm"
                  >
                    View Participants
                  </Link>
                  <Link 
                    to={`/trainer/attendance/${training.id}`}
                    className="flex-1 text-center px-3 py-2 border border-mint-primary text-mint-primary rounded-lg hover:bg-mint-primary hover:text-white transition text-sm"
                  >
                    Attendance
                  </Link>
                  <Link 
                    to={`/trainer/materials/${training.id}`}
                    className="flex-1 text-center px-3 py-2 border border-mint-accent text-mint-accent rounded-lg hover:bg-mint-accent hover:text-white transition text-sm inline-flex items-center justify-center gap-1"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Materials
                  </Link>
                </div>
                <div className="flex gap-2 mt-2">
                  <Link 
                    to={`/trainer/course-builder/${training.id}`}
                    className="flex-1 text-center px-3 py-2 bg-mint-gold text-white rounded-lg hover:bg-opacity-90 transition text-sm inline-flex items-center justify-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Course Builder
                  </Link>
                  <Link 
                    to={`/trainer/assessment-builder/${training.id}`}
                    className="flex-1 text-center px-3 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm inline-flex items-center justify-center gap-1"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    Assessment
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default TrainerTrainings;

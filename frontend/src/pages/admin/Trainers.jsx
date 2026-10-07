import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Eye, UserPlus } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { userService } from '../../services/api';
import { toast } from '../../components/Toast';
import { confirm } from '../../components/ConfirmDialog';

const Trainers = () => {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      const res = await userService.getAll();
      const trainersList = res.data?.users?.filter(user => user.role === 'trainer') || [];
      setTrainers(trainersList);
    } catch (error) {
      console.error('Failed to fetch trainers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (trainer) => {
    if (!(await confirm(`Delete trainer "${trainer.full_name}"? This will also remove their account and cannot be undone.`, { title: 'Delete Trainer', confirmText: 'Delete' }))) {
      return;
    }
    try {
      await userService.delete(trainer.id);
      setTrainers(prev => prev.filter(t => t.id !== trainer.id));
      toast.success('Trainer deleted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete trainer');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-mint-gray">Loading trainers...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-mint-primary">Trainer Management</h1>
          <p className="text-mint-gray">Manage all trainers</p>
        </div>
        <Link to="/admin/trainers/add" className="flex items-center gap-2 bg-mint-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition">
          <UserPlus className="w-4 h-4" />
          Add Trainer
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-mint-light border-b border-mint-border">
                <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trainers.map((trainer) => (
                <tr key={trainer.id} className="border-b border-mint-border hover:bg-mint-light/50 transition">
                  <td className="py-3 px-4 text-mint-primary font-medium">{trainer.full_name}</td>
                  <td className="py-3 px-4 text-mint-gray">{trainer.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      trainer.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {trainer.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/trainers/${trainer.id}`} className="p-1 text-blue-500 hover:bg-blue-50 rounded transition">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link to={`/admin/trainers/${trainer.id}/edit`} className="p-1 text-yellow-500 hover:bg-yellow-50 rounded transition">
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button onClick={() => handleDelete(trainer)} className="p-1 text-red-500 hover:bg-red-50 rounded transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {trainers.length === 0 && (
          <div className="text-center py-8 text-mint-gray">
            <p>No trainers found. Add your first trainer!</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Trainers;

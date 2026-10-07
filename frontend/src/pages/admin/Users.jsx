import React, { useState, useEffect } from 'react';
import { Search, UserCheck, UserX, Lock } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { userService, departmentService } from '../../services/api';
import { toast } from '../../components/Toast';
import { confirm } from '../../components/ConfirmDialog';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, filterRole, users]);

  const fetchUsers = async () => {
    try {
      const res = await userService.getAll();
      setUsers(res.data?.users || []);
      setFilteredUsers(res.data?.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data?.departments || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleDepartmentChange = async (userId, departmentId) => {
    if (!(await confirm('Update this user\'s department? The department will be locked for the user.', { title: 'Update Department', confirmText: 'Update' }))) {
      return;
    }
    try {
      await userService.updateDepartment(userId, departmentId || null);
      toast.success('Department updated successfully.');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update department');
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.role?.toLowerCase().includes(term) ||
        user.department_name?.toLowerCase().includes(term) ||
        (user.is_active ? 'active' : 'inactive').includes(term)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleStatusToggle = async (userId, currentIsActive) => {
    const newStatus = !currentIsActive;
    if (await confirm(`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} this user?`, { title: `${newStatus ? 'Activate' : 'Deactivate'} User`, confirmText: newStatus ? 'Activate' : 'Deactivate', variant: newStatus ? 'info' : 'danger' })) {
      try {
        await userService.updateStatus(userId, newStatus);
        fetchUsers();
      } catch (error) {
        toast.error('Failed to update user status');
      }
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-mint-gray">Loading users...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-mint-primary">User Management</h1>
        <p className="text-mint-gray">Manage all system users</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition text-sm"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary focus:border-transparent transition text-sm bg-white"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="trainer">Trainer</option>
          <option value="trainee">Trainee</option>
        </select>
      </div>

      {/* Results Count */}
      <p className="text-sm text-gray-500 mb-4">
        Showing <span className="font-semibold">{filteredUsers.length}</span> of {users.length} users
        {searchTerm && ` (filtered by "${searchTerm}")`}
        {filterRole !== 'all' && ` (role: ${filterRole})`}
      </p>

      {/* Clear Filters */}
      {(searchTerm || filterRole !== 'all') && (
        <button
          onClick={() => {
            setSearchTerm('');
            setFilterRole('all');
          }}
          className="text-sm text-mint-primary hover:underline mb-4"
        >
          Clear filters
        </button>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-mint-light border-b border-mint-border">
                <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Role</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Department</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-mint-gray">
                    {searchTerm ? (
                      <>
                        <p>No users found matching <span className="font-semibold">"{searchTerm}"</span></p>
                        <button
                          onClick={() => setSearchTerm('')}
                          className="text-mint-primary hover:underline mt-2"
                        >
                          Clear search
                        </button>
                      </>
                    ) : (
                      <p>No users found</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-mint-border hover:bg-mint-light/50 transition">
                    <td className="py-3 px-4 text-mint-primary font-medium">{user.full_name}</td>
                    <td className="py-3 px-4 text-mint-gray">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'trainer' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={user.department_id || ''}
                          onChange={(e) => handleDepartmentChange(user.id, e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-mint-primary"
                        >
                          <option value="">No department</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                        {user.department_locked && (
                          <Lock className="w-3.5 h-3.5 text-yellow-600" title="Locked" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.is_active ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {user.is_active ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleStatusToggle(user.id, user.is_active)}
                        className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
                          user.is_active
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        } transition`}
                      >
                        {user.is_active ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
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

export default AdminUsers;

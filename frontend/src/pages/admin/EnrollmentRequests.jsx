import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, Inbox, RefreshCw, Search } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { participantService, departmentService } from '../../services/api';
import { toast } from '../../components/Toast';
import { confirm } from '../../components/ConfirmDialog';

const STATUS_META = {
  pending: { label: 'Pending', cls: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Enrolled', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-700' },
  completed: { label: 'Completed', cls: 'bg-purple-100 text-purple-700' },
};

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Enrolled' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const EnrollmentRequests = () => {
  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchDepartments = async () => {
      const res = await departmentService.getAll();
      setDepartments(res.data?.departments || []);
    };
    fetchDepartments();
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await participantService.getRequests({
        status: statusFilter || undefined,
        department_id: departmentFilter || undefined,
        search: search || undefined
      });
      setRequests(res.data?.requests || []);
    } catch (error) {
      console.error('Error fetching enrollment requests:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, departmentFilter, search]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSearch = () => {
    fetchRequests();
  };

  const handleDecision = async (requestId, status) => {
    if (processingId) return;

    const action = status === 'approved' ? 'approve' : 'reject';
    if (!(await confirm(`Are you sure you want to ${action} this enrollment request?`, { title: `${action.charAt(0).toUpperCase() + action.slice(1)} Enrollment`, confirmText: action.charAt(0).toUpperCase() + action.slice(1) }))) {
      return;
    }

    try {
      setProcessingId(requestId);
      await participantService.updateStatus(requestId, status);
      toast.success(status === 'approved'
        ? 'Enrollment approved. Trainee is now officially enrolled.'
        : 'Enrollment request rejected.');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update request');
    } finally {
      setProcessingId(null);
    }
  };

  const renderActionButtons = (request) => {
    const isCompleted = request.status === 'completed';
    const alreadyApproved = request.status === 'approved';
    const alreadyRejected = request.status === 'rejected';
    const canApprove = !alreadyApproved && !isCompleted;
    const canReject = !alreadyRejected && !isCompleted;
    return (
      <div className="flex gap-2">
        <button
          onClick={() => handleDecision(request.id, 'approved')}
          disabled={processingId === request.id || !canApprove}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
            canApprove ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400'
          }`}
          title={alreadyApproved ? 'Already approved/enrolled' : 'Approve enrollment'}
        >
          <Check className="w-3 h-3" />
          Approve
        </button>
        <button
          onClick={() => handleDecision(request.id, 'rejected')}
          disabled={processingId === request.id || !canReject}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
            canReject ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gray-100 text-gray-400'
          }`}
          title={alreadyRejected ? 'Already rejected' : 'Reject enrollment'}
        >
          <X className="w-3 h-3" />
          Reject
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-mint-gray">Loading enrollment requests...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-mint-primary">Enrollment Requests</h1>
          <p className="text-mint-gray">Review trainee requests and manage enrollment across all statuses</p>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 px-4 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-mint-gray absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search trainee, email, or training..."
            className="w-full pl-9 pr-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary text-sm"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary text-sm"
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-mint-light text-mint-primary rounded-lg hover:bg-mint-primary hover:text-white transition text-sm font-medium"
        >
          Apply Filters
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-10 text-center">
          <Inbox className="w-16 h-16 text-mint-gray mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-mint-primary">No Requests Found</h3>
          <p className="text-mint-gray mt-1">No enrollment requests match the current filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-mint-light border-b border-mint-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Trainee</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Department</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Training</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Start Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Requested</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b border-mint-border hover:bg-mint-light/50 transition">
                    <td className="py-3 px-4">
                      <p className="font-medium text-mint-primary">{request.trainee_name}</p>
                      <p className="text-xs text-mint-gray">{request.trainee_email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {request.is_all_departments ? 'All Departments' : (request.department_name || 'N/A')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-mint-primary">{request.training_title}</td>
                    <td className="py-3 px-4 text-mint-gray">
                      {request.start_date ? new Date(request.start_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-mint-gray">
                      {new Date(request.registered_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${(STATUS_META[request.status] || STATUS_META.pending).cls}`}>
                        {(STATUS_META[request.status] || STATUS_META.pending).label}
                      </span>
                      {request.status === 'cancelled' && request.cancelled_by_name && (
                        <p className="text-xs text-mint-gray mt-1">
                          by {request.cancelled_by_name}
                        </p>
                      )}
                      {request.status === 'approved' && request.approved_by_name && (
                        <p className="text-xs text-mint-gray mt-1">
                          by {request.approved_by_name}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {renderActionButtons(request)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default EnrollmentRequests;
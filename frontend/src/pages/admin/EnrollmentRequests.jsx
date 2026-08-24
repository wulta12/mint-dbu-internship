import React, { useState, useEffect } from 'react';
import { Check, X, Inbox, RefreshCw } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { participantService } from '../../services/api';
import { toast } from '../../components/Toast';
import { confirm } from '../../components/ConfirmDialog';

const EnrollmentRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await participantService.getPendingRequests();
      setRequests(res.data?.requests || []);
    } catch (error) {
      console.error('Error fetching enrollment requests:', error);
    } finally {
      setLoading(false);
    }
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
          <p className="text-mint-gray">Review trainee requests and approve or reject enrollment</p>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 px-4 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-10 text-center">
          <Inbox className="w-16 h-16 text-mint-gray mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-mint-primary">No Pending Requests</h3>
          <p className="text-mint-gray mt-1">All enrollment requests have been reviewed.</p>
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
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Start Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Requested</th>
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
                    <td className="py-3 px-4 text-mint-gray">{request.training_type}</td>
                    <td className="py-3 px-4 text-mint-gray">
                      {new Date(request.start_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-mint-gray">
                      {new Date(request.registered_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDecision(request.id, 'approved')}
                          disabled={processingId === request.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition text-sm disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleDecision(request.id, 'rejected')}
                          disabled={processingId === request.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
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


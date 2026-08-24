import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Users, ArrowLeft, CheckCircle, XCircle, AlertCircle, Search } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { trainingService, participantService, attendanceService } from '../../services/api';
import { toast } from '../../components/Toast';

const TrainerAttendance = () => {
  const { trainingId } = useParams();
  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState(trainingId || '');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [trainingId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const trainingsRes = await trainingService.getMyTrainings();
      setTrainings(trainingsRes.data?.trainings || []);

      if (trainingId) {
        await loadTrainingData(trainingId);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainingData = async (id) => {
    try {
      const [trainingRes, participantsRes] = await Promise.all([
        trainingService.getById(id),
        participantService.getByTraining(id)
      ]);
      setSelectedTraining(trainingRes.data?.training || trainingRes.training || null);
      setParticipants(participantsRes.participants || []);
      
      const initialAttendance = (participantsRes.participants || []).map(p => ({
        traineeId: p.trainee_id || p.id,
        name: p.full_name,
        email: p.email,
        status: 'present'
      }));
      setAttendanceData(initialAttendance);
    } catch (error) {
      console.error('Error loading training data:', error);
    }
  };

  const handleTrainingSelect = async (e) => {
    const id = e.target.value;
    setSelectedTrainingId(id);
    if (id) {
      await loadTrainingData(id);
    } else {
      setSelectedTraining(null);
      setParticipants([]);
      setAttendanceData([]);
    }
  };

  const handleAttendanceChange = (index, status) => {
    const updated = [...attendanceData];
    updated[index].status = status;
    setAttendanceData(updated);
  };

  const handleSaveAttendance = async () => {
    try {
      await attendanceService.save(selectedTrainingId, new Date().toISOString().slice(0, 10), attendanceData.map(a => ({
        trainee_id: a.traineeId,
        status: a.status
      })));
      toast.success('Attendance saved successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save attendance');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading attendance data...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <Link to="/trainer" className="flex items-center gap-2 text-gray-500 hover:text-mint-primary transition text-sm mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Tracking</h1>
          <p className="text-gray-500">Mark and manage attendance for your training sessions</p>
        </div>

        {/* Training Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Training</label>
          <select
            value={selectedTrainingId}
            onChange={handleTrainingSelect}
            className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
          >
            <option value="">-- Select a training --</option>
            {trainings.map((t) => (
              <option key={t.id} value={t.id}>
                {t.training_title} ({t.training_type})
              </option>
            ))}
          </select>
        </div>

        {!selectedTrainingId ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">Select a Training</h3>
            <p className="text-gray-400 text-sm mt-1">Choose a training from the dropdown above to manage attendance.</p>
          </div>
        ) : (
          <>
            {/* Training Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <h3 className="font-semibold text-gray-800">{selectedTraining?.training_title}</h3>
              <p className="text-sm text-gray-500">{selectedTraining?.training_type} • {selectedTraining?.capacity} participants</p>
            </div>

            {/* Attendance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{attendanceData.filter(a => a.status === 'present').length}</p>
                <p className="text-sm text-green-600">Present</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
                <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{attendanceData.filter(a => a.status === 'absent').length}</p>
                <p className="text-sm text-red-600">Absent</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
                <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">{attendanceData.filter(a => a.status === 'late').length}</p>
                <p className="text-sm text-yellow-600">Late</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search participants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-1/2 pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-primary"
              />
            </div>

            {/* Attendance Table */}
            {participants.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No participants registered for this training yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">#</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceData.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="py-3 px-4 text-sm text-gray-500">{index + 1}</td>
                          <td className="py-3 px-4 text-sm font-medium text-gray-800">{item.name}</td>
                          <td className="py-3 px-4 text-sm text-gray-500">{item.email}</td>
                          <td className="py-3 px-4">
                            <select
                              value={item.status}
                              onChange={(e) => handleAttendanceChange(index, e.target.value)}
                              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-primary"
                            >
                              <option value="present">Present</option>
                              <option value="absent">Absent</option>
                              <option value="late">Late</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Save Button */}
            {participants.length > 0 && (
              <div className="mt-6 text-right">
                <button
                  onClick={handleSaveAttendance}
                  className="px-6 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition"
                >
                  Save Attendance
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default TrainerAttendance;

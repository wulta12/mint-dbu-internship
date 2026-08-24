import React, { useState, useEffect } from 'react';
import { Calendar, Users, CheckCircle, XCircle, Clock, Save, BookOpen, ClipboardList } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { trainingService, participantService, attendanceService } from '../../services/api';
import { toast } from '../../components/Toast';

const statusOptions = [
  { value: 'present', label: 'Present', icon: CheckCircle, active: 'bg-green-600 text-white border-green-600', idle: 'text-green-600 border-green-300 bg-green-50' },
  { value: 'absent', label: 'Absent', icon: XCircle, active: 'bg-red-600 text-white border-red-600', idle: 'text-red-600 border-red-300 bg-red-50' },
  { value: 'late', label: 'Late', icon: Clock, active: 'bg-yellow-500 text-white border-yellow-500', idle: 'text-yellow-600 border-yellow-300 bg-yellow-50' }
];

const Attendance = () => {
  const [trainings, setTrainings] = useState([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedDates, setSavedDates] = useState([]);

  useEffect(() => {
    fetchTrainings();
  }, []);

  useEffect(() => {
    if (selectedTrainingId) {
      loadTrainingData(selectedTrainingId, date);
    }
  }, [selectedTrainingId, date]);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const res = await trainingService.getAll();
      setTrainings(res.data?.trainings || []);
    } catch (error) {
      console.error('Failed to fetch trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainingData = async (trainingId, attendanceDate) => {
    try {
      setLoading(true);
      const [participantsRes, attendanceRes] = await Promise.all([
        participantService.getByTraining(trainingId),
        attendanceService.getByTraining(trainingId, attendanceDate)
      ]);

      const enrolled = (participantsRes.participants || []).filter(
        (p) => p.participation_status === 'approved' || p.participation_status === 'completed'
      );

      const existing = (attendanceRes.data?.records || []).reduce((map, r) => {
        map[String(r.trainee_id)] = r.attendance_status;
        return map;
      }, {});

      setRecords(
        enrolled.map((p) => ({
          trainee_id: p.trainee_id || p.id,
          name: p.full_name,
          email: p.email,
          status: existing[String(p.trainee_id || p.id)] || 'present'
        }))
      );
      setSavedDates(attendanceRes.data?.dates || []);
    } catch (error) {
      console.error('Failed to load training data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrainingSelect = (e) => {
    setSelectedTrainingId(e.target.value);
  };

  const setStatus = (index, status) => {
    const updated = [...records];
    updated[index].status = status;
    setRecords(updated);
  };

  const handleSave = async () => {
    if (!selectedTrainingId || !date) return;
    setSaving(true);
    try {
      const payload = records.map((r) => ({ trainee_id: r.trainee_id, status: r.status }));
      await attendanceService.save(selectedTrainingId, date, payload);
      toast.success('Attendance saved successfully');
      loadTrainingData(selectedTrainingId, date);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const count = (status) => records.filter((r) => r.status === status).length;

  if (loading && trainings.length === 0) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-mint-primary">Attendance Management</h1>
        <p className="text-mint-gray">Track and manage attendance for all training programs.</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-card p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-mint-primary mb-1">Training Program</label>
          <select
            value={selectedTrainingId}
            onChange={handleTrainingSelect}
            className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
          >
            <option value="">Select Training</option>
            {trainings.map((t) => (
              <option key={t.id} value={t.id}>{t.training_title} ({t.training_type})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-mint-primary mb-1">Session Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2 border border-mint-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-primary"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleSave}
            disabled={saving || !selectedTrainingId || records.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-mint-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>

      {/* Existing sessions */}
      {savedDates.length > 0 && (
        <div className="bg-white rounded-xl shadow-card p-4 mb-6">
          <p className="text-sm font-semibold text-mint-primary mb-2 flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Saved Sessions
          </p>
          <div className="flex flex-wrap gap-2">
            {savedDates.map((d) => (
              <button
                key={d}
                onClick={() => setDate(typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10))}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  String(date) === String(typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10))
                    ? 'bg-mint-primary text-white'
                    : 'bg-mint-light text-mint-primary hover:bg-opacity-70'
                }`}
              >
                {new Date(d).toLocaleDateString()}
              </button>
            ))}
          </div>
        </div>
      )}

      {!selectedTrainingId ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <Calendar className="w-16 h-16 text-mint-gray mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-mint-primary">Select a Training</h3>
          <p className="text-mint-gray text-sm mt-1">Choose a training program to manage its attendance.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{count('present')}</p>
              <p className="text-sm text-green-600">Present</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
              <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">{count('absent')}</p>
              <p className="text-sm text-red-600">Absent</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
              <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-600">{count('late')}</p>
              <p className="text-sm text-yellow-600">Late</p>
            </div>
            <div className="bg-mint-light rounded-lg p-4 text-center border border-mint-border">
              <Users className="w-8 h-8 text-mint-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-mint-primary">{records.length}</p>
              <p className="text-sm text-mint-primary">Enrolled Trainees</p>
            </div>
          </div>

          {/* Records */}
          {records.length === 0 ? (
            <div className="bg-white rounded-xl shadow-card p-12 text-center">
              <BookOpen className="w-16 h-16 text-mint-gray mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-mint-primary">No Enrolled Trainees</h3>
              <p className="text-mint-gray text-sm mt-1">No approved trainees are enrolled in this training yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-mint-light border-b border-mint-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">#</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Trainee</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((item, index) => (
                      <tr key={item.trainee_id} className="border-b border-mint-border hover:bg-mint-light/50 transition">
                        <td className="py-3 px-4 text-sm text-mint-gray">{index + 1}</td>
                        <td className="py-3 px-4 text-sm font-medium text-mint-primary">{item.name}</td>
                        <td className="py-3 px-4 text-sm text-mint-gray">{item.email}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {statusOptions.map((opt) => {
                              const Icon = opt.icon;
                              const active = item.status === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => setStatus(index, opt.value)}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                                    active ? opt.active : opt.idle
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
};

export default Attendance;

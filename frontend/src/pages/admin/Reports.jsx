import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  BookOpen, Users, Award, ClipboardList, GraduationCap,
  CheckCircle, XCircle, Clock, RefreshCw, FileText, Building2
} from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { reportService } from '../../services/api';

const COLORS = ['#0B3D91', '#D4AF37', '#22C55E', '#EF4444', '#EAB308'];

const Reports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await reportService.getOverview();
      setData(res);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-mint-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  const summary = data?.summary || {};
  const attendance = data?.attendance || {};
  const byDepartment = data?.byDepartment || [];
  const byTraining = data?.byTraining || [];
  const byType = data?.byType || [];

  const attendancePie = [
    { name: 'Present', value: attendance.present || 0 },
    { name: 'Absent', value: attendance.absent || 0 },
    { name: 'Late', value: attendance.late || 0 },
    { name: 'Excused', value: attendance.excused || 0 }
  ].filter((i) => i.value > 0);

  const statCards = [
    { label: 'Trainings', value: summary.trainings || 0, icon: BookOpen, color: 'bg-blue-600' },
    { label: 'Trainees', value: summary.trainees || 0, icon: Users, color: 'bg-green-600' },
    { label: 'Enrollments', value: summary.enrollments || 0, icon: ClipboardList, color: 'bg-purple-600' },
    { label: 'Certificates', value: summary.certificates || 0, icon: Award, color: 'bg-yellow-600' },
    { label: 'Pending Requests', value: summary.pendingRequests || 0, icon: FileText, color: 'bg-orange-600' },
    { label: 'Total Users', value: summary.totalUsers || 0, icon: GraduationCap, color: 'bg-indigo-600' }
  ];

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-mint-primary">Reports & Analytics</h1>
          <p className="text-mint-gray">View training reports and analytics.</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl shadow-card p-4">
              <div className={`${card.color} w-10 h-10 rounded-lg flex items-center justify-center text-white mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-mint-primary">{card.value}</p>
              <p className="text-sm text-mint-gray">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Trainings by department */}
        <div className="bg-white rounded-xl shadow-card p-5">
          <h3 className="text-base font-semibold text-mint-primary mb-1">Trainings & Enrollments by Department</h3>
          <p className="text-xs text-mint-gray mb-4">Distribution of training programs across departments</p>
          {byDepartment.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDepartment} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="department_name" tick={{ fontSize: 11, fill: '#64748B' }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="training_count" name="Trainings" fill="#0B3D91" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="enrollment_count" name="Enrollments" fill="#D4AF37" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-16 text-mint-gray text-sm">No department data available yet</div>
          )}
        </div>

        {/* Attendance distribution */}
        <div className="bg-white rounded-xl shadow-card p-5">
          <h3 className="text-base font-semibold text-mint-primary mb-1">Attendance Distribution</h3>
          <p className="text-xs text-mint-gray mb-4">Overall present / absent / late across all sessions</p>
          {attendancePie.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={attendancePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {attendancePie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-16 text-mint-gray text-sm">No attendance data recorded yet</div>
          )}
        </div>
      </div>

      {/* Training performance table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden mb-6">
        <div className="p-5 border-b border-mint-border">
          <h3 className="text-base font-semibold text-mint-primary">Training Performance</h3>
          <p className="text-xs text-mint-gray mt-0.5">Enrollment, attendance and certificates per training</p>
        </div>
        {byTraining.length === 0 ? (
          <div className="text-center py-12 text-mint-gray text-sm">No trainings available yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-mint-light border-b border-mint-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Training</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Department</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">Enrolled</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">
                    <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-600" /> Present</span>
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">
                    <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-red-600" /> Absent</span>
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-yellow-600" /> Late</span>
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-mint-gray">
                    <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-yellow-600" /> Certificates</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {byTraining.map((t) => (
                  <tr key={t.id} className="border-b border-mint-border hover:bg-mint-light/50 transition">
                    <td className="py-3 px-4 text-sm font-medium text-mint-primary">{t.training_title}</td>
                    <td className="py-3 px-4 text-sm text-mint-gray">{t.department_name || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-mint-gray">{t.training_type}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        t.status === 'open' ? 'bg-green-100 text-green-700' :
                        t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        t.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{t.status}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-mint-gray">{t.approved_count || 0}</td>
                    <td className="py-3 px-4 text-sm text-green-700">{t.present || 0}</td>
                    <td className="py-3 px-4 text-sm text-red-700">{t.absent || 0}</td>
                    <td className="py-3 px-4 text-sm text-yellow-700">{t.late || 0}</td>
                    <td className="py-3 px-4 text-sm text-mint-gray">{t.certificate_count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Training types */}
      <div className="bg-white rounded-xl shadow-card p-5">
        <h3 className="text-base font-semibold text-mint-primary mb-1">Trainings by Type</h3>
        <p className="text-xs text-mint-gray mb-4">Distribution by delivery method</p>
        {byType.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {byType.map((type, index) => (
              <div key={type.training_type} className="bg-mint-light rounded-lg p-4 text-center">
                <Building2 className="w-6 h-6 text-mint-primary mx-auto mb-2" style={{ color: COLORS[index % COLORS.length] }} />
                <p className="text-2xl font-bold text-mint-primary">{type.total}</p>
                <p className="text-sm text-mint-gray">{type.training_type}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-mint-gray text-sm">No training type data available yet</div>
        )}
      </div>
    </AppLayout>
  );
};

export default Reports;

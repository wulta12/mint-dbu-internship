import React, { useState, useEffect, useCallback } from 'react';
import {
  Video, Calendar, Clock, Plus, Pencil, Trash2,
  Users, CheckCircle, XCircle, AlertCircle, Save, ExternalLink, Clock3
} from 'lucide-react';
import { trainingService, meetingService } from '../services/api';
import { toast } from './Toast';
import { confirm } from './ConfirmDialog';
import { useLanguage } from '../i18n/LanguageContext';

const STATUSES = ['present', 'absent', 'late', 'excused'];

const EMPTY_FORM = {
  title: '',
  platform: 'zoom',
  meeting_link: '',
  meeting_date: '',
  start_time: '',
  end_time: ''
};

const STATUS_STYLES = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-yellow-100 text-yellow-700',
  excused: 'bg-blue-100 text-blue-700'
};

/**
 * Live meeting management for ONE training.
 *
 * Shared by the admin training page and the trainer meetings page so both
 * roles get identical behaviour and there is a single copy of the create /
 * edit / delete / attendance logic.
 *
 * showTrainingSelect=true adds a picker limited to the trainer's own
 * trainings (the admin case always passes an explicit trainingId).
 *
 * All authorisation happens server-side; this component only reflects what
 * the API allows.
 */
const MeetingsManager = ({ trainingId, showTrainingSelect = false, fixedTitle = '' }) => {
  const { t } = useLanguage();

  const [trainings, setTrainings] = useState([]);
  const [selectedId, setSelectedId] = useState(trainingId ? String(trainingId) : '');
  const [trainingTitle, setTrainingTitle] = useState(fixedTitle);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [attendanceFor, setAttendanceFor] = useState(null);
  const [roster, setRoster] = useState([]);
  const [summary, setSummary] = useState(null);
  const [marks, setMarks] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  const loadMeetings = useCallback(async (id) => {
    if (!id) {
      setMeetings([]);
      return;
    }
    try {
      const res = await meetingService.getForManagement(id);
      setMeetings(res.data?.meetings || []);
      if (res.data?.training_title) setTrainingTitle(res.data.training_title);
    } catch (error) {
      // 403 here means the caller does not own this training.
      setMeetings([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        setLoading(true);
        let id = trainingId ? String(trainingId) : '';
        if (showTrainingSelect) {
          const res = await trainingService.getMyTrainings();
          if (cancelled) return;
          setTrainings(res.data?.trainings || []);
          id = id || (res.data?.trainings?.[0]?.id ? String(res.data.trainings[0].id) : '');
        }
        setSelectedId(id);
        await loadMeetings(id);
      } catch (error) {
        console.error('Error loading meetings:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, [trainingId, showTrainingSelect, loadMeetings]);

  const handleTrainingSelect = async (e) => {
    const id = e.target.value;
    setSelectedId(id);
    setShowForm(false);
    setAttendanceFor(null);
    await loadMeetings(id);
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };

  const openEdit = (meeting) => {
    setEditing(meeting.id);
    setForm({
      title: meeting.title || '',
      platform: meeting.platform || 'zoom',
      meeting_link: meeting.meeting_link || '',
      meeting_date: String(meeting.meeting_date || '').slice(0, 10),
      start_time: String(meeting.start_time || '').slice(0, 5),
      end_time: String(meeting.end_time || '').slice(0, 5)
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId) return;

    // Mirrors the server rule; the server enforces it regardless.
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      toast.error(t('End time must be after start time'));
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title,
        platform: 'zoom',
        meeting_link: form.meeting_link,
        meeting_date: form.meeting_date,
        start_time: form.start_time,
        end_time: form.end_time
      };
      if (editing) {
        await meetingService.update(editing, payload);
        toast.success(t('Meeting updated'));
      } else {
        await meetingService.create(selectedId, payload);
        toast.success(t('Meeting created'));
      }
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await loadMeetings(selectedId);
    } catch (error) {
      toast.error(error.response?.data?.message || t('Failed to save meeting'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (meeting) => {
    const ok = await confirm(
      t('Delete this meeting? The Zoom link will stop working for participants.'),
      { title: t('Delete Meeting'), confirmText: t('Delete'), variant: 'danger' }
    );
    if (!ok) return;
    try {
      await meetingService.remove(meeting.id);
      toast.success(t('Meeting deleted'));
      if (attendanceFor?.id === meeting.id) setAttendanceFor(null);
      await loadMeetings(selectedId);
    } catch (error) {
      toast.error(error.response?.data?.message || t('Failed to delete meeting'));
    }
  };

  const openAttendance = async (meeting) => {
    setAttendanceFor(meeting);
    setAttendanceLoading(true);
    try {
      const res = await meetingService.getAttendance(meeting.id);
      const list = res.data?.roster || [];
      setRoster(list);
      setSummary(res.data?.summary || null);
      const initial = {};
      list.forEach((p) => { initial[p.trainee_id] = p.attendance_status || 'present'; });
      setMarks(initial);
    } catch (error) {
      toast.error(error.response?.data?.message || t('Failed to load attendance'));
      setRoster([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const saveAttendance = async () => {
    if (!attendanceFor) return;
    try {
      setAttendanceSaving(true);
      const records = roster.map((p) => ({
        trainee_id: p.trainee_id,
        status: marks[p.trainee_id] || 'present'
      }));
      const res = await meetingService.saveAttendance(attendanceFor.id, records);
      toast.success(res.data?.message || t('Attendance saved'));
      const fresh = await meetingService.getAttendance(attendanceFor.id);
      setRoster(fresh.data?.roster || []);
      setSummary(fresh.data?.summary || null);
      await loadMeetings(selectedId);
    } catch (error) {
      toast.error(error.response?.data?.message || t('Failed to save attendance'));
    } finally {
      setAttendanceSaving(false);
    }
  };

  // meeting_date arrives as a plain YYYY-MM-DD. Construct the Date from its
  // parts so it is not read as UTC midnight and shifted a day backwards.
  const formatDate = (value) => {
    const [y, m, d] = String(value).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString(undefined, {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const formatTime12h = (value) => {
    const [hh, mm] = String(value || '').split(':').map(Number);
    return `${hh % 12 === 0 ? 12 : hh % 12}:${String(mm || 0).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
  };

  if (loading) {
    return <p className="text-sm text-mint-gray py-4">{t('Loading meetings...')}</p>;
  }

  return (
    <div>
      {showTrainingSelect && (
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">{t('Select Training')}</label>
          <select
            value={selectedId}
            onChange={handleTrainingSelect}
            className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-primary"
          >
            <option value="">{t('-- Select a training --')}</option>
            {trainings.map((tr) => (
              <option key={tr.id} value={tr.id}>{tr.training_title}</option>
            ))}
          </select>
        </div>
      )}

      {selectedId && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {t('Live Meetings')}{trainingTitle ? ` — ${trainingTitle}` : ''}
          </h3>
          {!showForm && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              {t('New Meeting')}
            </button>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-5 space-y-4">
          <h4 className="font-semibold text-gray-800">
            {editing ? t('Edit Meeting') : t('New Meeting')}
          </h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('Meeting Title')}</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t('e.g. AI Fundamentals - Live Session 1')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('Meeting Platform')}</label>
            {/* Zoom only by design: read-only so an invalid platform cannot be typed. */}
            <input
              type="text"
              value="Zoom"
              readOnly
              className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('Zoom Meeting Link')}</label>
            <input
              type="url"
              value={form.meeting_link}
              onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
              placeholder="https://zoom.us/j/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-primary"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('Meeting Date')}</label>
              <input
                type="date"
                value={form.meeting_date}
                onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('Start Time')}</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('End Time')}</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-primary"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm font-medium disabled:opacity-50"
            >
              {saving ? t('Saving...') : editing ? t('Save Changes') : t('Create Meeting')}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition text-sm font-medium"
            >
              {t('Cancel')}
            </button>
          </div>
        </form>
      )}

      {selectedId && !showForm && (
        meetings.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-10 text-center">
            <Video className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">{t('No meetings scheduled')}</p>
            <p className="text-gray-500 text-sm mt-1">
              {t('Create a Zoom meeting and it will appear for every approved participant of this training.')}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {meetings.map((meeting) => (
              <li key={meeting.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-gray-800">{meeting.title}</h4>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {meeting.platform === 'zoom' ? 'Zoom' : meeting.platform}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-mint-primary" />
                        {formatDate(meeting.meeting_date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-mint-primary" />
                        {formatTime12h(meeting.start_time)} &ndash; {formatTime12h(meeting.end_time)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-mint-primary" />
                        {meeting.attendance_count || 0} {t('marked')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <a
                      href={meeting.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t('Open Link')}
                    </a>
                    <button
                      onClick={() => openAttendance(meeting)}
                      className="flex items-center gap-1.5 px-3 py-2 border border-mint-primary text-mint-primary rounded-lg hover:bg-mint-primary hover:text-white transition text-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {t('Attendance')}
                    </button>
                    <button
                      onClick={() => openEdit(meeting)}
                      className="flex items-center gap-1.5 px-3 py-2 border border-yellow-500 text-yellow-600 rounded-lg hover:bg-yellow-500 hover:text-white transition text-sm"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {t('Edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(meeting)}
                      className="flex items-center gap-1.5 px-3 py-2 border border-red-500 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition text-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t('Delete')}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )
      )}

      {attendanceFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-800">{t('Attendance')}</h3>
                <p className="text-sm text-gray-500">{attendanceFor.title}</p>
              </div>
              <button onClick={() => setAttendanceFor(null)} className="text-gray-400 hover:text-gray-700">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-700">{t('Present')}</p>
                    <p className="text-xl font-bold text-green-800">{Number(summary.present || 0)}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-red-700">{t('Absent')}</p>
                    <p className="text-xl font-bold text-red-800">{Number(summary.absent || 0)}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-yellow-700">{t('Late')}</p>
                    <p className="text-xl font-bold text-yellow-800">{Number(summary.late || 0)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600">{t('Approved')}</p>
                    <p className="text-xl font-bold text-gray-800">{Number(summary.approved_participants || 0)}</p>
                  </div>
                </div>
              )}

              {attendanceLoading ? (
                <p className="text-sm text-gray-500">{t('Loading...')}</p>
              ) : roster.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    {t('No approved participants yet. Only approved trainees can be marked.')}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {roster.map((person) => (
                    <li
                      key={person.trainee_id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-gray-200 rounded-lg p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{person.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{person.email}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {STATUSES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setMarks({ ...marks, [person.trainee_id]: s })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                              marks[person.trainee_id] === s
                                ? STATUS_STYLES[s]
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {t(s.charAt(0).toUpperCase() + s.slice(1))}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-xs text-gray-400 mt-4 flex items-start gap-1.5">
                <Clock3 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{t('Meeting attendance is recorded separately and does not change learning progress or certificate eligibility.')}</span>
              </p>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setAttendanceFor(null)}
                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
              >
                {t('Close')}
              </button>
              <button
                onClick={saveAttendance}
                disabled={attendanceSaving || roster.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-mint-primary text-white rounded-lg hover:bg-opacity-90 transition text-sm font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {attendanceSaving ? t('Saving...') : t('Save Attendance')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingsManager;
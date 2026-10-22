import axios from 'axios';

// API base URL
//
// The backend is reached on port 5000 of whatever host the page was loaded
// from: localhost in development, the machine's LAN address when the app is
// opened from another device on the same network, the real domain in
// production. Deriving it from window.location keeps a single build usable
// everywhere - hardcoding http://localhost:5000 makes every other device call
// *its own* localhost and fail with a bare network error.
// REACT_APP_API_URL still wins when the API lives somewhere else.
const API_ORIGIN = (
  process.env.REACT_APP_API_URL || `http://${window.location.hostname || 'localhost'}:5000`
)
  .replace(/\/api\/?$/, '')
  .replace(/\/+$/, '');

const API_URL = `${API_ORIGIN}/api`;

// Exported so flows that need a real browser navigation rather than an XHR can
// build an absolute URL from the same value (e.g. starting Google sign-in),
// and so pages/components that show backend-hosted files can build their URLs.
export { API_ORIGIN, API_URL };

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Helper to get error message distinguishing network vs server errors
const getErrorMessage = (error) => {
  if (error.response) {
    return error.response.data?.message || error.response.data || error.message;
  }
  // Network error - could not connect to server
  return 'Could not connect to the backend server. Is the server running?';
};

// ============================================
// AUTH SERVICES
// ============================================
export const authService = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const payload = response.data?.data || response.data;
      if (payload.token) {
        localStorage.setItem('token', payload.token);
        localStorage.setItem('user', JSON.stringify(payload.user));
      }
return payload;
    } catch (error) {
      console.error('Login error:', getErrorMessage(error));
      throw error;
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return response.data;
} catch (error) {
      console.error('Login error:', getErrorMessage(error));
      throw error;
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      console.error('Get profile error:', getErrorMessage(error));
      throw error;
    }
  },

  updateProfile: async (data) => {
    try {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const response = await api.put('/auth/profile', data, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined
      });
      return response.data;
    } catch (error) {
      console.error('Update profile error:', getErrorMessage(error));
      throw error;
    }
  },

  changePassword: async (current_password, new_password) => {
    try {
      const response = await api.put('/auth/password', { current_password, new_password });
      return response.data;
    } catch (error) {
      console.error('Change password error:', getErrorMessage(error));
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Forgot Password. The backend always answers 200 with the same generic
  // message, so there is no way to tell from here whether the address exists.
  requestPasswordReset: async (email, lang) => {
    try {
      const response = await api.post('/auth/forgot-password', { email, lang });
      return response.data;
    } catch (error) {
      console.error('Password reset request error:', getErrorMessage(error));
      throw error;
    }
  },

  // Requests a new code. The previous one is invalidated server-side, so this
  // doubles as the resend action. Returns the same generic message as the
  // initial request, so it cannot be used to probe for accounts.
  resendPasswordOtp: async (email, lang) => {
    try {
      const response = await api.post('/auth/forgot-password/resend-otp', { email, lang });
      return response.data;
    } catch (error) {
      console.error('Resend OTP error:', getErrorMessage(error));
      throw error;
    }
  },

  // Exchanges a 6-digit code for a short-lived reset token, which the existing
  // Reset Password page then consumes. Throws on a wrong, expired, used or
  // locked-out code; the server message explains which.
  verifyPasswordOtp: async (email, otp) => {
    try {
      const response = await api.post('/auth/forgot-password/verify-otp', { email, otp });
      return response.data;
    } catch (error) {
      console.error('Verify OTP error:', getErrorMessage(error));
      throw error;
    }
  },

  // Checks an emailed link before the reset form is shown. Always resolves;
  // callers read `valid` to decide what to render.
  verifyResetToken: async (token) => {
    try {
      const response = await api.get('/auth/reset-password/verify', {
        params: { token }
      });
      return response.data;
    } catch (error) {
      console.error('Verify reset token error:', getErrorMessage(error));
      return { success: false, valid: false, message: error.response?.data?.message };
    }
  },

  resetPassword: async ({ token, password, confirm_password }) => {
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        password,
        confirm_password
      });
      return response.data;
} catch (error) {
      console.error('Toggle department error:', getErrorMessage(error));
      throw error;
    }
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken: () => {
    return localStorage.getItem('token');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
};

// ============================================
// TRAINING SERVICES
// ============================================
export const trainingService = {
  getAll: async () => {
    try {
      const response = await api.get('/trainings');
      return response.data;
    } catch (error) {
      console.error('Get all trainings error:', getErrorMessage(error));
      return { success: true, trainings: [] };
    }
  },

  getAvailable: async () => {
    try {
      const response = await api.get('/trainings/available');
      return response.data;
    } catch (error) {
      console.error('Get available trainings error:', getErrorMessage(error));
      return { success: true, trainings: [] };
    }
  },

  getDepartmentTrainings: async () => {
    try {
      const response = await api.get('/trainings/department/mine');
      return response.data;
    } catch (error) {
      console.error('Get department trainings error:', getErrorMessage(error));
      throw error;
    }
  },

  getMyTrainings: async () => {
    try {
      const response = await api.get('/trainings/my-trainings');
      return response.data;
    } catch (error) {
      console.error('Get my trainings error:', getErrorMessage(error));
      return { success: true, data: { trainings: [] } };
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/trainings/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get training by ID error:', getErrorMessage(error));
      throw error;
    }
  },

  create: async (trainingData) => {
    try {
      const response = await api.post('/trainings', trainingData);
      return response.data;
    } catch (error) {
      console.error('Create training error:', getErrorMessage(error));
      throw error;
    }
  },

  update: async (id, trainingData) => {
    try {
      const response = await api.put(`/trainings/${id}`, trainingData);
      return response.data;
    } catch (error) {
      console.error('Update training error:', getErrorMessage(error));
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/trainings/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete training error:', getErrorMessage(error));
      throw error;
    }
  },
};

// ============================================
// TRAINING MATERIAL SERVICES
// ============================================
const MATERIALS_BASE_URL = API_ORIGIN;

export const materialService = {
  getByTraining: async (trainingId) => {
    try {
      const response = await api.get(`/trainings/${trainingId}/materials`);
      return response.data;
    } catch (error) {
      console.error('Get materials error:', getErrorMessage(error));
      return { success: true, data: { materials: [] } };
    }
  },

  upload: async (trainingId, file, onProgress) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(`/trainings/${trainingId}/materials`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        }
      });
      return response.data;
    } catch (error) {
      console.error('Upload material error:', getErrorMessage(error));
      throw error;
    }
  },

  remove: async (materialId) => {
    try {
      const response = await api.delete(`/materials/${materialId}`);
      return response.data;
    } catch (error) {
      console.error('Delete material error:', getErrorMessage(error));
      throw error;
    }
  },

  getDownloadUrl: (filePath) => {
    if (!filePath) return null;
    if (filePath.startsWith('http')) return filePath;
    return `${MATERIALS_BASE_URL}/uploads/materials/${filePath}`;
  }
};

// ============================================
// PARTICIPANT SERVICES
// ============================================
export const participantService = {
  requestTraining: async (trainingId) => {
    try {
      const response = await api.post(`/training-requests/${trainingId}/request`);
      return response.data;
    } catch (error) {
      console.error('Request enrollment error:', getErrorMessage(error));
      throw error;
    }
  },

  getMyTrainings: async () => {
    try {
      const response = await api.get('/training-requests/my');
      const requests = response.data?.data?.requests || [];
      const trainings = requests.map((r) => {
        // `is_completed` describes the trainee's real lesson progress, which
        // only speaks for an enrollment that exists. A pending or rejected row
        // can inherit a certificate or finished progress from an earlier,
        // separate request for the same training, so overriding its status would
        // label an unapproved request "Completed" and hide the delete button.
        const isEnrollment = r.status === 'approved' || r.status === 'completed';
        return {
          ...r,
          participation_status: r.is_completed && isEnrollment ? 'completed' : r.status,
          training_id: r.training_id
        };
      });
      return { success: true, data: { trainings } };
    } catch (error) {
      console.error('Get my trainings error:', getErrorMessage(error));
      return { success: true, data: { trainings: [] } };
    }
  },

  getPendingRequests: async () => {
    try {
      const response = await api.get('/training-requests');
      const requests = response.data?.data?.requests || [];
      const normalized = requests.map((r) => ({
        ...r,
        participation_status: r.status,
        registered_at: r.requested_at
      }));
      return { success: true, data: { requests: normalized } };
    } catch (error) {
      console.error('Get pending requests error:', getErrorMessage(error));
      return { success: true, data: { requests: [] } };
    }
  },

  getRequests: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.department_id) params.append('department_id', filters.department_id);
      if (filters.training_id) params.append('training_id', filters.training_id);
      if (filters.search) params.append('search', filters.search);
      const qs = params.toString();
      const response = await api.get(`/training-requests${qs ? `?${qs}` : ''}`);
      const requests = response.data?.data?.requests || [];
      const normalized = requests.map((r) => ({
        ...r,
        participation_status: r.status,
        registered_at: r.requested_at
      }));
      return { success: true, data: { requests: normalized } };
    } catch (error) {
      console.error('Get requests error:', getErrorMessage(error));
      return { success: true, data: { requests: [] } };
    }
  },

  cancelRequest: async (requestId) => {
    try {
      const response = await api.delete(`/training-requests/${requestId}`);
      return response.data;
    } catch (error) {
      console.error('Delete request error:', getErrorMessage(error));
      throw error;
    }
  },

  getByTraining: async (trainingId) => {
    try {
      const response = await api.get(`/training-requests/training/${trainingId}`);
      const requests = response.data?.data?.participants || [];
      const participants = requests.map((r) => {
        // `is_completed` is the shared, backend-computed completion signal
        // (stored status, issued certificate, or all required lessons done).
        // Prefer it over the raw status so View Participants agrees with the
        // trainer dashboard Completed card.
        const isEnrollment = r.status === 'approved' || r.status === 'completed';
        return {
          ...r,
          participation_status: r.is_completed && isEnrollment ? 'completed' : r.status,
          registered_at: r.requested_at
        };
      });
      return { success: true, participants };
    } catch (error) {
      console.error('Get participants by training error:', getErrorMessage(error));
      return { success: true, participants: [] };
    }
  },

  // Trainer: every trainee who has completed one of this trainer's trainings.
  // Backed by the same completion rule as the dashboard card, so the two never
  // disagree.
  getCompletedByTrainer: async () => {
    try {
      const response = await api.get('/training-requests/trainer/completed');
      const participants = response.data?.data?.participants || [];
      return {
        success: true,
        participants: participants.map((p) => ({
          ...p,
          participation_status: 'completed',
          registered_at: p.requested_at
        }))
      };
    } catch (error) {
      console.error('Get completed trainees error:', getErrorMessage(error));
      return { success: true, participants: [] };
    }
  },

  updateStatus: async (participantId, status) => {
    try {
      const action = status === 'approved' ? 'approve' : 'reject';
      const response = await api.put(`/training-requests/${participantId}/${action}`, { status });
      return response.data;
    } catch (error) {
      console.error('Update participant status error:', getErrorMessage(error));
      throw error;
    }
  },
};

// ============================================
// CONTACT SERVICES
// ============================================
export const contactService = {
  // Admin inbox: filters = { search, status: 'unread' | 'read' }
  getMessages: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      const qs = params.toString();
      const response = await api.get(`/contact${qs ? `?${qs}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Get contact messages error:', getErrorMessage(error));
      throw error;
    }
  },

  getUnreadCount: async () => {
    try {
      const response = await api.get('/contact/unread-count');
      return response.data?.data?.unread_count || 0;
    } catch (error) {
      console.error('Get unread count error:', getErrorMessage(error));
      return 0;
    }
  },

  markRead: async (id) => {
    try {
      const response = await api.put(`/contact/${id}/read`);
      return response.data;
    } catch (error) {
      console.error('Mark message read error:', getErrorMessage(error));
      throw error;
    }
  },

  markAllRead: async () => {
    try {
      const response = await api.put('/contact/read-all');
      return response.data;
    } catch (error) {
      console.error('Mark all read error:', getErrorMessage(error));
      throw error;
    }
  },

  deleteMessage: async (id) => {
    try {
      const response = await api.delete(`/contact/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete message error:', getErrorMessage(error));
      throw error;
    }
  },

  // Replies to a contact-form message. The reply is emailed to the address the
  // visitor supplied, so `data.email_sent` says whether it actually went out -
  // a stored reply that never reached them still needs to be resent by hand.
  replyMessage: async (id, replyMessage) => {
    try {
      const response = await api.post(`/contact/${id}/reply`, { replyMessage });
      return response.data;
    } catch (error) {
      console.error('Reply to message error:', getErrorMessage(error));
      throw error;
    }
  },
};

// ============================================
// INTERNAL MESSAGE SERVICES
//
// Direct messages between an admin and a signed-in user. Each recipient gets
// their own row so they can read and reply independently.
// ============================================
export const messageService = {
  // Admin: recipient picker. Excludes admins, who administer rather than receive.
  getRecipients: async () => {
    try {
      const response = await api.get('/internal-messages/recipients');
      return response.data;
    } catch (error) {
      console.error('Get recipients error:', getErrorMessage(error));
      throw error;
    }
  },

  // Admin: send to one or more recipients.
  send: async ({ recipientIds, subject, message }) => {
    try {
      const response = await api.post('/internal-messages', { recipientIds, subject, message });
      return response.data;
    } catch (error) {
      console.error('Send message error:', getErrorMessage(error));
      throw error;
    }
  },

  // `role` is optional: a trainee's inbox has nothing to narrow, but an admin
  // passes it to review what they have been sent back per sender role.
  getInbox: async (role) => {
    try {
      const response = await api.get('/internal-messages/inbox', {
        params: role ? { role } : undefined
      });
      return response.data;
    } catch (error) {
      console.error('Get inbox error:', getErrorMessage(error));
      throw error;
    }
  },

  // Admin: everything this admin sent.
  getSent: async () => {
    try {
      const response = await api.get('/internal-messages/sent');
      return response.data;
    } catch (error) {
      console.error('Get sent messages error:', getErrorMessage(error));
      throw error;
    }
  },

  markRead: async (id) => {
    try {
      const response = await api.put(`/internal-messages/${id}/read`);
      return response.data;
    } catch (error) {
      console.error('Mark message read error:', getErrorMessage(error));
      throw error;
    }
  },

  reply: async (id, replyMessage) => {
    try {
      const response = await api.post(`/internal-messages/${id}/reply`, { replyMessage });
      return response.data;
    } catch (error) {
      console.error('Reply message error:', getErrorMessage(error));
      throw error;
    }
  },
};

// ============================================
// ATTENDANCE SERVICES
// ============================================
export const attendanceService = {
  getByTraining: async (trainingId, date) => {
    try {
      const url = date ? `/attendance/training/${trainingId}?date=${date}` : `/attendance/training/${trainingId}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Get attendance error:', getErrorMessage(error));
      return { success: true, data: { records: [], dates: [], summary: {} } };
    }
  },

  save: async (trainingId, attendanceDate, records) => {
    try {
      const response = await api.post(`/attendance/training/${trainingId}`, { attendance_date: attendanceDate, records });
      return response.data;
    } catch (error) {
      console.error('Save attendance error:', getErrorMessage(error));
      throw error;
    }
  },

  getSummary: async (trainingId) => {
    try {
      const response = await api.get(`/attendance/training/${trainingId}/summary`);
      return response.data;
    } catch (error) {
      console.error('Get attendance summary error:', getErrorMessage(error));
      return { success: true, data: { summary: {} } };
    }
  },
};

// ============================================
// LIVE MEETING SERVICES (Zoom)
//
// Every call is authorised server-side. The read paths used by a
// trainee resolve to 403 unless that trainee holds an APPROVED
// enrollment for the training, so no amount of frontend tampering
// reveals a link. Attendance here is MEETING attendance and is
// completely separate from the course `attendance` service above.
// ============================================
export const meetingService = {
  // Trainee view: upcoming meetings for an approved enrollment.
  // `all=true` includes meetings that have already finished.
  getForTraining: async (trainingId, all = false) => {
    try {
      const response = await api.get(`/meeting/training/${trainingId}${all ? '?all=true' : ''}`);
      return response.data;
    } catch (error) {
      console.error('Get meetings error:', getErrorMessage(error));
      throw error;
    }
  },

  // Admin / owning-trainer view: every meeting including past ones.
  getForManagement: async (trainingId) => {
    try {
      const response = await api.get(`/meeting/training/${trainingId}/manage`);
      return response.data;
    } catch (error) {
      console.error('Get meetings (manage) error:', getErrorMessage(error));
      throw error;
    }
  },

  getById: async (meetingId) => {
    try {
      const response = await api.get(`/meeting/${meetingId}`);
      return response.data;
    } catch (error) {
      console.error('Get meeting error:', getErrorMessage(error));
      throw error;
    }
  },

  create: async (trainingId, meetingData) => {
    try {
      const response = await api.post(`/meeting/training/${trainingId}`, meetingData);
      return response.data;
    } catch (error) {
      console.error('Create meeting error:', getErrorMessage(error));
      throw error;
    }
  },

  update: async (meetingId, meetingData) => {
    try {
      const response = await api.put(`/meeting/${meetingId}`, meetingData);
      return response.data;
    } catch (error) {
      console.error('Update meeting error:', getErrorMessage(error));
      throw error;
    }
  },

  remove: async (meetingId) => {
    try {
      const response = await api.delete(`/meeting/${meetingId}`);
      return response.data;
    } catch (error) {
      console.error('Delete meeting error:', getErrorMessage(error));
      throw error;
    }
  },

  // Roster of approved participants plus current attendance marks.
  getAttendance: async (meetingId) => {
    try {
      const response = await api.get(`/meeting/${meetingId}/attendance`);
      return response.data;
    } catch (error) {
      console.error('Get meeting attendance error:', getErrorMessage(error));
      throw error;
    }
  },

  saveAttendance: async (meetingId, records) => {
    try {
      const response = await api.put(`/meeting/${meetingId}/attendance`, { records });
      return response.data;
    } catch (error) {
      console.error('Save meeting attendance error:', getErrorMessage(error));
      throw error;
    }
  },

  getMyAttendance: async () => {
    try {
      const response = await api.get(`/meeting/my/attendance`);
      return response.data;
    } catch (error) {
      console.error('Get my meeting attendance error:', getErrorMessage(error));
      return { success: true, data: { records: [] } };
    }
  },
};

// ============================================
// CERTIFICATE SERVICES
// ============================================
export const certificateService = {
  getMy: async () => {
    try {
      const response = await api.get('/certificates/my');
      return response.data;
    } catch (error) {
      console.error('Get my certificates error:', getErrorMessage(error));
      return { success: true, data: { certificates: [] } };
    }
  },

  getMyCertificates: async () => {
    const res = await certificateService.getMy();
    return { certificates: res.data?.certificates || [] };
  },

  verify: async (code) => {
    const response = await api.get(`/certificates/verify/${encodeURIComponent(code)}`);
    return response.data;
  },

  getAll: async () => {
    try {
      const response = await api.get('/certificates');
      return response.data;
    } catch (error) {
      console.error('Get certificates error:', getErrorMessage(error));
      return { success: true, data: { certificates: [] } };
    }
  },

  getByTraining: async (trainingId) => {
    try {
      const response = await api.get(`/certificates/training/${trainingId}`);
      return response.data;
    } catch (error) {
      console.error('Get training certificates error:', getErrorMessage(error));
      return { success: true, data: { certificates: [] } };
    }
  },

  issue: async (trainingId, traineeId) => {
    try {
      const response = await api.post(`/certificates/training/${trainingId}`, { trainee_id: traineeId });
      return response.data;
    } catch (error) {
      console.error('Issue certificate error:', getErrorMessage(error));
      throw error;
    }
  },

  getDownloadUrl: (certificateId) => {
    return `${API_URL}/certificates/${certificateId}/download`;
  },

  // Fetch the certificate HTML with the auth token (window.open / plain links
  // cannot send the Authorization header, so we download it as a blob).
  download: async (certificateId) => {
    try {
      const response = await api.get(`/certificates/${certificateId}/download`, { responseType: 'blob' });
      return response.data;
    } catch (error) {
      console.error('Download certificate error:', getErrorMessage(error));
      throw error;
    }
  },
};

// Trigger a browser download for a blob fetched with the auth token.
export const triggerDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// ============================================
// LEARNING MANAGEMENT SERVICES
// ============================================
const LESSONS_BASE_URL = API_ORIGIN;

export const learningService = {
  // Trainee: full course + progress for the learning page
  getCourse: async (trainingId) => {
    try {
      const response = await api.get(`/learning/trainings/${trainingId}`);
      return response.data;
    } catch (error) {
      console.error('Get learning course error:', getErrorMessage(error));
      throw error;
    }
  },

  getLesson: async (lessonId) => {
    try {
      const response = await api.get(`/learning/lessons/${lessonId}`);
      return response.data;
    } catch (error) {
      console.error('Get lesson error:', getErrorMessage(error));
      throw error;
    }
  },

  completeLesson: async (lessonId) => {
    try {
      const response = await api.post(`/learning/lessons/${lessonId}/complete`);
      return response.data;
    } catch (error) {
      console.error('Complete lesson error:', getErrorMessage(error));
      throw error;
    }
  },

  saveVideoPosition: async (lessonId, position) => {
    try {
      const response = await api.put(`/learning/lessons/${lessonId}/video-position`, { position });
      return response.data;
    } catch (error) {
      console.error('Save video position error:', getErrorMessage(error));
      throw error;
    }
  },

  // Confirms a video whose provider cannot report playback progress. The server
  // records who/when and refuses this for any video it CAN measure.
  attestVideoWatched: async (lessonId) => {
    try {
      const response = await api.post(`/learning/lessons/${lessonId}/video-attestation`);
      return response.data;
    } catch (error) {
      console.error('Attest video error:', getErrorMessage(error));
      throw error;
    }
  },

  // Trainer / admin content management
  getCourseTree: async (trainingId) => {
    try {
      const response = await api.get(`/learning/trainings/${trainingId}/tree`);
      return response.data;
    } catch (error) {
      console.error('Get course tree error:', getErrorMessage(error));
      throw error;
    }
  },

  createModule: async (trainingId, data) => {
    const response = await api.post(`/learning/trainings/${trainingId}/modules`, data);
    return response.data;
  },

  updateModule: async (moduleId, data) => {
    const response = await api.put(`/learning/modules/${moduleId}`, data);
    return response.data;
  },

  deleteModule: async (moduleId) => {
    const response = await api.delete(`/learning/modules/${moduleId}`);
    return response.data;
  },

  reorderModules: async (trainingId, orderedIds) => {
    const response = await api.put(`/learning/trainings/${trainingId}/modules/reorder`, { orderedIds });
    return response.data;
  },

  createLesson: async (trainingId, data) => {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        formData.append(key, data[key]);
      }
    });
    const response = await api.post(`/learning/trainings/${trainingId}/lessons`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  updateLesson: async (lessonId, data) => {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        formData.append(key, data[key]);
      }
    });
    const response = await api.put(`/learning/lessons/${lessonId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deleteLesson: async (lessonId) => {
    const response = await api.delete(`/learning/lessons/${lessonId}`);
    return response.data;
  },

  reorderLessons: async (trainingId, orderedIds) => {
    const response = await api.put(`/learning/trainings/${trainingId}/lessons/reorder`, { orderedIds });
    return response.data;
  },

  getLessonFileUrl: (filePath) => {
    if (!filePath) return null;
    if (filePath.startsWith('http')) return filePath;
    return `${LESSONS_BASE_URL}/uploads/lessons/${filePath}`;
  },
};

// ============================================
// AI TRAINING ASSISTANT SERVICES
// ============================================
export const assistantService = {
  // Trainee: ask the AI Training Assistant about a training / current lesson.
  // The backend keeps authentication/enrollment and never reveals assessment answers.
  chat: async (trainingId, lessonId, message) => {
    try {
      const response = await api.post('/assistant/chat', { trainingId, lessonId, message });
      return response.data;
    } catch (error) {
      console.error('AI Assistant chat error:', getErrorMessage(error));
      throw error;
    }
  },
};

// ============================================
// SYSTEM SETTINGS SERVICES
//
// Feature switches owned by the admin. The backend is the authority: it
// re-checks every flag on each guarded request, so hiding a control in the UI
// is only a convenience, never the enforcement.
// ============================================
export const settingsService = {
  get: async () => {
    const response = await api.get('/settings');
    return response.data;
  },

  update: async (settings) => {
    const response = await api.put('/settings', { settings });
    return response.data;
  },
};

// ============================================
// TRAINER AI ASSISTANT SERVICES
// ============================================
export const trainerAssistantService = {
  status: async () => {
    const response = await api.get('/assistant/trainer/status');
    return response.data;
  },

  generate: async (trainingId, topic, contentType = 'lesson', questionCount) => {
    const response = await api.post('/assistant/trainer/generate', {
      trainingId,
      topic,
      contentType,
      questionCount
    });
    return response.data;
  },
};

// ============================================
// ASSESSMENT SERVICES
// ============================================
export const assessmentService = {
  getStatus: async (trainingId) => {
    try {
      const response = await api.get(`/assessment/trainings/${trainingId}/status`);
      return response.data;
    } catch (error) {
      console.error('Get assessment status error:', getErrorMessage(error));
      throw error;
    }
  },

  start: async (trainingId) => {
    const response = await api.post(`/assessment/trainings/${trainingId}/start`);
    return response.data;
  },

  submit: async (attemptId, answers) => {
    const response = await api.post(`/assessment/attempts/${attemptId}/submit`, { answers });
    return response.data;
  },

  // Trainer / admin management
  manage: async (trainingId) => {
    const response = await api.get(`/assessment/trainings/${trainingId}/manage`);
    return response.data;
  },

  upsert: async (trainingId, data) => {
    const response = await api.post(`/assessment/trainings/${trainingId}`, data);
    return response.data;
  },

  remove: async (assessmentId) => {
    const response = await api.delete(`/assessment/${assessmentId}`);
    return response.data;
  },

  addQuestion: async (assessmentId, data) => {
    const response = await api.post(`/assessment/${assessmentId}/questions`, data);
    return response.data;
  },

  updateQuestion: async (questionId, data) => {
    const response = await api.put(`/assessment/questions/${questionId}`, data);
    return response.data;
  },

  deleteQuestion: async (questionId) => {
    const response = await api.delete(`/assessment/questions/${questionId}`);
    return response.data;
  },

  reorderQuestions: async (assessmentId, orderedIds) => {
    const response = await api.put(`/assessment/${assessmentId}/questions/reorder`, { orderedIds });
    return response.data;
  },
};

// ============================================
// REPORT SERVICES
// ============================================
export const reportService = {
  getOverview: async () => {
    try {
      const response = await api.get('/reports/overview');
      return response.data.data;
    } catch (error) {
      console.error('Get reports error:', getErrorMessage(error));
      return { summary: {}, attendance: {}, byDepartment: [], byTraining: [], byType: [], pendingByDepartment: [] };
    }
  },
};

// ============================================
// USER SERVICES
// ============================================
export const userService = {
  getAll: async () => {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      console.error('Get all users error:', getErrorMessage(error));
      return { success: true, users: [] };
    }
  },

  getById: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get user by ID error:', getErrorMessage(error));
      throw error;
    }
  },

  update: async (userId, userData) => {
    try {
      const response = await api.put(`/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error('Update user error:', getErrorMessage(error));
      throw error;
    }
  },

  updateStatus: async (userId, isActive) => {
    try {
      const response = await api.put(`/users/${userId}/status`, { is_active: isActive });
      return response.data;
} catch (error) {
      console.error('Update settings error:', getErrorMessage(error));
      throw error;
    }
  },

  updateDepartment: async (userId, departmentId) => {
    try {
      const response = await api.put(`/users/${userId}/department`, { department_id: departmentId });
      return response.data;
} catch (error) {
      console.error('Update user status error:', getErrorMessage(error));
      throw error;
    }
  },

  delete: async (userId) => {
    try {
      const response = await api.delete(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Delete user error:', getErrorMessage(error));
      throw error;
    }
  },
};

// ============================================
// SUBJECT SERVICES
// ============================================
export const subjectService = {
  getAll: async () => {
    try {
      const response = await api.get('/subjects/all');
      return response.data;
    } catch (error) {
      console.error('Get subjects error:', getErrorMessage(error));
      return { success: true, data: { subjects: [] } };
    }
  },

  create: async (data) => {
    try {
      const response = await api.post('/subjects', data);
      return response.data;
    } catch (error) {
      console.error('Create subject error:', getErrorMessage(error));
      throw error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.put(`/subjects/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update subject error:', getErrorMessage(error));
      throw error;
    }
  },

  toggleActive: async (id, isActive) => {
    try {
      const response = await api.put(`/subjects/${id}/toggle`, { is_active: isActive });
      return response.data;
    } catch (error) {
      console.error('Toggle subject error:', getErrorMessage(error));
      throw error;
    }
  },
};

// ============================================
// DEPARTMENT SERVICES
// ============================================
export const departmentService = {
  getAll: async () => {
    try {
      const response = await api.get('/departments/all');
      return response.data;
    } catch (error) {
      console.error('Get departments error:', getErrorMessage(error));
      return { success: true, data: { departments: [] } };
    }
  },

  create: async (data) => {
    try {
      const response = await api.post('/departments', data);
      return response.data;
    } catch (error) {
      console.error('Create department error:', getErrorMessage(error));
      throw error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.put(`/departments/${id}`, data);
      return response.data;
} catch (error) {
      console.error('Update user department error:', getErrorMessage(error));
      throw error;
    }
  },

  toggleActive: async (id, isActive) => {
    try {
      const response = await api.put(`/departments/${id}/toggle`, { is_active: isActive });
      return response.data;
} catch (error) {
      console.error('Update department error:', getErrorMessage(error));
      throw error;
    }
  },
};

// ============================================
// NOTIFICATION SERVICES
// ============================================
export const notificationService = {
  // Bell feed for the signed-in user: { notifications, unread_count }
  getAll: async (limit) => {
    try {
      const response = await api.get(
        `/notifications${limit ? `?limit=${encodeURIComponent(limit)}` : ''}`
      );
      return response.data;
    } catch (error) {
      console.error('Get notifications error:', getErrorMessage(error));
      throw error;
    }
  },

  // Badge count. Falls back to 0 rather than throwing so the bell never
  // surfaces an error state just because a poll failed.
  getUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      return response.data?.data?.unread_count || 0;
    } catch (error) {
      console.error('Get unread count error:', getErrorMessage(error));
      return 0;
    }
  },

  markRead: async (id) => {
    try {
      const response = await api.put(`/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      console.error('Mark notification read error:', getErrorMessage(error));
      throw error;
    }
  },

  markAllRead: async () => {
    try {
      const response = await api.put('/notifications/read-all');
      return response.data;
    } catch (error) {
      console.error('Mark all notifications read error:', getErrorMessage(error));
      throw error;
    }
  },

  clearAll: async () => {
    try {
      const response = await api.delete('/notifications');
      return response.data;
    } catch (error) {
      console.error('Clear notifications error:', getErrorMessage(error));
      throw error;
    }
  },
};

export default api;


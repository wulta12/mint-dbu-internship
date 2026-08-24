import axios from 'axios';

// API base URL
const API_URL = 'http://localhost:5000/api';

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
      console.error('Login error:', error.response?.data || error.message);
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
      console.error('Register error:', error.response?.data || error.message);
      throw error;
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error.response?.data || error.message);
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
      console.error('Update profile error:', error.response?.data || error.message);
      throw error;
    }
  },

  changePassword: async (current_password, new_password) => {
    try {
      const response = await api.put('/auth/password', { current_password, new_password });
      return response.data;
    } catch (error) {
      console.error('Change password error:', error.response?.data || error.message);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
      console.error('Get all trainings error:', error.response?.data || error.message);
      return { success: true, trainings: [] };
    }
  },

  getAvailable: async () => {
    try {
      const response = await api.get('/trainings/available');
      return response.data;
    } catch (error) {
      console.error('Get available trainings error:', error.response?.data || error.message);
      return { success: true, trainings: [] };
    }
  },

  getDepartmentTrainings: async () => {
    try {
      const response = await api.get('/trainings/department/mine');
      return response.data;
    } catch (error) {
      console.error('Get department trainings error:', error.response?.data || error.message);
      throw error;
    }
  },

  getMyTrainings: async () => {
    try {
      const response = await api.get('/trainings/my-trainings');
      return response.data;
    } catch (error) {
      console.error('Get my trainings error:', error.response?.data || error.message);
      return { success: true, data: { trainings: [] } };
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/trainings/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get training by ID error:', error.response?.data || error.message);
      throw error;
    }
  },

  create: async (trainingData) => {
    try {
      const response = await api.post('/trainings', trainingData);
      return response.data;
    } catch (error) {
      console.error('Create training error:', error.response?.data || error.message);
      throw error;
    }
  },

  update: async (id, trainingData) => {
    try {
      const response = await api.put(`/trainings/${id}`, trainingData);
      return response.data;
    } catch (error) {
      console.error('Update training error:', error.response?.data || error.message);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/trainings/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete training error:', error.response?.data || error.message);
      throw error;
    }
  },
};

// ============================================
// TRAINING MATERIAL SERVICES
// ============================================
const MATERIALS_BASE_URL = 'http://localhost:5000';

export const materialService = {
  getByTraining: async (trainingId) => {
    try {
      const response = await api.get(`/trainings/${trainingId}/materials`);
      return response.data;
    } catch (error) {
      console.error('Get materials error:', error.response?.data || error.message);
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
      console.error('Upload material error:', error.response?.data || error.message);
      throw error;
    }
  },

  remove: async (materialId) => {
    try {
      const response = await api.delete(`/materials/${materialId}`);
      return response.data;
    } catch (error) {
      console.error('Delete material error:', error.response?.data || error.message);
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
      console.error('Request enrollment error:', error.response?.data || error.message);
      throw error;
    }
  },

  getMyTrainings: async () => {
    try {
      const response = await api.get('/training-requests/my');
      const requests = response.data?.data?.requests || [];
      const trainings = requests.map((r) => ({
        ...r,
        participation_status: r.status,
        training_id: r.training_id
      }));
      return { success: true, data: { trainings } };
    } catch (error) {
      console.error('Get my trainings error:', error.response?.data || error.message);
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
      console.error('Get pending requests error:', error.response?.data || error.message);
      return { success: true, data: { requests: [] } };
    }
  },

  getByTraining: async (trainingId) => {
    try {
      const response = await api.get(`/training-requests/training/${trainingId}`);
      const requests = response.data?.data?.participants || [];
      const participants = requests.map((r) => ({
        ...r,
        participation_status: r.status,
        registered_at: r.requested_at
      }));
      return { success: true, participants };
    } catch (error) {
      console.error('Get participants by training error:', error.response?.data || error.message);
      return { success: true, participants: [] };
    }
  },

  updateStatus: async (participantId, status) => {
    try {
      const action = status === 'approved' ? 'approve' : 'reject';
      const response = await api.put(`/training-requests/${participantId}/${action}`, { status });
      return response.data;
    } catch (error) {
      console.error('Update participant status error:', error.response?.data || error.message);
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
      console.error('Get attendance error:', error.response?.data || error.message);
      return { success: true, data: { records: [], dates: [], summary: {} } };
    }
  },

  save: async (trainingId, attendanceDate, records) => {
    try {
      const response = await api.post(`/attendance/training/${trainingId}`, { attendance_date: attendanceDate, records });
      return response.data;
    } catch (error) {
      console.error('Save attendance error:', error.response?.data || error.message);
      throw error;
    }
  },

  getSummary: async (trainingId) => {
    try {
      const response = await api.get(`/attendance/training/${trainingId}/summary`);
      return response.data;
    } catch (error) {
      console.error('Get attendance summary error:', error.response?.data || error.message);
      return { success: true, data: { summary: {} } };
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
      console.error('Get my certificates error:', error.response?.data || error.message);
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
      console.error('Get certificates error:', error.response?.data || error.message);
      return { success: true, data: { certificates: [] } };
    }
  },

  getByTraining: async (trainingId) => {
    try {
      const response = await api.get(`/certificates/training/${trainingId}`);
      return response.data;
    } catch (error) {
      console.error('Get training certificates error:', error.response?.data || error.message);
      return { success: true, data: { certificates: [] } };
    }
  },

  issue: async (trainingId, traineeId) => {
    try {
      const response = await api.post(`/certificates/training/${trainingId}`, { trainee_id: traineeId });
      return response.data;
    } catch (error) {
      console.error('Issue certificate error:', error.response?.data || error.message);
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
      console.error('Download certificate error:', error.response?.data || error.message);
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
const LESSONS_BASE_URL = 'http://localhost:5000';

export const learningService = {
  // Trainee: full course + progress for the learning page
  getCourse: async (trainingId) => {
    try {
      const response = await api.get(`/learning/trainings/${trainingId}`);
      return response.data;
    } catch (error) {
      console.error('Get learning course error:', error.response?.data || error.message);
      throw error;
    }
  },

  getLesson: async (lessonId) => {
    try {
      const response = await api.get(`/learning/lessons/${lessonId}`);
      return response.data;
    } catch (error) {
      console.error('Get lesson error:', error.response?.data || error.message);
      throw error;
    }
  },

  completeLesson: async (lessonId) => {
    try {
      const response = await api.post(`/learning/lessons/${lessonId}/complete`);
      return response.data;
    } catch (error) {
      console.error('Complete lesson error:', error.response?.data || error.message);
      throw error;
    }
  },

  saveVideoPosition: async (lessonId, position) => {
    try {
      const response = await api.put(`/learning/lessons/${lessonId}/video-position`, { position });
      return response.data;
    } catch (error) {
      console.error('Save video position error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Trainer / admin content management
  getCourseTree: async (trainingId) => {
    try {
      const response = await api.get(`/learning/trainings/${trainingId}/tree`);
      return response.data;
    } catch (error) {
      console.error('Get course tree error:', error.response?.data || error.message);
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
// ASSESSMENT SERVICES
// ============================================
export const assessmentService = {
  getStatus: async (trainingId) => {
    try {
      const response = await api.get(`/assessment/trainings/${trainingId}/status`);
      return response.data;
    } catch (error) {
      console.error('Get assessment status error:', error.response?.data || error.message);
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
      console.error('Get reports error:', error.response?.data || error.message);
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
      console.error('Get all users error:', error.response?.data || error.message);
      return { success: true, users: [] };
    }
  },

  getById: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get user by ID error:', error.response?.data || error.message);
      throw error;
    }
  },

  update: async (userId, userData) => {
    try {
      const response = await api.put(`/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error('Update user error:', error.response?.data || error.message);
      throw error;
    }
  },

  updateStatus: async (userId, isActive) => {
    try {
      const response = await api.put(`/users/${userId}/status`, { is_active: isActive });
      return response.data;
    } catch (error) {
      console.error('Update user status error:', error.response?.data || error.message);
      throw error;
    }
  },

  updateDepartment: async (userId, departmentId) => {
    try {
      const response = await api.put(`/users/${userId}/department`, { department_id: departmentId });
      return response.data;
    } catch (error) {
      console.error('Update user department error:', error.response?.data || error.message);
      throw error;
    }
  },

  delete: async (userId) => {
    try {
      const response = await api.delete(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Delete user error:', error.response?.data || error.message);
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
      console.error('Get subjects error:', error.response?.data || error.message);
      return { success: true, data: { subjects: [] } };
    }
  },

  create: async (data) => {
    try {
      const response = await api.post('/subjects', data);
      return response.data;
    } catch (error) {
      console.error('Create subject error:', error.response?.data || error.message);
      throw error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.put(`/subjects/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update subject error:', error.response?.data || error.message);
      throw error;
    }
  },

  toggleActive: async (id, isActive) => {
    try {
      const response = await api.put(`/subjects/${id}/toggle`, { is_active: isActive });
      return response.data;
    } catch (error) {
      console.error('Toggle subject error:', error.response?.data || error.message);
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
      console.error('Get departments error:', error.response?.data || error.message);
      return { success: true, data: { departments: [] } };
    }
  },

  create: async (data) => {
    try {
      const response = await api.post('/departments', data);
      return response.data;
    } catch (error) {
      console.error('Create department error:', error.response?.data || error.message);
      throw error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.put(`/departments/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update department error:', error.response?.data || error.message);
      throw error;
    }
  },

  toggleActive: async (id, isActive) => {
    try {
      const response = await api.put(`/departments/${id}/toggle`, { is_active: isActive });
      return response.data;
    } catch (error) {
      console.error('Toggle department error:', error.response?.data || error.message);
      throw error;
    }
  },
};

// ============================================
// DASHBOARD SERVICES
// ============================================
export const dashboardService = {
  getStats: async () => {
    try {
      const response = await api.get('/dashboard/stats');
      return response.data;
    } catch (error) {
      console.error('Get stats error:', error.response?.data || error.message);
      return { success: true, data: { trainers: 0, trainees: 0, trainings: 0, certificates: 0 } };
    }
  },
};

export default api;
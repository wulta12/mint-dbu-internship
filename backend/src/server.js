const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { connectDB } = require('./config/database');
const { notFound, errorHandler } = require('./middleware/error');
const { auth, authorize } = require('./middleware/auth');
const userController = require('./controllers/user.controller');

const authRoutes = require('./routes/auth.routes');
const departmentRoutes = require('./routes/department.routes');
const subjectRoutes = require('./routes/subject.routes');
const trainingRoutes = require('./routes/training.routes');
const trainingRequestRoutes = require('./routes/trainingRequest.routes');
const userRoutes = require('./routes/user.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const certificateRoutes = require('./routes/certificate.routes');
const materialRoutes = require('./routes/material.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const meetingRoutes = require('./routes/meeting.routes');
const reportsRoutes = require('./routes/reports.routes');
const learningRoutes = require('./routes/learning.routes');
const assessmentRoutes = require('./routes/assessment.routes');
const assistantRoutes = require('./routes/assistant.routes');
const contactRoutes = require('./routes/contact.routes');
const internalMessageRoutes = require('./routes/internalMessage.routes');
const settingsRoutes = require('./routes/settings.routes');
const notificationRoutes = require('./routes/notification.routes');

dotenv.config();

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(path.join(uploadsDir, 'profiles'), { recursive: true });
fs.mkdirSync(path.join(uploadsDir, 'materials'), { recursive: true });
fs.mkdirSync(path.join(uploadsDir, 'lessons'), { recursive: true });

// Middleware
//
// Collect allowed origins from ALLOWED_ORIGINS, CORS_ORIGIN, and FRONTEND_URL.
// Strips trailing slashes to prevent subtle CORS mismatches.
const defaultAllowedOrigins = [
  'https://mint-dbu-internship.vercel.app',
  'https://mint-training-frontend.onrender.com',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000'
];

const rawOrigins = [
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []),
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : []),
  ...defaultAllowedOrigins
];
const allowedOrigins = rawOrigins
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// RFC1918 ranges plus loopback: hosts only reachable inside the local network.
const isPrivateHost = (host) =>
  host === 'localhost' ||
  host === '127.0.0.1' ||
  host === '[::1]' ||
  /^10\./.test(host) ||
  /^192\.168\./.test(host) ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(host);

app.use(cors({
  origin: (origin, callback) => {
    // No Origin header means a same-origin, curl or server-to-server call,
    // which CORS does not govern.
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/+$/, '');

    // Allow wildcard or explicit whitelist
    if (allowedOrigins.includes('*') || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    try {
      const { protocol, hostname } = new URL(origin);
      const isWebOrigin = protocol === 'http:' || protocol === 'https:';
      if (!isWebOrigin) return callback(null, false);

      // Automatically allow all Vercel deployments (*.vercel.app) and Render services (*.onrender.com)
      if (hostname.endsWith('.vercel.app') || hostname.endsWith('.onrender.com')) {
        return callback(null, true);
      }

      // Local / LAN development
      if (process.env.NODE_ENV !== 'production' && isPrivateHost(hostname)) {
        return callback(null, true);
      }

      return callback(null, false);
    } catch {
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(uploadsDir));

// Connect to database
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/training-requests', trainingRequestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api', materialRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/meeting', meetingRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/internal-messages', internalMessageRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);

// Admin: list all trainees
app.get('/api/trainees', auth, authorize('admin'), userController.getTrainees);

// Root welcome & API status
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MinT Training System Backend API is running successfully',
    version: '2.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      departments: '/api/departments/all',
      trainings: '/api/trainings',
      stats: '/api/dashboard/stats'
    }
  });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'MinT Training System API Root',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Backend is running', timestamp: new Date().toISOString() });
});

// 404 handler
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;

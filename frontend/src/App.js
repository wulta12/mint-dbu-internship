import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import ProtectedRoute from './components/ProtectedRoute';
import ToastProvider from './components/Toast';
import { ConfirmDialogProvider } from './components/ConfirmDialog';

// Public Pages
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Trainings from './pages/Trainings';
import TrainingDetails from './pages/TrainingDetails';
import Login from './pages/Login';
import Register from './pages/Register';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminTrainings from './pages/admin/Trainings';
import CreateTraining from './pages/admin/CreateTraining';
import AdminTrainingDetails from './pages/admin/TrainingDetails';
import EditTraining from './pages/admin/EditTraining';
import AdminUsers from './pages/admin/Users';
import Trainers from './pages/admin/Trainers';
import AddTrainer from './pages/admin/AddTrainer';
import TrainerDetails from './pages/admin/TrainerDetails';
import EditTrainer from './pages/admin/EditTrainer';
import Attendance from './pages/admin/Attendance';
import Certificates from './pages/admin/Certificates';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';
import EnrollmentRequests from './pages/admin/EnrollmentRequests';
import AdminProfile from './pages/admin/Profile';

// Trainee Pages
import TraineeDashboard from './pages/trainee/Dashboard';
import TraineeTrainings from './pages/trainee/Trainings';
import TraineeTrainingDetails from './pages/trainee/TrainingDetails';
import MyTrainings from './pages/trainee/MyTrainings';
import TraineeCertificates from './pages/trainee/Certificates';
import TraineeProfile from './pages/trainee/Profile';
import Learn from './pages/trainee/Learn';
import Assessment from './pages/trainee/Assessment';

// Trainer Pages
import TrainerDashboard from './pages/trainer/Dashboard';
import TrainerTrainings from './pages/trainer/Trainings';
import TrainerParticipants from './pages/trainer/Participants';
import TrainerAttendance from './pages/trainer/Attendance';
import TrainerCertificates from './pages/trainer/Certificates';
import TrainerProfile from './pages/trainer/Profile';
import TrainerMaterials from './pages/trainer/Materials';
import CourseBuilder from './pages/trainer/CourseBuilder';
import AssessmentBuilder from './pages/trainer/AssessmentBuilder';

function App() {
  return (
    <Router>
      <ToastProvider>
        <ConfirmDialogProvider>
        <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/trainings" element={<Trainings />} />
        <Route path="/trainings/:id" element={<TrainingDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* ADMIN ROUTES */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/trainings" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminTrainings />
          </ProtectedRoute>
        } />
        <Route path="/admin/trainings/create" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <CreateTraining />
          </ProtectedRoute>
        } />
        <Route path="/admin/trainings/:id" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminTrainingDetails />
          </ProtectedRoute>
        } />
        <Route path="/admin/trainings/:id/edit" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <EditTraining />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminUsers />
          </ProtectedRoute>
        } />
        <Route path="/admin/trainees" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminUsers />
          </ProtectedRoute>
        } />
        <Route path="/admin/trainers" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Trainers />
          </ProtectedRoute>
        } />
        <Route path="/admin/enrollments" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <EnrollmentRequests />
          </ProtectedRoute>
        } />
        <Route path="/admin/trainers/add" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AddTrainer />
          </ProtectedRoute>
        } />
        <Route path="/admin/trainers/:id" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <TrainerDetails />
          </ProtectedRoute>
        } />
        <Route path="/admin/trainers/:id/edit" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <EditTrainer />
          </ProtectedRoute>
        } />
        <Route path="/admin/attendance" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Attendance />
          </ProtectedRoute>
        } />
        <Route path="/admin/certificates" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Certificates />
          </ProtectedRoute>
        } />
        <Route path="/admin/reports" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/admin/profile" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminProfile />
          </ProtectedRoute>
        } />
        
        {/* TRAINER ROUTES */}
        <Route path="/trainer" element={
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/trainer/dashboard" element={
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/trainer/trainings" element={
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerTrainings />
          </ProtectedRoute>
        } />
        <Route path="/trainer/participants/:trainingId" element={
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerParticipants />
          </ProtectedRoute>
        } />
        <Route path="/trainer/attendance/:trainingId" element={
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerAttendance />
          </ProtectedRoute>
        } />
        <Route path="/trainer/certificates" element={
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerCertificates />
          </ProtectedRoute>
        } />
        <Route path="/trainer/materials/:trainingId" element={
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerMaterials />
          </ProtectedRoute>
        } />
        <Route path="/trainer/course-builder/:trainingId" element={
          <ProtectedRoute allowedRoles={['trainer']}>
            <CourseBuilder />
          </ProtectedRoute>
        } />
        <Route path="/trainer/assessment-builder/:trainingId" element={
          <ProtectedRoute allowedRoles={['trainer']}>
            <AssessmentBuilder />
          </ProtectedRoute>
        } />
        <Route path="/trainer/profile" element={
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerProfile />
          </ProtectedRoute>
        } />
        
        {/* TRAINEE ROUTES */}
        <Route path="/trainee" element={
          <ProtectedRoute allowedRoles={['trainee']}>
            <TraineeDashboard />
          </ProtectedRoute>
        } />
        <Route path="/trainee/dashboard" element={
          <ProtectedRoute allowedRoles={['trainee']}>
            <TraineeDashboard />
          </ProtectedRoute>
        } />
        <Route path="/trainee/trainings" element={
          <ProtectedRoute allowedRoles={['trainee']}>
            <TraineeTrainings />
          </ProtectedRoute>
        } />
        <Route path="/trainee/trainings/:id" element={
          <ProtectedRoute allowedRoles={['trainee']}>
            <TraineeTrainingDetails />
          </ProtectedRoute>
        } />
        <Route path="/trainee/my-trainings" element={
          <ProtectedRoute allowedRoles={['trainee']}>
            <MyTrainings />
          </ProtectedRoute>
        } />
        <Route path="/trainee/certificates" element={
          <ProtectedRoute allowedRoles={['trainee']}>
            <TraineeCertificates />
          </ProtectedRoute>
        } />
        <Route path="/trainee/profile" element={
          <ProtectedRoute allowedRoles={['trainee']}>
            <TraineeProfile />
          </ProtectedRoute>
        } />
        <Route path="/trainee/learn/:trainingId" element={
          <ProtectedRoute allowedRoles={['trainee']}>
            <Learn />
          </ProtectedRoute>
        } />
        <Route path="/trainee/learn/:trainingId/:lessonId" element={
          <ProtectedRoute allowedRoles={['trainee']}>
            <Learn />
          </ProtectedRoute>
        } />
        <Route path="/trainee/assessment/:trainingId" element={
          <ProtectedRoute allowedRoles={['trainee']}>
            <Assessment />
          </ProtectedRoute>
        } />
        </Routes>
        </ConfirmDialogProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;
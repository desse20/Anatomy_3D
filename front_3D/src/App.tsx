import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './index';
import AnatomyViewer from './components/AnatomyViewer';
import Login from './auth/login';
import ForgotPassword from './auth/ForgotPassword';
import ResetPassword from './auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Quiz from './pages/Quiz';
import Review from './pages/Review';
import Levels from './pages/Levels';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import TechManagement from './pages/TechManagement';
import DatabaseManagement from './pages/DatabaseManagement';
import AccessDenied from './pages/AccessDenied';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ProtectedRoute, GuestRoute, RoleRoute } from './components/AuthGuards';


function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />

          
          {/* Guest only Routes */}
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
          <Route path="/password-reset" element={<GuestRoute><ResetPassword /></GuestRoute>} />
          
          {/* Protected Routes - All authenticated users */}
          <Route path="/dash" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/atlas" element={<RoleRoute allowedRoles={['student']}><AnatomyViewer /></RoleRoute>} />
          <Route path="/quiz" element={<RoleRoute allowedRoles={['student']}><Quiz /></RoleRoute>} />
          <Route path="/review" element={<RoleRoute allowedRoles={['student']}><Review /></RoleRoute>} />
          <Route path="/levels" element={<RoleRoute allowedRoles={['student']}><Levels /></RoleRoute>} />

          {/* Admin only */}
          <Route path="/admin" element={<RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute>} />
          <Route path="/tech" element={<RoleRoute allowedRoles={['admin']}><TechManagement /></RoleRoute>} />
          <Route path="/database" element={<RoleRoute allowedRoles={['admin']}><DatabaseManagement /></RoleRoute>} />

          {/* Teacher + Admin */}
          <Route path="/labs" element={<RoleRoute allowedRoles={['teacher']}><TeacherDashboard /></RoleRoute>} />
          
          <Route path="/forbidden" element={<AccessDenied />} />
        </Routes>
      </Router>
    </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
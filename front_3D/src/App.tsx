import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './index';
import Login from './auth/login';
import ForgotPassword from './auth/ForgotPassword';
import ResetPassword from './auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Quiz from './pages/Quiz';
import Review from './pages/Review';
import Levels from './pages/Levels';
import AdminUsers from './pages/AdminUsers';
import AdminResources from './pages/AdminResources';
import AdminResourceDetail from './pages/AdminResourceDetail';
import TeacherDashboard from './pages/TeacherDashboard';
import MyViews from './pages/MyViews';
import LabViewer from './pages/LabViewer';
import AccessDenied from './pages/AccessDenied';
import AtlasModelSelection from './pages/AtlasModelSelection';
import AnatomyViewerPage from './pages/AnatomyViewerPage';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ProtectedRoute, GuestRoute, RoleRoute } from './components/AuthGuards';
import CookieConsent from './components/CookieConsent';


function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
      <Router>
        <CookieConsent />
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
          <Route path="/atlas" element={<RoleRoute allowedRoles={['student', 'admin', 'teacher']}><AtlasModelSelection /></RoleRoute>} />
          <Route path="/atlas/viewer" element={<RoleRoute allowedRoles={['student', 'admin', 'teacher']}><AnatomyViewerPage /></RoleRoute>} />
          <Route path="/quiz" element={<RoleRoute allowedRoles={['student']}><Quiz /></RoleRoute>} />
          <Route path="/chat" element={<RoleRoute allowedRoles={['student']}><Review /></RoleRoute>} />
          <Route path="/chat/:id" element={<RoleRoute allowedRoles={['student']}><Review /></RoleRoute>} />
          <Route path="/review" element={<Navigate to="/chat" replace />} />
          <Route path="/levels" element={<RoleRoute allowedRoles={['student']}><Levels /></RoleRoute>} />

          {/* Admin only */}
          <Route path="/utilisateurs" element={<RoleRoute allowedRoles={['admin']}><AdminUsers /></RoleRoute>} />
          <Route path="/reviews" element={<RoleRoute allowedRoles={['admin']}><Dashboard /></RoleRoute>} />
          <Route path="/cache-ia" element={<RoleRoute allowedRoles={['admin']}><Dashboard /></RoleRoute>} />
          <Route path="/analytics" element={<RoleRoute allowedRoles={['admin']}><Dashboard /></RoleRoute>} />
          <Route path="/analytics-objects" element={<RoleRoute allowedRoles={['admin']}><Dashboard /></RoleRoute>} />
          <Route path="/analytics/user/:id" element={<RoleRoute allowedRoles={['admin']}><Dashboard /></RoleRoute>} />
          <Route path="/model" element={<RoleRoute allowedRoles={['admin']}><AdminResources /></RoleRoute>} />
          <Route path="/model/:id" element={<RoleRoute allowedRoles={['admin']}><AdminResourceDetail /></RoleRoute>} />

          {/* Teacher + Admin + Student (Mes Salles rejointes / créées) */}
          <Route path="/labs" element={<RoleRoute allowedRoles={['student', 'teacher', 'admin']}><TeacherDashboard /></RoleRoute>} />
          <Route path="/my-views" element={<RoleRoute allowedRoles={['teacher', 'admin']}><MyViews /></RoleRoute>} />
          
          {/* Joining Lab (Student + Teacher + Admin) */}
          <Route path="/salle/:id" element={<RoleRoute allowedRoles={['student', 'teacher', 'admin']}><LabViewer /></RoleRoute>} />
          
          <Route path="/forbidden" element={<AccessDenied />} />
        </Routes>
      </Router>
    </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
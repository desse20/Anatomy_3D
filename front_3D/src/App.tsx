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
import Test from './pages/Test';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ProtectedRoute, GuestRoute } from './components/AuthGuards';


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
          
          {/* Protected Routes */}
          <Route path="/dash" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/atlas" element={<ProtectedRoute><AnatomyViewer /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
          <Route path="/review" element={<ProtectedRoute><Review /></ProtectedRoute>} />
          <Route path="/test" element={<ProtectedRoute><Test /></ProtectedRoute>} />
          <Route path="/levels" element={<ProtectedRoute><Levels /></ProtectedRoute>} />
        </Routes>
      </Router>
    </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
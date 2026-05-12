import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './index'; // La nouvelle page vitrine
import AnatomyViewer from './components/AnatomyViewer';
import Login from './auth/login';
import Register from './auth/register';

function App() {
  return (
    <Router>
      <Routes>
        {/* Page Vitrine principale */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* L'application 3D (protégée ou non selon ton choix) */}
        <Route path="/atlas" element={<AnatomyViewer />} />
      </Routes>
    </Router>
  );
}

export default App;
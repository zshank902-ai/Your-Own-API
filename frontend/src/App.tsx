import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import VisionPlayground from './pages/VisionPlayground';
import RAGPlayground from './pages/RAGPlayground';
import ImagePlayground from './pages/ImagePlayground';
import AudioPlayground from './pages/AudioPlayground';
import AgentPlayground from './pages/AgentPlayground';
import PlaceholderPlayground from './pages/PlaceholderPlayground';

function App() {
  return (
    <Router>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#1E1E2E',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)'
        }
      }} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Dashboard Shell with authenticated layouts */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="vision" element={<VisionPlayground />} />
          <Route path="rag" element={<RAGPlayground />} />
          
          {/* Active Feature Playgrounds */}
          <Route path="chat" element={<PlaceholderPlayground />} />
          <Route path="images" element={<ImagePlayground />} />
          <Route path="audio" element={<AudioPlayground />} />
          <Route path="agents" element={<AgentPlayground />} />
        </Route>

        {/* Catch-all fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;


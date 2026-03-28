import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login        from './pages/Login';
import SessionList  from './pages/SessionList';
import SessionDetail from './pages/SessionDetail';

function isAuthenticated() {
  return !!localStorage.getItem('rk_token');
}

function Protected({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><SessionList /></Protected>} />
        <Route path="/sessions/:id" element={<Protected><SessionDetail /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

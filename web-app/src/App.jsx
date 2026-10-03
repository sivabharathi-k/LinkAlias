import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AliasesPage from './pages/AliasesPage';
import WebsitesPage from './pages/WebsitesPage';
import ProfilePage from './pages/ProfilePage';
import { api, getToken } from './api/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          const userProfile = await api.getMe();
          setUser(userProfile);
        } catch (err) {
          console.warn('Initial auth check failed:', err.message);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  if (loading) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card" style={{ textAlign: 'center', color: '#ffffff' }}>
          <h2>🔗 LinkAlias</h2>
          <p style={{ marginTop: 10 }}>Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<LoginPage setUser={setUser} />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Control Panel Routes */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/*"
            element={
              <div className="app-container">
                <Sidebar user={user} />
                <main className="main-content">
                  <Routes>
                    <Route path="/" element={<DashboardPage user={user} />} />
                    <Route path="/aliases" element={<AliasesPage />} />
                    <Route path="/websites" element={<WebsitesPage />} />
                    <Route path="/profile" element={<ProfilePage user={user} />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

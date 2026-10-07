import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import './App.css';

// Pages
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';
import SupportTicketsPage from './pages/SupportTicketsPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import LoadingSpinner from './components/LoadingSpinner';

// Layout Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  // Check initial auth state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          localStorage.setItem('token', session.access_token);
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (initialLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Router>
      <AuthProvider>
        <ChatProvider>
          <div className="app-container">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<LoginPage />} />
              
              {/* Protected Routes */}
              <Route path="/*" element={<ProtectedLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />} />
            </Routes>
          </div>
        </ChatProvider>
      </AuthProvider>
    </Router>
  );
}

// Protected Layout Component
function ProtectedLayout({ sidebarOpen, setSidebarOpen }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner fullScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <div className="app-layout">
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)} 
      />
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <div className="content-wrapper">
          <Routes>
            {/* Chat routes */}
            <Route path="/chat/new" element={<ChatPage />} />
            <Route path="/chat/:sessionId" element={<ChatPage />} />
            <Route path="/chat" element={<Navigate to="/chat/new" replace />} />
            
            {/* Other routes */}
            <Route index element={<ChatPage />} />
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tickets" element={<SupportTicketsPage />} />
            <Route path="/profile" element={<DashboardPage />} />
            <Route path="/settings" element={<DashboardPage />} />
            
            {/* Admin route */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            } />
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

// Admin Route Component
function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

export default App;
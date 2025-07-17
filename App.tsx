
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import GroupPage from './pages/GroupPage';
import Spinner from './components/common/Spinner';
import Layout from './components/layout/Layout';

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-dark-bg">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Enforce @google.com domain
  if (!user.email?.endsWith('@google.com')) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-dark-bg text-red-500">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p>This application is restricted to @google.com users only.</p>
        <p>Please sign in with a valid Google corporate account.</p>
      </div>
    );
  }

  return <>{children}</>;
};


const App: React.FC = () => {
  useEffect(() => {
    // Set dark mode by default
    document.documentElement.classList.add('dark');
  }, []);
  
  const { user, loading } = useAuth();
  
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route 
          path="/" 
          element={
            <AuthGuard>
              <Layout>
                <DashboardPage />
              </Layout>
            </AuthGuard>
          } 
        />
        <Route 
          path="/group/:groupId" 
          element={
            <AuthGuard>
              <Layout>
                <GroupPage />
              </Layout>
            </AuthGuard>
          } 
        />
        <Route path="*" element={<Navigate to={user && !loading ? "/" : "/login"} />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
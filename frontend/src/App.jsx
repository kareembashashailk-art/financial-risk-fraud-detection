import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/layout/Layout';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { TransactionsList } from './pages/TransactionsList';
import { TransactionDetail } from './pages/TransactionDetail';
import { AlertsList } from './pages/AlertsList';
import { AlertDetail } from './pages/AlertDetail';
import { RulesManagement } from './pages/RulesManagement';
import { CsvImport } from './pages/CsvImport';
import { UserManagement } from './pages/UserManagement';
import { AuditLogs } from './pages/AuditLogs';
import { NotFound } from './pages/NotFound';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner text="Checking authentication session..." />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Super Admin Only Route Wrapper
const SuperAdminRoute = ({ children }) => {
  const { isSuperAdmin, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner text="Verifying permissions..." />;
  }

  return isSuperAdmin ? children : <Navigate to="/" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="transactions" element={<TransactionsList />} />
              <Route path="transactions/:id" element={<TransactionDetail />} />
              <Route path="alerts" element={<AlertsList />} />
              <Route path="alerts/:id" element={<AlertDetail />} />
              <Route path="rules" element={<RulesManagement />} />
              <Route path="import" element={<CsvImport />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route
                path="users"
                element={
                  <SuperAdminRoute>
                    <UserManagement />
                  </SuperAdminRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  </BrowserRouter>
  );
}

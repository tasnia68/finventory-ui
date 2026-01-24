import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AcceptInvitation from './pages/AcceptInvitation';
import Users from './pages/Users';
import UserDetails from './pages/Users/UserDetails';
import Profile from './pages/Profile';
import Roles from './pages/Roles';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  return <MainLayout>{children}</MainLayout>;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />

          {/* Protected Routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/users" element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          } />

          <Route path="/users/:id" element={
            <ProtectedRoute>
              <UserDetails />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/roles" element={
            <ProtectedRoute>
              <Roles />
            </ProtectedRoute>
          } />

          {/* Placeholder for other routes */}
          <Route path="/inventory" element={
            <ProtectedRoute>
              <div className="p-8"><h1 className="text-2xl font-bold dark:text-white">Inventory Page</h1></div>
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute>
              <div className="p-8"><h1 className="text-2xl font-bold dark:text-white">Orders Page</h1></div>
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute>
              <div className="p-8"><h1 className="text-2xl font-bold dark:text-white">Analytics Page</h1></div>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <div className="p-8"><h1 className="text-2xl font-bold dark:text-white">Settings Page</h1></div>
            </ProtectedRoute>
          } />

          {/* New Module Placeholders */}
          {['/products', '/categories', '/attributes', '/templates', '/warehouses', '/transactions', '/batches', '/serials', '/reservations', '/replenishment', '/cycle-counts', '/valuation', '/suppliers', '/purchase-orders', '/pos'].map(path => (
            <Route key={path} path={path} element={
              <ProtectedRoute>
                <div className="p-8">
                  <h1 className="text-2xl font-bold dark:text-white capitalize">{path.replace('/', '').replace('-', ' ')}</h1>
                  <p className="mt-2 text-slate-500">Module coming soon...</p>
                </div>
              </ProtectedRoute>
            } />
          ))}

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

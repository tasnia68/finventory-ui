import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar, { SidebarContext } from './Sidebar';
import Header from './Header';
import AppLoadingScreen from '../common/AppLoadingScreen';
import { useAuth } from '../../contexts/AuthContext';

const MainLayout = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { state: { from: location } });
    }
  }, [isAuthenticated, loading, navigate, location]);

  if (loading) {
    return (
      <AppLoadingScreen
        message="Initializing session..."
        caption="Verifying access, loading tenant settings, and assembling your inventory workspace."
      />
    );
  }

  if (!isAuthenticated) return null;

  return (
    <SidebarContext.Provider value={{ isOpen: sidebarOpen, toggle: toggleSidebar, close: closeSidebar }}>
      <div className="flex h-screen w-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col h-full overflow-hidden w-full">
          <Header />
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  );
};

export default MainLayout;

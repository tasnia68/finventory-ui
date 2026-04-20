import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar, { SidebarContext } from './Sidebar';
import Header from './Header';
import AppLoadingScreen from '../common/AppLoadingScreen';
import { useAuth } from '../../contexts/AuthContext';

const DESKTOP_BREAKPOINT_QUERY = '(min-width: 1024px)';

const MainLayout = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(() => (
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_BREAKPOINT_QUERY).matches : true
  ));
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(DESKTOP_BREAKPOINT_QUERY);
    const handleChange = (event) => {
      setIsDesktop(event.matches);
      if (event.matches) {
        setMobileSidebarOpen(false);
      }
    };

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isDesktop) {
      setDesktopSidebarCollapsed((prev) => !prev);
      return;
    }

    setMobileSidebarOpen((prev) => !prev);
  }, [isDesktop]);

  const closeSidebar = useCallback(() => setMobileSidebarOpen(false), []);

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
    <SidebarContext.Provider
      value={{
        isDesktop,
        isOpen: mobileSidebarOpen,
        isCollapsed: desktopSidebarCollapsed,
        toggle: toggleSidebar,
        close: closeSidebar,
      }}
    >
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

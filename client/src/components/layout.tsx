import { useState, useEffect } from "react";
import { Footer } from "@/components/footer";
import { MiniFooter } from "@/components/mini-footer";
import { LeftMenuDrawer } from "@/components/left-menu-drawer";
import { useLocation } from "wouter";
import { TopNavAdMessage } from "@/features/top-nav-bar-ad-message";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: React.ReactNode;
}

// Standard layout with full footer for marketing pages
export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        {children}
      </div>
      <Footer />
    </div>
  );
}

// App layout with mini footer for app pages (except /app, /outreach, /streak)
export function AppLayout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const [savedSearchesDrawerOpen, setSavedSearchesDrawerOpen] = useState(false);
  
  // Get auth state to show full footer for unauthenticated users on landing
  const { user } = useAuth();
  
  // Hide MiniFooter on these specific pages
  const hideFooterOnPaths = ['/', '/app', '/streak', '/direct'];
  const shouldHideFooter = hideFooterOnPaths.includes(location);
  
  // Show full footer for unauthenticated users on landing page only
  // Also show on /direct for preview purposes (regardless of auth)
  const isDirectPreview = location === '/direct';
  const shouldShowFullFooter = isDirectPreview || (!user && location === '/');
  
  // Listen for drawer open events
  useEffect(() => {
    const handleOpenDrawer = () => {
      setSavedSearchesDrawerOpen(true);
    };

    window.addEventListener('openSavedSearchesDrawer', handleOpenDrawer);
    
    return () => {
      window.removeEventListener('openSavedSearchesDrawer', handleOpenDrawer);
    };
  }, []);
  
  // Handle load search action - navigate to /app if needed
  const handleLoadSearch = (list: any) => {
    if (location !== '/app') {
      // Navigate to /app first, then trigger the load
      setLocation('/app');
      // Dispatch event for the home page to handle
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('loadSavedSearch', { detail: list }));
      }, 100);
    } else {
      // Already on /app, dispatch event for home page to handle
      window.dispatchEvent(new CustomEvent('loadSavedSearch', { detail: list }));
    }
    setSavedSearchesDrawerOpen(false);
  };
  
  // Handle new search action - navigate to /app/new-search
  const handleNewSearch = () => {
    // Navigate to /app/new-search - the route handles the new search state
    setLocation('/app/new-search');
    setSavedSearchesDrawerOpen(false);
  };
  
  // Handle open compose action - dispatch event for the app page to open email drawer
  const handleOpenCompose = () => {
    if (location !== '/app') {
      // Navigate to /app first
      setLocation('/app');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openEmailCompose'));
      }, 100);
    } else {
      window.dispatchEvent(new CustomEvent('openEmailCompose'));
    }
    setSavedSearchesDrawerOpen(false);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <TopNavAdMessage />
      <div className="flex-1">
        {children}
      </div>
      {shouldShowFullFooter ? <Footer /> : (!shouldHideFooter && <MiniFooter />)}
      
      {/* Global LeftMenuDrawer - available on all app pages */}
      <LeftMenuDrawer 
        open={savedSearchesDrawerOpen}
        onOpenChange={setSavedSearchesDrawerOpen}
        onLoadSearch={handleLoadSearch}
        onNewSearch={handleNewSearch}
        onOpenCompose={handleOpenCompose}
      />
    </div>
  );
}

export function AuthLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        {children}
      </div>
      <Footer />
    </div>
  );
}
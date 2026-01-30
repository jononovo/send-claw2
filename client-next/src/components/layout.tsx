'use client';

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Footer } from "@/components/footer";
import { MiniFooter } from "@/components/mini-footer";
import { LeftMenuDrawer } from "@/components/left-menu-drawer";
import { TopNavAdMessage } from "@/features/top-nav-bar-ad-message";

interface LayoutProps {
  children: React.ReactNode;
}

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

export function AppLayout({ children }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [savedSearchesDrawerOpen, setSavedSearchesDrawerOpen] = useState(false);
  
  const hideFooterOnPaths = ['/app', '/streak'];
  const shouldHideFooter = hideFooterOnPaths.includes(pathname);
  
  useEffect(() => {
    const handleOpenDrawer = () => {
      setSavedSearchesDrawerOpen(true);
    };

    window.addEventListener('openSavedSearchesDrawer', handleOpenDrawer);
    
    return () => {
      window.removeEventListener('openSavedSearchesDrawer', handleOpenDrawer);
    };
  }, []);
  
  const handleLoadSearch = (list: any) => {
    if (pathname !== '/app') {
      router.push('/app');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('loadSavedSearch', { detail: list }));
      }, 100);
    } else {
      window.dispatchEvent(new CustomEvent('loadSavedSearch', { detail: list }));
    }
    setSavedSearchesDrawerOpen(false);
  };
  
  const handleNewSearch = () => {
    router.push('/app/new-search');
    setSavedSearchesDrawerOpen(false);
  };
  
  const handleOpenCompose = () => {
    if (pathname !== '/app') {
      router.push('/app');
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
      {!shouldHideFooter && <MiniFooter />}
      
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

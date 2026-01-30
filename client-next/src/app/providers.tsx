'use client';

import { ReactNode, useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/use-auth";
import { RegistrationModalProvider } from "@/hooks/use-registration-modal";
import { RegistrationModalContainer } from "@/components/registration-modal-container";
import { StrategyOverlayProvider } from "@/features/strategy-chat";
import { TopNavAdProvider, PasswordSetupModal } from "@/features/top-nav-bar-ad-message";
import { InsufficientCreditsProvider } from "@/contexts/insufficient-credits-context";
import { InsufficientCreditsModal } from "@/components/insufficient-credits-modal";
import { InsufficientCreditsHandlerSetup } from "@/components/insufficient-credits-handler-setup";
import { Toaster } from "@/components/ui/toaster";
import { usePathname } from "next/navigation";

const GUIDANCE_ENABLED_ROUTES = ["/app", "/app/new-search", "/search", "/quests", "/contacts", "/campaigns", "/replies", "/account", "/strategy", "/companies", "/admin"];

function isGuidanceRoute(path: string): boolean {
  return GUIDANCE_ENABLED_ROUTES.some(route => path === route || path.startsWith(route + "/"));
}

function DeferredGuidance() {
  const [GuidanceProvider, setGuidanceProvider] = useState<React.ComponentType<{ children: ReactNode; autoStartForNewUsers?: boolean }> | null>(null);
  const pathname = usePathname();
  
  useEffect(() => {
    if (!isGuidanceRoute(pathname)) return;
    if (GuidanceProvider) return;
    
    const load = () => {
      import("@/features/guidance-engine").then(module => {
        setGuidanceProvider(() => module.GuidanceProvider);
      }).catch(err => {
        console.error("Failed to load guidance engine:", err);
      });
    };
    
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(load, { timeout: 5000 });
      return () => (window as any).cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(load, 3000);
      return () => clearTimeout(timer);
    }
  }, [pathname, GuidanceProvider]);
  
  if (!GuidanceProvider) return null;
  
  return (
    <GuidanceProvider autoStartForNewUsers={true}>
      <></>
    </GuidanceProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <InsufficientCreditsProvider>
          <AuthProvider>
            <RegistrationModalProvider>
              <StrategyOverlayProvider>
                <TopNavAdProvider>
                  {children}
                  <DeferredGuidance />
                  <RegistrationModalContainer />
                  <PasswordSetupModal />
                </TopNavAdProvider>
              </StrategyOverlayProvider>
              <Toaster />
            </RegistrationModalProvider>
            <InsufficientCreditsModal />
            <InsufficientCreditsHandlerSetup />
          </AuthProvider>
        </InsufficientCreditsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

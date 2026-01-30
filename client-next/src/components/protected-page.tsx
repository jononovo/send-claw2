'use client';

import { useAuth } from "@/hooks/use-auth";
import { useRegistrationModal } from "@/hooks/use-registration-modal";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { openForProtectedRoute } = useRegistrationModal();

  useEffect(() => {
    if (!isLoading && !user) {
      openForProtectedRoute();
    }
  }, [user, isLoading, openForProtectedRoute]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

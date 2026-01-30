'use client';

import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function SemiProtectedPage({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return <>{children}</>;
}

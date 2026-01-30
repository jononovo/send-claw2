import { useEffect } from "react";
'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function Outreach() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    
    if (user) {
      router.push("/app");
    } else {
      router.push("/auth");
    }
  }, [user, isLoading, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}

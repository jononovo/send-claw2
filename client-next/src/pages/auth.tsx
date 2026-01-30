import { useEffect } from "react";
'use client';

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useRegistrationModal } from "@/hooks/use-registration-modal";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { openModal } = useRegistrationModal();

  useEffect(() => {
    if (user) {
      setLocation("/app");
    } else {
      openModal();
    }
  }, [user, setLocation, openModal]);

  if (user) {
    return null;
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)'
      }}
    />
  );
}

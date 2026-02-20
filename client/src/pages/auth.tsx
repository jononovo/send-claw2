import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useRegistrationModal } from "@/hooks/use-registration-modal";
import { useTenant } from "@/lib/tenant-context";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { openModal } = useRegistrationModal();
  const { tenant } = useTenant();

  useEffect(() => {
    if (user) {
      setLocation(tenant.routes.authLanding || "/app");
    } else {
      openModal();
    }
  }, [user, setLocation, openModal, tenant.routes.authLanding]);

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

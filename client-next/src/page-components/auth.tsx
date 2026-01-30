'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useRegistrationModal } from "@/hooks/use-registration-modal";

export default function AuthPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { openModal } = useRegistrationModal();

  useEffect(() => {
    if (user) {
      router.push("/app");
    } else {
      openModal();
    }
  }, [user, router, openModal]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p>Redirecting...</p>
      </div>
    </div>
  );
}

'use client';

import dynamic from 'next/dynamic';

const AuthComplete = dynamic(() => import("@/pages/auth-complete"), { ssr: false });

export default function AuthCompletePage() {
  return <AuthComplete />;
}

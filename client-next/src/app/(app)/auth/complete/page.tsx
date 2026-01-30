'use client';

import dynamic from 'next/dynamic';

const AuthComplete = dynamic(() => import("@/page-components/auth-complete"), { ssr: false });

export default function AuthCompletePage() {
  return <AuthComplete />;
}

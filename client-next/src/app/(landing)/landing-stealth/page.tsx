'use client';

import dynamic from 'next/dynamic';

const LandingStealth = dynamic(() => import("@/features/landing-stealth"), { ssr: false });

export default function LandingStealthPage() {
  return <LandingStealth />;
}

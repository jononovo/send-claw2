'use client';

import dynamic from 'next/dynamic';

const LandingSimple = dynamic(() => import("@/pages/landing-simple"), { ssr: false });

export default function SimplePage() {
  return <LandingSimple />;
}

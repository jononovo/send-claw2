'use client';

import dynamic from 'next/dynamic';

const LandingSimple2 = dynamic(() => import("@/pages/landing-simple2"), { ssr: false });

export default function LandingSimple2Page() {
  return <LandingSimple2 />;
}

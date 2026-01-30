'use client';

import dynamic from 'next/dynamic';

const LandingSimple2 = dynamic(() => import("@/page-components/landing-simple2"), { ssr: false });

export default function LandingSimple2Page() {
  return <LandingSimple2 />;
}

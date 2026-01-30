'use client';

import dynamic from 'next/dynamic';

const LandingSimple3 = dynamic(() => import("@/page-components/landing-simple3"), { ssr: false });

export default function LandingSimple3Page() {
  return <LandingSimple3 />;
}

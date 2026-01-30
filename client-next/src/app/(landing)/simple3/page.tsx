'use client';

import dynamic from 'next/dynamic';

const LandingSimple3 = dynamic(() => import("@/page-components/landing-simple3"), { ssr: false });

export default function Simple3Page() {
  return <LandingSimple3 />;
}

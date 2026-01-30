'use client';

import dynamic from 'next/dynamic';

const LandingSimple = dynamic(() => import("@/page-components/landing-simple"), { ssr: false });

export default function SimplePage() {
  return <LandingSimple />;
}

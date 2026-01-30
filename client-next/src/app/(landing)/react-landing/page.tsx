'use client';

import dynamic from 'next/dynamic';

const Landing = dynamic(() => import("@/pages/landing"), { ssr: false });

export default function ReactLandingPage() {
  return <Landing />;
}

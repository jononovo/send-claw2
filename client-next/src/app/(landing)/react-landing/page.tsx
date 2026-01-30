'use client';

import dynamic from 'next/dynamic';

const Landing = dynamic(() => import("@/page-components/landing"), { ssr: false });

export default function ReactLandingPage() {
  return <Landing />;
}

'use client';

import dynamic from 'next/dynamic';

const Landing2 = dynamic(() => import("@/pages/landing2"), { ssr: false });

export default function Landing2Page() {
  return <Landing2 />;
}

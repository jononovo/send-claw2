'use client';

import dynamic from 'next/dynamic';

const LobsterLanding = dynamic(() => import("@/page-components/lobster"), { ssr: false });

export default function LobsterPage() {
  return <LobsterLanding />;
}

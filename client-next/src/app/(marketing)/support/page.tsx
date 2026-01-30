'use client';

import dynamic from 'next/dynamic';

const Support = dynamic(() => import("@/pages/support"), { ssr: false });

export default function SupportPage() {
  return <Support />;
}

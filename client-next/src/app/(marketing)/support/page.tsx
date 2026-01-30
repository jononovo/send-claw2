'use client';

import dynamic from 'next/dynamic';

const Support = dynamic(() => import("@/page-components/support"), { ssr: false });

export default function SupportPage() {
  return <Support />;
}

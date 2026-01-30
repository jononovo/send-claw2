'use client';

import dynamic from 'next/dynamic';

const Privacy = dynamic(() => import("@/pages/privacy"), { ssr: false });

export default function PrivacyPage() {
  return <Privacy />;
}

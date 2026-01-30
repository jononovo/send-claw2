'use client';

import dynamic from 'next/dynamic';

const Outreach = dynamic(() => import("@/pages/outreach"), { ssr: false });

export default function OutreachPage() {
  return <Outreach />;
}

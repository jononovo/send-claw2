'use client';

import dynamic from 'next/dynamic';

const Outreach = dynamic(() => import("@/page-components/outreach"), { ssr: false });

export default function OutreachPage() {
  return <Outreach />;
}

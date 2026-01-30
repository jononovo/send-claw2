'use client';

import dynamic from 'next/dynamic';

const DailyOutreach = dynamic(() => import("@/pages/DailyOutreach"), { ssr: false });

export default function DailyOutreachPage() {
  return <DailyOutreach />;
}

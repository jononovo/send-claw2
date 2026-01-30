'use client';

import dynamic from 'next/dynamic';

const Planning = dynamic(() => import("@/pages/planning"), { ssr: false });

export default function PlanningPage() {
  return <Planning />;
}

'use client';

import dynamic from 'next/dynamic';

const Planning = dynamic(() => import("@/page-components/planning"), { ssr: false });

export default function PlanningPage() {
  return <Planning />;
}

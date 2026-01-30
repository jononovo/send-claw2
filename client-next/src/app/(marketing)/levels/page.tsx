'use client';

import dynamic from 'next/dynamic';

const Levels = dynamic(() => import("@/page-components/levels"), { ssr: false });

export default function LevelsPage() {
  return <Levels />;
}

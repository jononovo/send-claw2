'use client';

import dynamic from 'next/dynamic';

const Changelog = dynamic(() => import("@/pages/changelog"), { ssr: false });

export default function ChangelogPage() {
  return <Changelog />;
}

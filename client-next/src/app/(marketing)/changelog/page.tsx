'use client';

import dynamic from 'next/dynamic';

const Changelog = dynamic(() => import("@/page-components/changelog"), { ssr: false });

export default function ChangelogPage() {
  return <Changelog />;
}

'use client';

import dynamic from 'next/dynamic';

const Terms = dynamic(() => import("@/page-components/terms"), { ssr: false });

export default function TermsPage() {
  return <Terms />;
}

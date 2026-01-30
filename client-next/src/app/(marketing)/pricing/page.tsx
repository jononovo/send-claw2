'use client';

import dynamic from 'next/dynamic';

const PricingNew = dynamic(() => import("@/page-components/pricing-new"), { ssr: false });

export default function PricingPage() {
  return <PricingNew />;
}

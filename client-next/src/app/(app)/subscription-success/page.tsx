'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const SubscriptionSuccess = dynamic(() => import("@/page-components/subscription-success"), { ssr: false });

export default function SubscriptionSuccessPage() {
  return (
    <ProtectedPage>
      <SubscriptionSuccess />
    </ProtectedPage>
  );
}

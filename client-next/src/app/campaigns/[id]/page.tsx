'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const CampaignDetail = dynamic(() => import("@/page-components/CampaignDetail"), { ssr: false });

export default function CampaignDetailPage() {
  return (
    <ProtectedPage>
      <CampaignDetail />
    </ProtectedPage>
  );
}

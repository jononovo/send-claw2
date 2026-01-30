'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const Campaigns = dynamic(
  () => import("@/features/campaigns").then(module => ({ default: module.CampaignsPage })),
  { ssr: false }
);

export default function CampaignsPage() {
  return (
    <ProtectedPage>
      <Campaigns />
    </ProtectedPage>
  );
}

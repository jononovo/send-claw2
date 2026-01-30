'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const StrategyDashboard = dynamic(
  () => import("@/features/strategy-chat").then(module => ({ default: module.StrategyDashboard })),
  { ssr: false }
);

export default function StrategyPage() {
  return (
    <ProtectedPage>
      <StrategyDashboard />
    </ProtectedPage>
  );
}

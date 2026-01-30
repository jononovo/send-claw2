'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const Streak = dynamic(() => import("@/page-components/Streak"), { ssr: false });

export default function StreakPage() {
  return (
    <ProtectedPage>
      <Streak />
    </ProtectedPage>
  );
}

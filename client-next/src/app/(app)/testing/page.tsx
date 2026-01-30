'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const Testing = dynamic(() => import("@/pages/testing"), { ssr: false });

export default function TestingPage() {
  return (
    <ProtectedPage>
      <Testing />
    </ProtectedPage>
  );
}

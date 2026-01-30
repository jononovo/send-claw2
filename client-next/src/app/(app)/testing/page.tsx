'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const Testing = dynamic(() => import("@/page-components/testing"), { ssr: false });

export default function TestingPage() {
  return (
    <ProtectedPage>
      <Testing />
    </ProtectedPage>
  );
}

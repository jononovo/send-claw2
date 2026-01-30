'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const Replies = dynamic(() => import("@/pages/replies"), { ssr: false });

export default function RepliesPage() {
  return (
    <ProtectedPage>
      <Replies />
    </ProtectedPage>
  );
}

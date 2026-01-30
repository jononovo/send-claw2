'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const AdminEmailTesting = dynamic(() => import("@/page-components/admin/EmailTesting"), { ssr: false });

export default function AdminEmailPage() {
  return (
    <ProtectedPage>
      <AdminEmailTesting />
    </ProtectedPage>
  );
}

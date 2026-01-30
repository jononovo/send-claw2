'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const AdminAttribution = dynamic(() => import("@/page-components/admin/Attribution"), { ssr: false });

export default function AdminAttributionPage() {
  return (
    <ProtectedPage>
      <AdminAttribution />
    </ProtectedPage>
  );
}

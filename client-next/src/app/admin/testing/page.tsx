'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const AdminApiTesting = dynamic(() => import("@/page-components/admin/ApiTesting"), { ssr: false });

export default function AdminTestingPage() {
  return (
    <ProtectedPage>
      <AdminApiTesting />
    </ProtectedPage>
  );
}

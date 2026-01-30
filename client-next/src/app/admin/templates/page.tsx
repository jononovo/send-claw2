'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const AdminTemplates = dynamic(() => import("@/pages/admin/Templates"), { ssr: false });

export default function AdminTemplatesPage() {
  return (
    <ProtectedPage>
      <AdminTemplates />
    </ProtectedPage>
  );
}

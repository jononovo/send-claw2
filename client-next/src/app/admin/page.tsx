'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const AdminDashboard = dynamic(() => import("@/pages/admin/Dashboard"), { ssr: false });

export default function AdminPage() {
  return (
    <ProtectedPage>
      <AdminDashboard />
    </ProtectedPage>
  );
}

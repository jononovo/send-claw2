'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const AdminUsers = dynamic(() => import("@/page-components/admin/Users"), { ssr: false });

export default function AdminUsersPage() {
  return (
    <ProtectedPage>
      <AdminUsers />
    </ProtectedPage>
  );
}

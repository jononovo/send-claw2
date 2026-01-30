'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const AllContacts = dynamic(() => import("@/page-components/AllContacts"), { ssr: false });

export default function AllContactsPage() {
  return (
    <ProtectedPage>
      <AllContacts />
    </ProtectedPage>
  );
}

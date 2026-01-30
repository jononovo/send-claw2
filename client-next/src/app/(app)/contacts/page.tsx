'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const Contacts = dynamic(() => import("@/page-components/Contacts"), { ssr: false });

export default function ContactsPage() {
  return (
    <ProtectedPage>
      <Contacts />
    </ProtectedPage>
  );
}

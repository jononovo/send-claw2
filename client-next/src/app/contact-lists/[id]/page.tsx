'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const ContactListDetail = dynamic(() => import("@/page-components/ContactListDetail"), { ssr: false });

export default function ContactListDetailPage() {
  return (
    <ProtectedPage>
      <ContactListDetail />
    </ProtectedPage>
  );
}

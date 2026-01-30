'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const ContactListDetail = dynamic(() => import("@/pages/ContactListDetail"), { ssr: false });

export default function ContactListDetailPage() {
  return (
    <ProtectedPage>
      <ContactListDetail />
    </ProtectedPage>
  );
}

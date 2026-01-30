'use client';

import dynamic from 'next/dynamic';
import { SemiProtectedPage } from "@/components/semi-protected-page";

const ContactDetails = dynamic(() => import("@/page-components/contact-details"), { ssr: false });

export default function ContactDetailsPage() {
  return (
    <SemiProtectedPage>
      <ContactDetails />
    </SemiProtectedPage>
  );
}

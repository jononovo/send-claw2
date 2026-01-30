'use client';

import dynamic from 'next/dynamic';
import { ProtectedPage } from "@/components/protected-page";

const Account = dynamic(() => import("@/page-components/account"), { ssr: false });

export default function AccountPage() {
  return (
    <ProtectedPage>
      <Account />
    </ProtectedPage>
  );
}

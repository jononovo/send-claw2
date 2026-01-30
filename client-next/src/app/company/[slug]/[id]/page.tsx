'use client';

import dynamic from 'next/dynamic';
import { SemiProtectedPage } from "@/components/semi-protected-page";

const CompanyDetails = dynamic(() => import("@/page-components/company-details"), { ssr: false });

export default function CompanyDetailsPage() {
  return (
    <SemiProtectedPage>
      <CompanyDetails />
    </SemiProtectedPage>
  );
}

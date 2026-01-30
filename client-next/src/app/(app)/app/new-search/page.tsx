'use client';

import dynamic from 'next/dynamic';
import { SemiProtectedPage } from "@/components/semi-protected-page";

const Home = dynamic(() => import("@/pages/home"), { ssr: false });

export default function NewSearchPage() {
  return (
    <SemiProtectedPage>
      <Home isNewSearch={true} />
    </SemiProtectedPage>
  );
}

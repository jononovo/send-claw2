'use client';

import dynamic from 'next/dynamic';
import { SemiProtectedPage } from "@/components/semi-protected-page";

const Home = dynamic(() => import("@/page-components/home"), { ssr: false });

export default function AppPage() {
  return (
    <SemiProtectedPage>
      <Home />
    </SemiProtectedPage>
  );
}

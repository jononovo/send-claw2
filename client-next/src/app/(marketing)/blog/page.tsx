'use client';

import dynamic from 'next/dynamic';

const Blog = dynamic(() => import("@/pages/blog"), { ssr: false });

export default function BlogPage() {
  return <Blog />;
}

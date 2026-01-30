'use client';

import dynamic from 'next/dynamic';

const BlogPost = dynamic(() => import("@/pages/blog-post"), { ssr: false });

export default function BlogPostPage() {
  return <BlogPost />;
}

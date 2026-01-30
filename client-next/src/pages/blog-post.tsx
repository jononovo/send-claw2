import { useRoute, useLocation, Link } from "wouter";
import { getBlogPost } from "@/lib/blog-data";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Tag, User } from "lucide-react";
import { Footer } from "@/components/footer";
import ReactMarkdown from 'react-markdown';
import { useEffect } from "react";

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const [, navigate] = useLocation();
  const slug = params?.slug || "";
  const post = getBlogPost(slug);
  
  // Reset scroll position when blog post component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Post not found</h1>
        <Button onClick={() => navigate("/blog")}>Back to Blog</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto py-12 px-4 flex-1">
        <div className="max-w-3xl mx-auto">
          <Link href="/blog">
            <Button 
              variant="ghost" 
              className="mb-8 flex items-center" 
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Blog
            </Button>
          </Link>

          {/* Create a header area with matching gradients based on category */}
          <div className={`mb-8 w-full h-64 rounded-xl flex items-center justify-center overflow-hidden
            ${post.category === 'Strategy' 
              ? 'bg-gradient-to-r from-yellow-50 via-purple-50 to-blue-50 dark:from-yellow-900/10 dark:via-purple-900/10 dark:to-blue-900/10' 
              : post.category === 'Technology' 
              ? 'bg-gradient-to-br from-blue-50 via-cyan-50 to-green-50 dark:from-blue-900/10 dark:via-cyan-900/10 dark:to-green-900/10' 
              : 'bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-900/10 dark:via-amber-900/10 dark:to-yellow-900/10'}`}>
            <div className="relative z-10">
              <h2 className={`text-6xl font-bold text-center px-6
                ${post.category === 'Strategy' 
                  ? 'text-purple-600 dark:text-purple-400' 
                  : post.category === 'Technology' 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-amber-600 dark:text-amber-400'}`}>
                {post.title.split(' ').slice(0, 3).join(' ')}
              </h2>
            </div>

          </div>
          

          <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
          
          <div className="flex flex-wrap gap-4 mb-8 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center">
              <Calendar size={14} className="mr-1" />
              {post.date}
            </div>
            <div className="flex items-center">
              <User size={14} className="mr-1" />
              {post.author}
            </div>
            <div className="flex items-center">
              <Tag size={14} className="mr-1" />
              {post.category}
            </div>
          </div>

          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown>
              {post.content.replace(`# ${post.title}`, '')}
            </ReactMarkdown>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2 mb-8">
              {post.tags.map((tag) => (
                <span 
                  key={tag}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
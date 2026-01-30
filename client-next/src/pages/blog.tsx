import { Link } from "wouter";
import { getAllBlogPosts } from "@/lib/blog-data";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Clock, Tag, User, Sparkles } from "lucide-react";
import { Footer } from "@/components/footer";

export default function Blog() {
  const posts = getAllBlogPosts();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
      <div className="container mx-auto py-12 px-4 flex-1">
        {/* Blog Header With Styling */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="mb-4 inline-flex items-center px-4 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
            <Sparkles size={16} className="mr-2" />
            <span className="text-sm font-medium">Quack Insights</span>
          </div>
          <h1 className="text-5xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            5Ducks Blog
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Insights, tutorials, and updates to help you master the art of focused selling
          </p>
        </div>

        {/* Blog Grid Layout */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Card key={post.id} className="overflow-hidden transition-all duration-300 hover:shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full flex flex-col">
                <div className="relative w-full h-48 overflow-hidden">
                  <div className={`w-full h-full flex items-center justify-center
                    ${post.category === 'Strategy' 
                      ? 'bg-gradient-to-r from-yellow-50 via-purple-50 to-blue-50 dark:from-yellow-900/10 dark:via-purple-900/10 dark:to-blue-900/10' 
                      : post.category === 'Technology' 
                      ? 'bg-gradient-to-br from-blue-50 via-cyan-50 to-green-50 dark:from-blue-900/10 dark:via-cyan-900/10 dark:to-green-900/10' 
                      : 'bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-900/10 dark:via-amber-900/10 dark:to-yellow-900/10'}`}>
                    <div className="relative z-10 p-4">
                      <h3 className={`${post.category === 'Strategy' 
                        ? 'text-purple-700 dark:text-purple-400' 
                        : post.category === 'Technology' 
                        ? 'text-blue-700 dark:text-blue-400' 
                        : 'text-amber-700 dark:text-amber-400'} text-xl md:text-2xl font-bold text-center`}>
                        {post.title.split(' ').slice(0, 3).join(' ')}
                      </h3>
                    </div>
                    
                    <div className="absolute top-0 right-0 bg-gray-700 dark:bg-gray-800 text-white text-xs font-bold px-3 py-1 m-2 rounded-full">
                      {post.category}
                    </div>
                    

                  </div>
                </div>
                <CardHeader className="pb-2">
                  <Link href={`/blog/${post.slug}`}>
                    <CardTitle className="text-xl font-bold hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer line-clamp-2">
                      {post.title}
                    </CardTitle>
                  </Link>
                  <CardDescription className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center">
                      <Clock size={12} className="mr-1" />
                      {post.date}
                    </span>
                    <span className="flex items-center">
                      <User size={12} className="mr-1" />
                      {post.author}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3">{post.excerpt}</p>
                </CardContent>
                <CardFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Link href={`/blog/${post.slug}`}>
                    <Button variant="ghost" className="text-blue-600 dark:text-blue-400 p-0 hover:bg-transparent flex items-center text-sm">
                      Read Article <ChevronRight size={14} className="ml-1" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
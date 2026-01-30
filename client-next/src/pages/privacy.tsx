import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";
import { getBlogPost } from "@/lib/blog-data";

export default function Privacy() {
  // Reset scroll position when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // Get content from existing blog post
  const privacyContent = getBlogPost("privacy");
  
  return (
    <div className="container mx-auto py-8 flex-1">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p className="lead">Last updated: {privacyContent?.date || new Date().toLocaleDateString()}</p>
          
          {privacyContent ? (
            <div dangerouslySetInnerHTML={{ 
              __html: privacyContent.content
                .replace(/^#+\s*5Ducks\s*Privacy\s*Policy\s*$/m, '')
                .replace(/^\*\*Last\s*Updated:.*\*\*$/m, '')
                .split("## ").join("<h2>").split("\n\n").join("</h2><p>")
                .replace(/<h2>Introduction<\/h2>/g, "<h2>Introduction</h2>")
                .replace(/<\/p>\s*<h2>/g, "</p><h2>")
                .replace(/<p>-\s*/g, "<p>• ")
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            }} />
          ) : (
            <p>Privacy policy content not found. Please check the blog post data.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
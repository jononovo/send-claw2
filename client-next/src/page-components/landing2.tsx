import { useState, useRef } from "react";
'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import Link from 'next/link';
import { 
  Search, 
  ArrowRight, 
  Sparkles, 
  MessageSquare, 
  Users, 
  ChevronRight,
  PlayCircle,
  Menu
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { SEOHead } from "@/components/ui/seo-head";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const EXAMPLE_PROMPTS = [
  "Highly-rated Greek restaurants in Midtown NYC",
  "Real-estate lawyers in Salt Lake City",
  "Stationary suppliers in Scranton",
  "Health-tech SaaS in Brooklyn",
  "Wolf-of-wallstreet-esque trading companies",
];

export default function Landing2Page() {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const videoRef = useRef<HTMLDivElement>(null);
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);

  // Function to handle search submission
  const handleSearch = (query: string = searchQuery) => {
    if (!query.trim()) return;
    
    // Track the search event in Google Analytics
    trackEvent('search', 'landing2_page', query);
    
    // Store the search query for use on the app page
    localStorage.setItem("pendingSearchQuery", query);
    
    // Set flag indicating user is coming from landing page
    localStorage.setItem("5ducks_from_landing", "true");
    
    // Navigate directly to the app page
    router.push("/app");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
      {/* SEO tags for landing page */}
      <SEOHead 
        title="5Ducks - Sell to 5 new people every day (Landing2)"
        description="Easy Selling for Small Businesses - Sell to 5 new people every day."
        type="website"
        twitterCard="summary_large_image"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "5Ducks",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "offers": {
            "@type": "Offer",
            "price": "29.00",
            "priceCurrency": "USD"
          },
          "description": "Easy Selling for Small Businesses - Sell to 5 new people every day.",
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "reviewCount": "57"
          }
        }}
      />
      {/* Header */}
      <header className="container mx-auto py-4 px-4">
        <div className="flex justify-between items-center">
          <Logo size="lg" asLink={false} />
          
          <div className="flex-1 flex justify-center">
            <nav className="hidden md:block">
              <ul className="flex space-x-8">
                <li>
                  <Link 
                    href="/pricing" 
                    onClick={() => trackEvent('view_pricing', 'navigation', 'header_link')}
                  >
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors border-b border-transparent hover:border-slate-400 dark:hover:border-slate-600 py-1">
                      Pricing
                    </span>
                  </Link>
                </li>
                {/* Future links would go here as additional <li> elements */}
              </ul>
            </nav>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href="/pricing">
                    <DropdownMenuItem
                      onClick={() => trackEvent('view_pricing', 'navigation', 'mobile_menu')}
                    >
                      Pricing
                    </DropdownMenuItem>
                  </Link>
                  {/* Additional mobile menu items would go here */}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Link href="/app">
              <Button variant="outline">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1">
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center px-4 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
              <Sparkles size={16} className="mr-2" />
              <span className="text-sm font-medium">AI-Powered B2B Sales</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 leading-tight">
              Sell to 5 new people every day.
            </h1>
            
            <p className="text-xl text-slate-700 dark:text-slate-300 mb-12 max-w-2xl mx-auto">
              <span className="font-normal">What type of business 💼 would you like to sell to? 🤷🏼‍♀️<br />
              And where?</span>
            </p>

            {/* Search Input */}
            <div className="relative max-w-2xl mx-auto mb-10">
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-full opacity-70 blur"></div>
              <div className="relative bg-white dark:bg-slate-900 rounded-full">
                <Input
                  type="text"
                  placeholder="Adventure service providers in Maine"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-36 py-7 text-lg rounded-full border-transparent shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                />
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-blue-500" size={20} />
                <Button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full px-5 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  onClick={() => handleSearch()}
                >
                  <span className="mr-2">Quack</span>
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>

            {/* Suggestion Text */}
            <div className="text-center mt-4 mb-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Or select one of the suggestions below:</p>
            </div>

            {/* Example Search Prompts */}
            <div className="flex flex-wrap justify-center gap-2 mb-16">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  className="text-sm bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                  onClick={() => {
                    trackEvent('example_prompt_click', 'landing2_page', prompt);
                    setSearchQuery(prompt);
                    handleSearch(prompt);
                  }}
                >
                  {prompt}
                </Button>
              ))}
            </div>
            
            <div className="flex flex-wrap justify-center space-x-2 md:space-x-8 my-10">
              <div className="text-center p-3 md:p-4">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">22 Hours</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Saved per Month</div>
              </div>
              <div className="text-center p-3 md:p-4">
                <div className="text-3xl md:text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">225 Targets </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Sweet-talked to per Month</div>
              </div>
              <div className="text-center p-3 md:p-4">
                <div className="text-3xl md:text-4xl font-bold text-pink-600 dark:text-pink-400 mb-2">Avg $70k</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">New Revenue Pipeline*</div>
              </div>
            </div>
          </div>
        </section>

        {/* Video Section */}
        <section ref={videoRef} className="py-20 px-4 bg-white dark:bg-slate-900">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold mb-8 text-center">See How It Works</h2>
            
            <div 
              className={`relative aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden transition-all duration-500 mx-auto 
                ${isVideoExpanded ? "w-[90%] shadow-xl" : "w-[60%] cursor-pointer"}
              `}
              onClick={() => {
                if (!isVideoExpanded) {
                  trackEvent('video_play', 'landing2_page', 'demo_video');
                  setIsVideoExpanded(true);
                }
              }}
            >
              {/* Thumbnail overlay when not expanded */}
              {!isVideoExpanded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent to-slate-900/60 text-white">
                  <PlayCircle size={64} className="mb-4 text-white opacity-90" />
                  <p className="font-medium">Click to watch demo</p>
                </div>
              )}
              
              {/* Replace this with your arcade.software embed */}
              <div className="h-full w-full flex items-center justify-center">
                {isVideoExpanded ? (
                  <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    <p className="text-muted-foreground text-center">Interactive demo will load here</p>
                  </div>
                ) : (
                  <img 
                    src="https://placehold.co/1920x1080/2563eb/FFFFFF?text=5+Ducks+Demo+Video" 
                    alt="Video thumbnail" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-16 px-4 bg-blue-50 dark:bg-blue-950/30">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold mb-4 text-center">Find Ultra Niche Contacts</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-12 text-center">or companies that would be impossible to filter in any other GTM or Lead-gen platform.</p>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mb-4">
                  <MessageSquare className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Simply prompt type of company</h3>
                <p className="text-slate-600 dark:text-slate-400">Adapt your prompt until you are getting the companies you want.</p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center mb-4">
                  <Users className="text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Then click "Find Key Contacts"</h3>
                <p className="text-slate-600 dark:text-slate-400">Which identifies the top 3 decision-makers in the each company.</p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md">
                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/50 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="text-pink-600 dark:text-pink-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Find all decision-maker's email</h3>
                <p className="text-slate-600 dark:text-slate-400">with a single click or drill-down and only find those you want.</p>
              </div>
            </div>
            
            <div className="text-center mt-12">
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full px-8 py-6"
                onClick={() => {
                  trackEvent('cta_click', 'landing2_page', 'try_free_5min');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="mr-2">Try it for free</span>
                <ChevronRight size={16} />
              </Button>
            </div>
            
            {/* My Story Section */}
            <div className="mt-20 max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg">
              <h3 className="text-2xl font-semibold mb-6 text-center">My Story</h3>
              <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                <p>I do 10 push-ups before every shower and I realized that if I do 20, I will very soon stop doing them. But I will explain that later. </p>
                
                <p className="mt-4">In February, after spending an embarrassingly long amount of time creating a SaaS product with a couple of developers.
                It was finally time to start selling. But being easily distracted, I instead figured that I should create a tool that will make selling easier for me. (Of course!!! That's not procrastination. That's efficiency.)</p>
                
                <p className="mt-4">I kept getting caught in the routine of looking up companies, then looking up people in those companies, then looking up their emails, then crafting emails, then 
                sending sales emails?!?</p>
                
                <p className="mt-4">It was taking me 20 minutes per company. And at my rate, I was going to sell to about 5 companies every 2 weeks.</p>
                
                <p className="mt-4">That was not going to work.</p>
                
                <p className="mt-4">So I made myself a tool that took that from 20 minutes per company to 2 minutes per company. Sweet!</p>
                
                <p className="mt-4">I was so pleased with it that I realized we needed to share it. So my team and I made it a proper product.</p>
                
                <p className="mt-4">A month and a half later, I was using it to send 10-20 quality, targeted reach-outs per day.</p>
                
                <p className="mt-4">Hmm... where does the 10 push-ups come in? I realized that if I commit to 20 push-ups before every shower, I will fail. But if I commit to 10, I might actually do them. And once I start doing 10, I might even naturally do 15. But if I fail at 20, I stop altogether.</p>
                
                <p className="mt-4">Same principle here. Instead of committing to emailing 50 companies per day (which is a lot of work and I will fail), I commit to emailing just 5 per day. And I actually do it. Every day. And some days I even do 10.</p>
                
                <p className="mt-4 font-semibold">**5 new people. Every day.**</p>
                
                <p className="mt-4">That's 1,825 new contacts per year. If even 2% become customers, that's 36 new customers per year.</p>
                
                <p className="mt-4">Hope this helps you sell as much as it's helping me.</p>
                
                <p className="mt-4 text-right italic">- Jon</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-100 dark:bg-slate-900 py-8 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            * Revenue pipeline projection based on average customer lifetime value and conversion rates from beta users
          </p>
          <div className="flex justify-center space-x-6 text-sm">
            <Link href="/terms" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
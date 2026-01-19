import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Award, Check, Clock, CreditCard, Database, Filter, Lock, Map, Moon, Search, Shield, Sparkles, Star, Sun, Zap } from "lucide-react";
import { useRegistrationModal } from "@/hooks/use-registration-modal";
import { useAuth } from "@/hooks/use-auth";
import { FooterStealth } from "@/components/footer-stealth";
import { DemoSimulationPlayer } from "@/features/demo-simulations";
import { StealthOnboardingModal } from "@/features/landing-stealth/StealthOnboardingModal";
import danThumb from "@/features/landing-stealth/assets/professional_headshot_of_dan_hartmann_thumb.jpg";
import sarahThumb from "@/features/landing-stealth/assets/professional_headshot_of_sarah_chen_thumb.jpg";
import alexThumb from "@/features/landing-stealth/assets/natural_outdoor_portrait_of_older_alex_rivera_with_beard_thumb.jpg";
import fiveMinutesImage from "@/features/landing-stealth/assets/vibrant_colorful_five_contacts_confetti.png";

const testimonials = [
  {
    quote: "Sales for dummies (or busy people)",
    author: "Alex Rivera",
    role: "Growth Hacker Daily",
    image: alexThumb
  },
  {
    quote: "...crushes distractions and procrastination",
    author: "Sarah Chen",
    role: "TechWeekly",
    image: sarahThumb
  },
  {
    quote: "...simplifies prospecting & outreach into one page",
    author: "Dan Hartmann",
    role: "Startup Insider",
    image: danThumb
  }
];

const freshDataTabs = [
  {
    id: "fresh-data",
    icon: Clock,
    title: "5 Minutes per Day",
    summary: "Making sales simple and fun again",
    fullDescription: "No more tool overload. Just follow the checklist for the day.",
  },
  {
    id: "one-prompt",
    icon: Sparkles,
    title: "1 Prompt, Not 75 Filters",
    summary: "Just type what you want",
    fullDescription: "No \"advanced search\" tutorials. Just describe your ideal customer in plain English.",
  },
  {
    id: "unsearchable",
    icon: Map,
    title: "Search the Unsearchable",
    summary: "Queries nobody else can run",
    fullDescription: "Context that exists nowhere else. Try it.",
  },
];

function FiveMinutesGraphic() {
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <img 
          src={fiveMinutesImage} 
          alt="Playful duck mascot with daily email task card" 
          className="w-full h-auto rounded-xl mb-4 opacity-90"
        />
        <p className="text-gray-400 text-sm">
          Your daily 5 minutes. <span className="text-yellow-400">Emails ready to review.</span>
        </p>
      </div>
    </div>
  );
}

function PromptVsFilters() {
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium">Traditional Approach</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {["Industry", "Company Size", "Revenue", "Location", "Tech Stack", "Job Title", "Seniority", "Department", "Keywords"].map((filter) => (
              <div key={filter} className="bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded px-2 py-1 text-xs text-gray-500 truncate">
                {filter} ▾
              </div>
            ))}
          </div>
          <p className="text-gray-600 text-xs mt-2 italic">+ 66 more filters...</p>
        </div>
        
        <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">5Ducks Approach</span>
          </div>
          <div className="bg-gray-800 dark:bg-black/40 border border-gray-600 dark:border-white/20 rounded-lg px-4 py-2.5">
            <span className="text-white font-mono text-sm">
              "SaaS companies in Austin with Series A funding"
            </span>
            <span className="text-yellow-400 ml-1">|</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchExamples() {
  const examples = [
    "Beach-side 4-star hotels on the Space Coast",
    "Recently-exited startups in Miami",
    "Family-owned wineries in Napa Valley",
    "AI companies hiring remote engineers",
    "Boutique marketing agencies in Brooklyn",
  ];
  
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-6">
          <Search className="w-5 h-5 text-yellow-400" />
          <span className="text-gray-400 text-sm">Searches that are impossible elsewhere:</span>
        </div>
        
        <div className="space-y-3">
          {examples.slice(0, 3).map((example, i) => (
            <div
              key={i}
              className="bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-gray-700 dark:text-gray-300 text-sm">"{example}"</span>
            </div>
          ))}
        </div>
        
        <p className="text-center text-gray-500 text-sm mt-6">
          <span className="text-yellow-400">Literally anything.</span> At your fingertips.
        </p>
      </div>
    </div>
  );
}

const freshDataGraphics = [FiveMinutesGraphic, PromptVsFilters, SearchExamples];

function FreshDataSection({ activeTab, onTabClick }: { activeTab: number; onTabClick: (index: number) => void }) {
  const GraphicComponent = freshDataGraphics[activeTab];
  const activeTabData = freshDataTabs[activeTab];

  return (
    <div className="relative z-20 bg-gray-50 dark:bg-[#0A0A10] py-24">
      <div className="absolute inset-0 opacity-5 dark:opacity-10" style={{ backgroundImage: "radial-gradient(#64748b 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-serif text-gray-800 dark:text-white mb-4">Fresh Data. Fresh Relationships.</h2>
          <p className="text-xl text-gray-500 italic">
            While competitors rely on stale databases, we search fresh — every time.
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto">
          {/* Desktop: Vertical tabs layout */}
          <div className="hidden md:grid md:grid-cols-[300px_1fr] gap-6">
            <div className="space-y-3">
              {freshDataTabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = index === activeTab;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabClick(index)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                      isActive 
                        ? "bg-yellow-100 dark:bg-yellow-500/10 border-yellow-400 dark:border-yellow-500/30" 
                        : "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        isActive ? "bg-yellow-200 dark:bg-yellow-500/20" : "bg-gray-200 dark:bg-white/10"
                      }`}>
                        <Icon className={`w-5 h-5 ${isActive ? "text-yellow-600 dark:text-yellow-400" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <h3 className={`font-bold transition-colors ${isActive ? "text-gray-800 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
                          {tab.title}
                        </h3>
                        <p className={`text-sm transition-colors ${isActive ? "text-gray-600 dark:text-gray-400" : "text-gray-400 dark:text-gray-600"}`}>
                          {tab.summary}
                        </p>
                      </div>
                    </div>
                    
                    {isActive && (
                      <div
                        key={`progress-${activeTab}`}
                        className="h-0.5 bg-yellow-500/50 mt-3 rounded-full"
                        style={{ animation: "progress-fill 4s linear" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden min-h-[400px] flex flex-col">
              <div className="flex-1 relative">
                {freshDataGraphics.map((Graphic, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-300 ${
                      index === activeTab ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <Graphic />
                  </div>
                ))}
              </div>
              
              <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20">
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {activeTabData.fullDescription}
                </p>
              </div>
            </div>
          </div>
          
          {/* Mobile: Accordion layout */}
          <div className="md:hidden space-y-4">
            {freshDataTabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = index === activeTab;
              const Graphic = freshDataGraphics[index];
              
              return (
                <div
                  key={tab.id}
                  className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => onTabClick(index)}
                    className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${
                      isActive ? "bg-yellow-100 dark:bg-yellow-500/10" : "bg-gray-100 dark:bg-white/5"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isActive ? "bg-yellow-200 dark:bg-yellow-500/20" : "bg-gray-200 dark:bg-white/10"
                    }`}>
                      <Icon className={`w-5 h-5 ${isActive ? "text-yellow-600 dark:text-yellow-400" : "text-gray-400"}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold ${isActive ? "text-gray-800 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
                        {tab.title}
                      </h3>
                    </div>
                  </button>
                  
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isActive ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="p-4 border-t border-gray-200 dark:border-white/10">
                      <div className="h-64">
                        <Graphic />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">
                        {tab.fullDescription}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingSimple() {
  const { openModal, openModalForLogin, setRegistrationSuccessCallback } = useRegistrationModal();
  const { user } = useAuth();
  
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [onlineCount, setOnlineCount] = useState(() => Math.floor(Math.random() * (99 - 13 + 1)) + 13);
  const [freshDataActiveTab, setFreshDataActiveTab] = useState(0);
  const [freshDataPaused, setFreshDataPaused] = useState(false);
  const freshDataPauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const testimonialSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only redirect on root path - /simple and /landing-simple bypass redirect for testing
    const isRootPath = window.location.pathname === '/';
    if (user && isRootPath) {
      window.location.href = "/app";
    }
  }, [user]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonialIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount((prev) => {
        const change = Math.floor(Math.random() * 9) - 4;
        const newCount = prev + change;
        return Math.max(13, Math.min(99, newCount));
      });
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (freshDataPaused) return;
    const interval = setInterval(() => {
      setFreshDataActiveTab(prev => (prev + 1) % freshDataTabs.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [freshDataPaused]);

  useEffect(() => {
    return () => {
      if (freshDataPauseTimeoutRef.current) {
        clearTimeout(freshDataPauseTimeoutRef.current);
      }
    };
  }, []);

  const handleFreshDataTabClick = useCallback((index: number) => {
    setFreshDataActiveTab(index);
    setFreshDataPaused(true);
    if (freshDataPauseTimeoutRef.current) {
      clearTimeout(freshDataPauseTimeoutRef.current);
    }
    freshDataPauseTimeoutRef.current = setTimeout(() => {
      setFreshDataPaused(false);
    }, 8000);
  }, []);

  const handleGetStarted = () => {
    setIsOnboardingOpen(true);
  };

  const handleOnboardingComplete = () => {
    setIsOnboardingOpen(false);
    window.location.href = "/app";
  };

  const handleLogin = () => {
    setRegistrationSuccessCallback(() => {
      window.location.href = "/app";
    });
    openModalForLogin();
  };

  return (
    <div>
      <div className="min-h-screen w-full bg-background overflow-x-hidden relative flex flex-col">
        
        {/* Hero Section */}
        <div className="relative z-10 min-h-[90vh] flex flex-col justify-center">
          {/* Logo */}
          <div className="absolute top-6 left-6 md:top-10 md:left-10 z-30">
            <div className="font-bold flex items-center text-3xl">
              <div className="flex items-end ml-3">
                <span className="text-3xl opacity-80">🐥</span>
                <span className="text-2xl md:inline hidden opacity-60">🥚🥚🥚🥚</span>
              </div>
            </div>
          </div>

          {/* Login Link & Theme Toggle */}
          <div className="absolute top-4 right-6 md:top-6 md:right-10 z-30 flex items-center gap-4">
            <button 
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full text-foreground/40 hover:text-foreground/70 hover:bg-foreground/5 transition-all duration-200"
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              type="button"
              onClick={handleLogin}
              className="text-sm text-foreground/30 hover:text-foreground/60 transition-colors font-bold uppercase tracking-widest bg-transparent border-none cursor-pointer"
            >
              Login
            </button>
          </div>

          {/* Background */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-background" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
          </div>

          <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center py-20">
            {/* Left Column - Text & CTA */}
            <div className="flex flex-col gap-8 max-w-xl">
              <div className="space-y-4 pt-12 lg:pt-24">
                <span className="block text-sm lg:text-base text-gray-500 dark:text-gray-400 font-medium tracking-widest uppercase mb-2 pl-1 font-mono opacity-80">
                  Founder-led
                </span>
                
                <h1 className="text-6xl lg:text-8xl font-bold leading-[0.9] tracking-normal text-gray-800 dark:text-gray-200 font-serif">
                  <span className="block mb-2">Find</span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-600 dark:from-yellow-400 dark:to-yellow-100 drop-shadow-[0_0_30px_rgba(250,204,21,0.3)]">
                    Customers.
                  </span>
                </h1>

                <p className="text-xl text-muted-foreground leading-relaxed max-w-md font-medium pt-8">
                  And email them in seconds.<br />
                  Start with 5 mins per day.
                </p>
              </div>

              <div className="flex flex-col gap-4 w-full max-w-md mt-4">
                <Button
                  onClick={handleGetStarted}
                  className="group relative h-16 overflow-hidden bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-[#0A0A10] dark:via-[#1a1a1f] dark:to-[#0f0f14] text-gray-500 dark:text-gray-400 hover:text-black font-bold text-xl rounded-xl transition-colors duration-500 ease-in-out !cursor-pointer border border-gray-300 dark:border-white/10"
                >
                  <span 
                    className="absolute inset-0 opacity-0 rounded-xl cursor-pointer group-hover:animate-[shimmer-fade_3s_ease-in-out_forwards,shimmer_15s_ease-in-out_infinite]"
                    style={{ 
                      backgroundImage: 'linear-gradient(90deg, #eab308 0%, #facc15 25%, #fef08a 50%, #facc15 75%, #eab308 100%)',
                      backgroundSize: '200% 100%'
                    }}
                  />
                  <span className="relative z-10 flex items-center">
                    <span className="group-hover:animate-[text-swap-out_3s_ease-in-out_forwards]">Start outreach with baby steps</span>
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:animate-[text-swap-in_3s_ease-in-out_forwards] text-white">You've Got This! <ArrowRight style={{ width: '24px', height: '24px', marginLeft: '8px' }} /></span>
                    <ArrowRight className="ml-2 group-hover:animate-[arrow-fade-out_3s_ease-in-out_forwards]" style={{ width: '24px', height: '24px' }} />
                  </span>
                </Button>
                <div className="group flex flex-wrap justify-center gap-4 text-gray-500 text-sm px-4 py-2 rounded-lg hover:text-gray-900 dark:hover:text-white hover:scale-105 transition-all duration-200">
                  <span className="flex items-center gap-1"><Check className="w-4 h-4 text-gray-500 group-hover:text-green-500 transition-colors" /> No registration</span>
                  <span className="flex items-center gap-1"><Check className="w-4 h-4 text-gray-500 group-hover:text-green-500 transition-colors" /> No credit card</span>
                  <span className="flex items-center gap-1"><Check className="w-4 h-4 text-gray-500 group-hover:text-green-500 transition-colors" /> 190 Credits</span>
                </div>

                {/* Trust Section */}
                <div className="mt-6 pt-6 flex items-center justify-center gap-10">
                  {/* Rating Block */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <div className="flex">
                        {[1,2,3,4,5].map((i) => (
                          <Star key={i} className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                        ))}
                      </div>
                      <span className="ml-2 text-gray-700 dark:text-gray-300 text-base font-medium">4.82/5</span>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-gray-500 font-semibold text-sm">Capterra</span>
                      <span className="text-gray-400 dark:text-gray-600">•</span>
                      <span className="text-gray-500 font-bold text-sm">G2</span>
                    </div>
                  </div>
                  
                  <div className="w-px h-12 bg-gray-300 dark:bg-white/10" />
                  
                  {/* Customers Block */}
                  <div className="text-center">
                    <div className="text-gray-700 dark:text-gray-300 text-base font-medium mb-1">2,400+ customers</div>
                    <div className="text-gray-500 text-sm flex items-center justify-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-600/70" />
                      {onlineCount} Online
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Demo Simulation */}
            <div className="hidden lg:block -mt-16">
              <div className="relative w-[520px]">
                <div className="bg-gray-100 dark:bg-[#1a1814] rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10">
                  {/* Browser chrome header */}
                  <div className="flex items-center gap-3 px-4 py-2 bg-gray-200 dark:bg-[#0f0e0c] border-b border-gray-300 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="flex items-center gap-2 px-3 py-1 bg-gray-300 dark:bg-white/5 rounded-md text-xs text-gray-500">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>app.5ducks.com</span>
                      </div>
                    </div>
                    <div className="w-[44px]" />
                  </div>
                  
                  <DemoSimulationPlayer
                    simulation="search-composer-demo-v2"
                    width={520}
                    height={520}
                    showControls={false}
                    className="!rounded-none !shadow-none"
                  />
                </div>
              </div>
              
              {/* Try search link */}
              <div className="mt-4 flex items-center justify-center">
                <a href="/app" className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  <span>Tryout search directly</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
              
              {/* Certifications - positioned below demo */}
              <div className="mt-8 flex items-center justify-center gap-6">
                {/* SOC 2 Badge */}
                <div className="flex flex-col items-center gap-1">
                  <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="12" stroke="#6b7280" strokeWidth="2" fill="none"/>
                    <path d="M14 6L16 10H12L14 6Z" fill="#6b7280"/>
                    <circle cx="14" cy="14" r="4" fill="#6b7280"/>
                    <path d="M8 18C8 18 10 21 14 21C18 21 20 18 20 18" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span className="text-xs text-gray-500 font-medium">SOC 2*</span>
                </div>
                {/* Built in NYC Badge */}
                <div className="flex flex-col items-center gap-1">
                  <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                    <rect x="6" y="12" width="4" height="12" fill="#6b7280"/>
                    <rect x="12" y="6" width="4" height="18" fill="#6b7280"/>
                    <rect x="18" y="9" width="4" height="15" fill="#6b7280"/>
                    <path d="M14 2L12 6H16L14 2Z" fill="#6b7280"/>
                  </svg>
                  <span className="text-xs text-gray-500 font-medium">Built in NYC</span>
                </div>
                {/* Stripe Badge */}
                <div className="flex flex-col items-center gap-1">
                  <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                    <rect x="3" y="6" width="22" height="16" rx="3" stroke="#6b7280" strokeWidth="2" fill="none"/>
                    <path d="M7 14H21" stroke="#6b7280" strokeWidth="1.5"/>
                    <path d="M7 18H13" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="19" cy="11" r="2" fill="#6b7280"/>
                  </svg>
                  <span className="text-xs text-gray-500 font-medium">Stripe</span>
                </div>
                {/* GDPR Badge */}
                <div className="flex flex-col items-center gap-1">
                  <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                    <path d="M14 3L4 8V14C4 20 8 24 14 26C20 24 24 20 24 14V8L14 3Z" stroke="#6b7280" strokeWidth="2" fill="none"/>
                    <path d="M10 14L13 17L18 11" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-xs text-gray-500 font-medium">GDPR</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trusted By Section - Full Width */}
        <div className="relative z-20 py-8 -mt-4 border-t border-gray-200 dark:border-white/5">
          <div className="container mx-auto px-6">
            <p className="text-gray-500 text-sm text-center mb-5 tracking-wide">Trusted by teams at</p>
            <div className="flex items-center justify-center gap-8 md:gap-12 flex-nowrap overflow-hidden">
              <span className="text-gray-500 font-medium text-xl tracking-wide hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-300 cursor-default">Linear</span>
              <span className="text-gray-500 font-light text-xl italic hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-300 cursor-default">Vercel</span>
              <span className="text-gray-500 font-bold text-sm uppercase tracking-widest hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-300 cursor-default">Raycast</span>
              <span className="text-gray-500 font-medium text-xl hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-300 cursor-default">Loom</span>
              <span className="text-gray-500 font-semibold text-xl tracking-tight hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-300 cursor-default">Notion</span>
              <span className="text-gray-500 font-light text-xl hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-300 cursor-default">Figma</span>
              <span className="text-gray-500 font-bold text-sm uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-300 cursor-default">Slack</span>
              <span className="text-gray-500 font-medium text-xl hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-300 cursor-default">Airtable</span>
              <span className="text-gray-500 font-semibold text-sm uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-300 cursor-default">Webflow</span>
            </div>
          </div>
        </div>

        {/* Testimonials Section - CSS Only */}
        <div ref={testimonialSectionRef} className="relative z-20 bg-gray-50 dark:bg-[#0A0A10] border-t border-gray-200 dark:border-white/10 py-24">
          <div className="absolute inset-0 opacity-10 dark:opacity-20" style={{ backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <div className="min-h-[250px] flex flex-col justify-center items-center relative z-10">
                  {testimonials.map((testimonial, index) => (
                    <div
                      key={index}
                      className={`w-full absolute inset-0 flex flex-col md:flex-row items-end justify-center md:pl-20 transition-opacity duration-500 ${
                        index === currentTestimonialIndex ? "opacity-100" : "opacity-0 pointer-events-none"
                      }`}
                    >
                      <blockquote className="relative z-20 text-4xl md:text-6xl font-serif italic leading-[1.1] text-gray-800 dark:text-white max-w-2xl text-left drop-shadow-2xl -mb-8 md:-mb-0 pointer-events-none">
                        &ldquo;{testimonial.quote}&rdquo;
                      </blockquote>

                      <div className="relative z-10 flex items-center gap-5 p-6 pr-10 md:-translate-y-8 shrink-0 mt-8 md:mt-0">
                        <div className="w-20 h-20 rounded-full overflow-hidden border border-gray-300 dark:border-white/20 shadow-lg shrink-0">
                          <img 
                            src={testimonial.image} 
                            alt={testimonial.author}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-left">
                          <p className="text-xl font-bold text-gray-800 dark:text-white leading-tight">{testimonial.author}</p>
                          <p className="text-xs font-mono text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-tight mt-1">{testimonial.role}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-center gap-1 mt-24 md:mt-20">
                  {testimonials.map((testimonial, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentTestimonialIndex(idx)}
                      className="py-4 px-2 group"
                      aria-label={`View ${testimonial.author}'s testimonial`}
                    >
                      <div className={`h-1 rounded-full transition-all duration-300 ${
                        idx === currentTestimonialIndex 
                          ? "bg-gray-400 dark:bg-gray-600 w-8" 
                          : "bg-gray-300 dark:bg-white/10 group-hover:bg-gray-400 dark:group-hover:bg-white/20 w-4"
                      }`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fresh Data Section */}
        <FreshDataSection 
          activeTab={freshDataActiveTab}
          onTabClick={handleFreshDataTabClick}
        />

        {/* Features Section */}
        <div className="relative z-20 bg-gray-100 dark:bg-[#0A0A10] py-24">
          <div className="absolute inset-0 opacity-5 dark:opacity-10" style={{ backgroundImage: "radial-gradient(#64748b 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-serif text-gray-800 dark:text-white mb-4">
                No-distraction Selling
              </h2>
              <p className="text-xl text-gray-500 italic">
                for Busy (or easily-distractable) People
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="group">
                <div className="relative h-full bg-white dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl p-8 hover:border-yellow-500/50 dark:hover:border-yellow-500/30 transition-all duration-300 shadow-sm">
                  <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Clock className="w-7 h-7 text-yellow-500 dark:text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">You're already wasting time</h3>
                  <p className="text-gray-500 leading-relaxed">
                    You should be sending simple emails to amazing people about how you are solving their problem.
                  </p>
                </div>
              </div>
              
              <div className="group">
                <div className="relative h-full bg-white dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl p-8 hover:border-yellow-500/50 dark:hover:border-yellow-500/30 transition-all duration-300 shadow-sm">
                  <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="w-7 h-7 text-yellow-500 dark:text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">Daily master-plan via email</h3>
                  <p className="text-gray-500 leading-relaxed">
                    Get all the details per contact - Click to open edit each email body or subject line and voila! <span className="text-gray-600 dark:text-gray-400">No login necessary.</span>
                  </p>
                </div>
              </div>
              
              <div className="group">
                <div className="relative h-full bg-white dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl p-8 hover:border-yellow-500/50 dark:hover:border-yellow-500/30 transition-all duration-300 shadow-sm">
                  <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Star className="w-7 h-7 text-yellow-500 dark:text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">Done in 5 Mins (or less)</h3>
                  <p className="text-gray-500 leading-relaxed">
                    And you won't even be distracted by your inbox, because we don't include that here.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-12">
              <Button 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold px-8 py-6 rounded-full text-lg transition-all duration-300 hover:scale-105"
              >
                Try it free (for 5 Minutes) <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* My Story Section */}
        <div className="relative z-20 py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-100 via-amber-50 to-amber-100 dark:from-[#0A0A10] dark:via-[#1a1612] dark:to-[#1f1915]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-200/20 to-amber-200/30 dark:via-amber-900/15 dark:to-amber-900/25" />
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-3xl mx-auto">
              <div className="p-8 md:p-12">
                <div className="flex items-center gap-3 mb-8">
                  <span className="text-4xl">🎮</span>
                  <h3 className="text-3xl md:text-5xl font-serif text-gray-800 dark:text-white">My Story</h3>
                </div>
                
                <div className="space-y-6 text-gray-600 dark:text-gray-400 leading-relaxed">
                  <p className="text-lg">
                    I do <span className="text-gray-800 dark:text-white italic">10 push-ups</span> before every shower and I realized that if I do 20, I will very soon stop doing them. But I will explain that later.
                  </p>
                  
                  <p>
                    In February, after spending an embarrassingly long amount of time creating a SaaS product with a couple of developers. It was finally time to start selling. But being easily distracted, I instead figured that I should create a tool that will make selling easier for me. <span className="text-gray-700 dark:text-gray-300 italic">(Of course!!! That's not procrastination. That's efficiency.)</span>
                  </p>
                  
                  <p>
                    I then got distracted in workflows to optimize the sales and lead generation. However, finally coming back to this, I decided to launch it because, who the hell wants to open their inbox (with all those clickbait newsletters and juicy news updates) and THEN start sending sales emails?!? <span className="text-gray-800 dark:text-white italic">That's like asking an alcoholic to work at a bar.</span> It's so distracting.
                  </p>
                  
                  <p>
                    The other thing I realized is that all the other lead generation services that popped-up when I was searching, were for people with <span className="text-gray-800 dark:text-white italic">big budgets</span> and usually needed someone to set it up for them.
                  </p>
                  
                  <p>
                    I wanted something for the <span className="text-gray-800 dark:text-white italic">small guy</span> that he could get running in less than 60 seconds. And that could be <span className="text-gray-800 dark:text-white italic">addictive and fun</span>.
                  </p>
                  
                  <p>
                    Now back to those pushups. Well, I realized that the harder the task is, the more likely that I will abandon it, and not make it habit. And I figured, if I can make the selling process much, much easier, but then put a limit so that people will not feel guilty leaving after <span className="text-gray-800 dark:text-white italic">five minutes</span>, that they might enjoy it more AND may make a habit out of it.
                  </p>
                  
                  <p className="text-gray-700 dark:text-gray-300 pt-4">
                    Umm,... yeah. <br />
                    Thanks for listening and enjoy. <br />
                    <span className="font-bold text-gray-800 dark:text-white">- Jon</span> 🐥
                  </p>
                </div>
                
                <div className="mt-10 text-center">
                  <Button 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold px-8 py-6 rounded-full text-lg transition-all duration-300 hover:scale-105"
                  >
                    Start a new habit today <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <FooterStealth />
      </div>

      <StealthOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}

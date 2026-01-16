import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Clock, Star, Zap } from "lucide-react";
import { useRegistrationModal } from "@/hooks/use-registration-modal";
import { useAuth } from "@/hooks/use-auth";
import { FooterStealth } from "@/components/footer-stealth";
import { DemoSimulationPlayer } from "@/features/demo-simulations";
import danThumb from "@/features/landing-stealth/assets/professional_headshot_of_dan_hartmann_thumb.jpg";
import sarahThumb from "@/features/landing-stealth/assets/professional_headshot_of_sarah_chen_thumb.jpg";
import alexThumb from "@/features/landing-stealth/assets/natural_outdoor_portrait_of_older_alex_rivera_with_beard_thumb.jpg";

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

export default function LandingSimple() {
  const { openModal, openModalForLogin, setRegistrationSuccessCallback } = useRegistrationModal();
  const { user } = useAuth();
  
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);
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
    const wasDark = root.classList.contains('dark');
    root.classList.add('dark');
    
    return () => {
      if (!wasDark) {
        root.classList.remove('dark');
      }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonialIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleGetStarted = () => {
    setRegistrationSuccessCallback(() => {
      window.location.href = "/app";
    });
    openModal();
  };

  const handleLogin = () => {
    setRegistrationSuccessCallback(() => {
      window.location.href = "/app";
    });
    openModalForLogin();
  };

  return (
    <div className="dark">
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

          {/* Login Link */}
          <div className="absolute top-4 right-6 md:top-6 md:right-10 z-30">
            <button 
              type="button"
              onClick={handleLogin}
              className="text-sm text-white/30 hover:text-white/60 transition-colors font-bold uppercase tracking-widest bg-transparent border-none cursor-pointer"
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
                <span className="block text-sm lg:text-base text-gray-400 font-medium tracking-widest uppercase mb-2 pl-1 font-mono opacity-80">
                  Founder-led
                </span>
                
                <h1 className="text-6xl lg:text-8xl font-bold leading-[0.9] tracking-normal text-gray-200 font-serif">
                  <span className="block mb-2">Find</span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-100 drop-shadow-[0_0_30px_rgba(250,204,21,0.3)]">
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
                  className="group relative h-16 overflow-hidden bg-gradient-to-r from-[#0A0A10] via-[#1a1a1f] to-[#0f0f14] text-gray-400 hover:text-black font-bold text-xl rounded-xl transition-colors duration-500 ease-in-out !cursor-pointer border border-white/10"
                >
                  <span 
                    className="absolute inset-0 opacity-0 rounded-xl group-hover:animate-[shimmer-fade_3s_ease-in-out_forwards,shimmer_15s_ease-in-out_infinite]"
                    style={{ 
                      backgroundImage: 'linear-gradient(90deg, #eab308 0%, #facc15 25%, #fef08a 50%, #facc15 75%, #eab308 100%)',
                      backgroundSize: '200% 100%'
                    }}
                  />
                  <span className="relative z-10 flex items-center group-hover:animate-[text-fade_3s_ease-in-out_forwards]">Start outreach with baby steps<ArrowRight className="ml-2 w-5 h-5" /></span>
                </Button>
                <div className="flex flex-wrap justify-center gap-4 text-gray-500 text-sm">
                  <span className="flex items-center gap-1 group"><Check className="w-4 h-4 text-gray-500 group-hover:text-green-500 transition-colors" /> No registration</span>
                  <span className="flex items-center gap-1 group"><Check className="w-4 h-4 text-gray-500 group-hover:text-green-500 transition-colors" /> No credit card</span>
                  <span className="flex items-center gap-1 group"><Check className="w-4 h-4 text-gray-500 group-hover:text-green-500 transition-colors" /> Pure awesome</span>
                </div>
              </div>
            </div>

            {/* Right Column - Demo Simulation */}
            <div className="hidden lg:block">
              <div className="relative">
                <div className="bg-[#1a1814] rounded-xl overflow-hidden shadow-2xl border border-white/10">
                  {/* Browser chrome header */}
                  <div className="flex items-center gap-3 px-4 py-2 bg-[#0f0e0c] border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md text-xs text-gray-500">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>app.5ducks.com</span>
                      </div>
                    </div>
                    <div className="w-[44px]" />
                  </div>
                  
                  <DemoSimulationPlayer
                    simulation="search-composer-demo"
                    responsive
                    aspectRatio={1}
                    showControls={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials Section - CSS Only */}
        <div ref={testimonialSectionRef} className="relative z-20 bg-[#0A0A10] border-t border-white/10 py-24">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
          
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
                      <blockquote className="relative z-20 text-4xl md:text-6xl font-serif italic leading-[1.1] text-white max-w-2xl text-left drop-shadow-2xl -mb-8 md:-mb-0 pointer-events-none">
                        &ldquo;{testimonial.quote}&rdquo;
                      </blockquote>

                      <div className="relative z-10 flex items-center gap-5 p-6 pr-10 md:-translate-y-8 shrink-0 mt-8 md:mt-0">
                        <div className="w-20 h-20 rounded-full overflow-hidden border border-white/20 shadow-lg shrink-0">
                          <img 
                            src={testimonial.image} 
                            alt={testimonial.author}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-left">
                          <p className="text-xl font-bold text-white leading-tight">{testimonial.author}</p>
                          <p className="text-xs font-mono text-gray-400 uppercase tracking-widest leading-tight mt-1">{testimonial.role}</p>
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
                          ? "bg-gray-600 w-8" 
                          : "bg-white/10 group-hover:bg-white/20 w-4"
                      }`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="relative z-20 bg-[#0A0A10] py-24">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-serif text-white mb-4">
                No-distraction Selling
              </h2>
              <p className="text-xl text-gray-500 italic">
                for Busy (or easily-distractable) People
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="group">
                <div className="relative h-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-yellow-500/30 transition-all duration-300">
                  <div className="w-14 h-14 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Clock className="w-7 h-7 text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">You're already wasting time</h3>
                  <p className="text-gray-500 leading-relaxed">
                    You should be sending simple emails to amazing people about how you are solving their problem.
                  </p>
                </div>
              </div>
              
              <div className="group">
                <div className="relative h-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-yellow-500/30 transition-all duration-300">
                  <div className="w-14 h-14 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="w-7 h-7 text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Daily master-plan via email</h3>
                  <p className="text-gray-500 leading-relaxed">
                    Get all the details per contact - Click to open edit each email body or subject line and voila! <span className="text-gray-400">No login necessary.</span>
                  </p>
                </div>
              </div>
              
              <div className="group">
                <div className="relative h-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-yellow-500/30 transition-all duration-300">
                  <div className="w-14 h-14 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Star className="w-7 h-7 text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Done in 5 Mins (or less)</h3>
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

        <FooterStealth />
      </div>
    </div>
  );
}

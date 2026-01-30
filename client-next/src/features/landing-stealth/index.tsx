import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Star, Zap } from "lucide-react";
import { useRegistrationModal } from "@/hooks/use-registration-modal";
import { useAuth } from "@/hooks/use-auth";
import { StealthOnboardingModal } from "./StealthOnboardingModal";
import { FooterStealth } from "@/components/footer-stealth";
import { HeroSectionDualSlider } from "./HeroSectionDualSlider";
import danThumb from "./assets/professional_headshot_of_dan_hartmann_thumb.jpg";
import sarahThumb from "./assets/professional_headshot_of_sarah_chen_thumb.jpg";
import mikeThumb from "./assets/professional_headshot_of_mike_ross_thumb.jpg";
import alexThumb from "./assets/natural_outdoor_portrait_of_older_alex_rivera_with_beard_thumb.jpg";

const FreshDataSection = lazy(() => import("./FreshDataSection").then(m => ({ default: m.FreshDataSection })));
const ShowcaseSection = lazy(() => import("./ShowcaseSection").then(m => ({ default: m.ShowcaseSection })));

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
    author: "Mike Polinski",
    role: "Startup Insider",
    image: mikeThumb
  }
];

export default function LandingStealth() {
  const { openModal, openModalForLogin, setRegistrationSuccessCallback, isOpen: isRegistrationModalOpen } = useRegistrationModal();
  const { user } = useAuth();
  
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [isSecretCodeFlow, setIsSecretCodeFlow] = useState(false);
  const [isTestimonialVisible, setIsTestimonialVisible] = useState(false);
  
  const testimonialSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isRootPath = window.location.pathname === '/';
    if (user && isRootPath && !showQuestionnaire && !isSecretCodeFlow) {
      window.location.href = "/app";
    }
  }, [user, showQuestionnaire, isSecretCodeFlow]);

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
    const section = testimonialSectionRef.current;
    if (!section) return;

    if (!('IntersectionObserver' in window)) {
      setIsTestimonialVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsTestimonialVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isTestimonialVisible) return;
    
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const testimonialInterval = setInterval(() => {
      setCurrentTestimonialIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(testimonialInterval);
  }, [isTestimonialVisible]);

  const handleOnboardingComplete = () => {
    setShowQuestionnaire(false);
    setIsSecretCodeFlow(false);
    window.location.href = "/app";
  };

  const handleBeginSecretCodeFlow = () => {
    setIsSecretCodeFlow(true);
  };

  const handleOpenLoginModal = () => {
    setRegistrationSuccessCallback(() => {
      window.location.href = "/app";
    });
    openModalForLogin();
  };

  const handleOpenSecretCodeRegistration = () => {
    setRegistrationSuccessCallback((isNewUser) => {
      if (isNewUser === true) {
        setShowQuestionnaire(true);
      } else {
        setIsSecretCodeFlow(false);
        window.location.href = "/app";
      }
    });
    openModal();
  };

  const handleCloseQuestionnaire = () => {
    setShowQuestionnaire(false);
    setIsSecretCodeFlow(false);
  };

  return (
    <div className="dark">
      <div className="min-h-screen w-full bg-background overflow-x-hidden relative flex flex-col">
        <HeroSectionDualSlider
          onBeginSecretCodeFlow={handleBeginSecretCodeFlow}
          onOpenLoginModal={handleOpenLoginModal}
          onOpenSecretCodeRegistration={handleOpenSecretCodeRegistration}
          isRegistrationModalOpen={isRegistrationModalOpen}
          showQuestionnaire={showQuestionnaire}
        />

        <div ref={testimonialSectionRef} className="relative z-20 bg-[#0A0A10] border-t border-white/10 py-24">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] max-w-5xl -z-0 pointer-events-none">
            <motion.div 
              animate={{ 
                opacity: [0.1, 0.3, 0.1],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 blur-[100px] rounded-full" 
            />
          </div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                
                <div className="min-h-[250px] flex flex-col justify-center items-center relative z-10">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentTestimonialIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4 }}
                      className="w-full"
                    >
                      <div className="flex flex-col md:flex-row items-end justify-center md:pl-20">
                        
                        <blockquote className="relative z-20 text-4xl md:text-6xl font-serif italic leading-[1.1] text-white max-w-2xl text-left drop-shadow-2xl -mb-8 md:-mb-0 pointer-events-none">
                          &ldquo;{testimonials[currentTestimonialIndex].quote}&rdquo;
                        </blockquote>

                        <div className="relative z-10 flex items-center gap-5 p-6 pr-10 md:-translate-y-8 shrink-0 mt-8 md:mt-0">
                          <div className="w-20 h-20 rounded-full overflow-hidden border border-white/20 shadow-lg shrink-0">
                            <img 
                              src={testimonials[currentTestimonialIndex].image} 
                              alt={testimonials[currentTestimonialIndex].author}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="text-left">
                            <p className="text-xl font-bold text-white leading-tight">{testimonials[currentTestimonialIndex].author}</p>
                            <p className="text-xs font-mono text-gray-400 uppercase tracking-widest leading-tight mt-1">{testimonials[currentTestimonialIndex].role}</p>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
                
                <div className="flex justify-center gap-1 mt-24 md:mt-20">
                  {testimonials.map((testimonial, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentTestimonialIndex(idx)}
                      className="py-4 px-2 group"
                      data-testid={`button-testimonial-${idx}`}
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

        <Suspense fallback={<div className="bg-[#0A0A10] py-24 min-h-[600px]" />}>
          <FreshDataSection />
        </Suspense>

        <Suspense fallback={<div className="bg-[#0A0A10] py-24 min-h-[700px]" />}>
          <ShowcaseSection />
        </Suspense>

        <div className="relative z-20 py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A10] via-[#1a1612] to-[#1f1915]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-900/15 to-amber-900/25" />
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="p-8 md:p-12"
              >
                <div className="flex items-center gap-3 mb-8">
                  <span className="text-4xl">🎮</span>
                  <h3 className="text-3xl md:text-5xl font-serif text-white">My Story</h3>
                </div>
                
                <div className="space-y-6 text-gray-400 leading-relaxed">
                  <p className="text-lg">
                    I do <span className="text-white italic">10 push-ups</span> before every shower and I realized that if I do 20, I will very soon stop doing them. But I will explain that later.
                  </p>
                  
                  <p>
                    In February, after spending an embarrassingly long amount of time creating a SaaS product with a couple of developers. It was finally time to start selling. But being easily distracted, I instead figured that I should create a tool that will make selling easier for me. <span className="text-gray-300 italic">(Of course!!! That's not procrastination. That's efficiency.)</span>
                  </p>
                  
                  <p>
                    I then got distracted in workflows to optimize the sales and lead generation. However, finally coming back to this, I decided to launch it because, who the hell wants to open their inbox (with all those clickbait newsletters and juicy news updates) and THEN start sending sales emails?!? <span className="text-white italic">That's like asking an alcoholic to work at a bar.</span> It's so distracting.
                  </p>
                  
                  <p>
                    The other thing I realized is that all the other lead generation services that popped-up when I was searching, were for people with <span className="text-white italic">big budgets</span> and usually needed someone to set it up for them.
                  </p>
                  
                  <p>
                    I wanted something for the <span className="text-white italic">small guy</span> that he could get running in less than 60 seconds. And that could be <span className="text-white italic">addictive and fun</span>.
                  </p>
                  
                  <p>
                    Now back to those pushups. Well, I realized that the harder the task is, the more likely that I will abandon it, and not make it habit. And I figured, if I can make the selling process much, much easier, but then put a limit so that people will not feel guilty leaving after <span className="text-white italic">five minutes</span>, that they might enjoy it more AND may make a habit out of it.
                  </p>
                  
                  <p className="text-gray-300 pt-4">
                    Umm,... yeah. <br />
                    Thanks for listening and enjoy. <br />
                    <span className="font-bold text-white">- Jon</span> 🐥
                  </p>
                </div>
                
                <div className="mt-10 text-center">
                  <Button 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold px-8 py-6 rounded-full text-lg"
                    data-testid="button-start-habit"
                  >
                    Start a new habit today <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <div className="relative z-20 bg-[#0A0A10] py-24">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          
          <div className="container mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-serif text-white mb-4">
                No-distraction Selling
              </h2>
              <p className="text-xl text-gray-500 italic">
                for Busy (or easily-distractable) People
              </p>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className="relative h-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-yellow-500/30 transition-all duration-300">
                  <div className="w-14 h-14 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Clock className="w-7 h-7 text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">You're already wasting time</h3>
                  <p className="text-gray-500 leading-relaxed">
                    You should be sending simple emails to amazing people about how you are solving their problem.
                  </p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className="relative h-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-yellow-500/30 transition-all duration-300">
                  <div className="w-14 h-14 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="w-7 h-7 text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Daily master-plan via email</h3>
                  <p className="text-gray-500 leading-relaxed">
                    Get all the details per contact - Click to open edit each email body or subject line and voila! <span className="text-gray-400">No login necessary.</span>
                  </p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className="relative h-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-yellow-500/30 transition-all duration-300">
                  <div className="w-14 h-14 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Star className="w-7 h-7 text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Done in 5 Mins (or less)</h3>
                  <p className="text-gray-500 leading-relaxed">
                    And you won't even be distracted by your inbox, because we don't include that here.
                  </p>
                </div>
              </motion.div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="text-center mt-12"
            >
              <Button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold px-8 py-6 rounded-full text-lg"
                data-testid="button-try-free"
              >
                Try it free (for 5 Minutes) <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        </div>

        <FooterStealth />

        <StealthOnboardingModal
          isOpen={showQuestionnaire}
          onClose={handleCloseQuestionnaire}
          onComplete={handleOnboardingComplete}
        />
      </div>
    </div>
  );
}

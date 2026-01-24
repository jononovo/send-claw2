import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Zap, Crown, Moon, Sun, Sparkles, Loader2, Users } from "lucide-react";
import { useRegistrationModal } from "@/hooks/use-registration-modal";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FooterStealth } from "@/components/footer-stealth";
import { Link } from "wouter";
import { usePricingConfig, getPromoCodeFromUrl } from "@/features/pricing-promos";

const WAITLIST_STORAGE_KEY = '5ducks_waitlist_plans';

function getStoredWaitlistPlans(): string[] {
  try {
    const stored = localStorage.getItem(WAITLIST_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveWaitlistPlans(plans: string[]) {
  try {
    localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(plans));
  } catch {}
}

export default function PricingPage() {
  const { openModal, openModalForLogin, setRegistrationSuccessCallback } = useRegistrationModal();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [waitlistPlans, setWaitlistPlans] = useState<string[]>(() => getStoredWaitlistPlans());
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const originalThemeRef = useRef<boolean | null>(null);
  
  const promoCode = useMemo(() => getPromoCodeFromUrl(), []);
  const { data: pricingConfig, isLoading: isConfigLoading } = usePricingConfig(promoCode);
  const plans = pricingConfig?.plans || [];

  useEffect(() => {
    const root = document.documentElement;
    
    if (originalThemeRef.current === null) {
      originalThemeRef.current = root.classList.contains('dark');
    }
    
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    return () => {
      if (originalThemeRef.current !== null) {
        if (originalThemeRef.current) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };
  }, [isDarkMode]);

  const handleLogin = () => {
    setRegistrationSuccessCallback(() => {
      window.location.href = "/app";
    });
    openModalForLogin();
  };

  const handlePlanSelect = async (planId: string) => {
    if (planId === 'free') {
      window.location.href = '/app';
      return;
    }

    if (planId === 'duckin-awesome') {
      if (!waitlistPlans.includes(planId)) {
        const newWaitlistPlans = [...waitlistPlans, planId];
        setWaitlistPlans(newWaitlistPlans);
        saveWaitlistPlans(newWaitlistPlans);
        toast({
          title: "Added to Waitlist",
          description: "We'll notify you when Mama Duck becomes available!",
        });
      }
      return;
    }

    if (planId === 'ugly-duckling') {
      if (!user) {
        setRegistrationSuccessCallback(() => {
          handleCheckout(planId);
        });
        openModal();
        return;
      }
      await handleCheckout(planId);
    }
  };

  const handleCheckout = async (planId: string) => {
    try {
      setIsLoading(planId);
      const response = await apiRequest('POST', '/api/stripe/create-checkout-session', {
        planId
      });
      
      const data = await response.json();
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      toast({
        title: "Checkout Error",
        description: error.message || "Failed to start checkout process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div>
      <div className="min-h-screen w-full bg-background overflow-x-hidden relative flex flex-col">
        
        <div className="absolute top-6 left-6 md:top-10 md:left-10 z-30">
          <Link href="/">
            <div className="font-bold flex items-center text-3xl cursor-pointer">
              <div className="flex items-end ml-3">
                <span className="text-3xl opacity-80">🐥</span>
                <span className="text-2xl md:inline hidden opacity-60">🥚🥚🥚🥚</span>
              </div>
            </div>
          </Link>
        </div>

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

        <div className="relative z-10 pt-32 pb-24">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-background" />
          </div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <h1 className="text-5xl lg:text-7xl font-bold leading-[0.9] tracking-normal text-gray-800 dark:text-gray-200 font-serif mb-6">
                Pick Your
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-600 dark:from-yellow-400 dark:to-yellow-100 drop-shadow-[0_0_30px_rgba(250,204,21,0.3)]">
                  Adventure
                </span>
              </h1>
            </div>

            {isConfigLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
              </div>
            ) : (
              <div className={`grid gap-6 max-w-5xl mx-auto ${
              plans.length === 1 ? 'md:grid-cols-1 max-w-md' :
              plans.length === 2 ? 'md:grid-cols-2 max-w-3xl' :
              'md:grid-cols-3'
            }`}>
              {plans.map((plan) => {
                const isOnWaitlist = waitlistPlans.includes(plan.id);
                const isPlanLoading = isLoading === plan.id;
                
                return (
                  <div
                    key={plan.id}
                    className={`relative bg-white dark:bg-white/5 backdrop-blur-sm border rounded-2xl p-8 transition-all duration-300 ${
                      plan.highlight 
                        ? 'border-yellow-500/50 dark:border-yellow-500/30 shadow-lg shadow-yellow-500/10' 
                        : 'border-gray-200 dark:border-white/10 hover:border-yellow-500/30'
                    }`}
                  >
                    {plan.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black text-xs font-bold px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}
                    
                    {plan.comingSoon && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 text-xs font-bold px-3 py-1 rounded-full">
                          Coming Soon
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-4 ${
                        plan.highlight 
                          ? 'bg-yellow-100 dark:bg-yellow-500/20' 
                          : 'bg-gray-100 dark:bg-white/10'
                      }`}>
                        {plan.id === 'free' && <Sparkles className={`w-4 h-4 ${plan.highlight ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`} />}
                        {plan.id === 'ugly-duckling' && <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />}
                        {plan.id === 'duckin-awesome' && <Crown className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                        {plan.id === 'the-flock' && <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                      </div>
                      
                      <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{plan.name}</h3>
                      <p className="text-gray-500 text-sm">{plan.description}</p>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-gray-800 dark:text-white">
                          ${plan.price}
                        </span>
                        {plan.price > 0 && (
                          <span className="text-gray-500 text-sm">/month</span>
                        )}
                        {plan.price === 0 && (
                          <span className="text-gray-500 text-sm">forever</span>
                        )}
                      </div>
                      
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{plan.credits.toLocaleString()} credits</span>
                        {plan.bonus > 0 && (
                          <span className="text-green-600 dark:text-green-400 font-medium"> + {plan.bonus.toLocaleString()} bonus</span>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                          <span className="text-gray-600 dark:text-gray-400 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handlePlanSelect(plan.id)}
                      disabled={isPlanLoading || isOnWaitlist}
                      className={`w-full font-bold py-6 rounded-xl text-base transition-all duration-300 ${
                        plan.highlight
                          ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-400 hover:to-yellow-500 text-black'
                          : plan.comingSoon
                            ? 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300'
                            : 'bg-gray-800 dark:bg-white hover:bg-gray-900 dark:hover:bg-gray-100 text-white dark:text-black'
                      }`}
                    >
                      {isPlanLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </span>
                      ) : isOnWaitlist ? (
                        'On Waitlist'
                      ) : (
                        <>
                          {plan.cta}
                          {!plan.comingSoon && <ArrowRight className="ml-2 w-5 h-5" />}
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
            )}

            <div className="text-center mt-16">
              <p className="text-gray-500 text-sm mb-2">
                All plans auto-renew monthly. Cancel anytime.
              </p>
              <p className="text-gray-400 text-xs">
                Questions? <a href="mailto:support@5ducks.com" className="text-yellow-500 hover:text-yellow-400 underline">Contact us</a>
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-20 bg-gray-50 dark:bg-[#0A0A10] py-24 border-t border-gray-200 dark:border-white/5">
          <div className="absolute inset-0 opacity-5 dark:opacity-10" style={{ backgroundImage: "radial-gradient(#64748b 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-serif text-gray-800 dark:text-white mb-4">
                What Are Credits?
              </h2>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                Credits power every action in 5Ducks
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 text-center">
                <div className="text-3xl font-bold text-yellow-500 mb-2">~5</div>
                <div className="text-gray-600 dark:text-gray-400 text-sm">Credits per company search</div>
              </div>
              
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 text-center">
                <div className="text-3xl font-bold text-yellow-500 mb-2">~3</div>
                <div className="text-gray-600 dark:text-gray-400 text-sm">Credits per contact found</div>
              </div>
              
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 text-center">
                <div className="text-3xl font-bold text-yellow-500 mb-2">~2</div>
                <div className="text-gray-600 dark:text-gray-400 text-sm">Credits per email search</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-20 py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-100 via-amber-50 to-amber-100 dark:from-[#0A0A10] dark:via-[#1a1612] dark:to-[#1f1915]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-200/20 to-amber-200/30 dark:via-amber-900/15 dark:to-amber-900/25" />
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-serif text-gray-800 dark:text-white mb-6">
                Ready to find customers?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-10">
                Start with 190 free credits. No credit card required.
              </p>
              
              <Button 
                onClick={() => window.location.href = '/app'}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold px-8 py-6 rounded-full text-lg transition-all duration-300 hover:scale-105"
              >
                Start Free Today <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        <FooterStealth />
      </div>
    </div>
  );
}

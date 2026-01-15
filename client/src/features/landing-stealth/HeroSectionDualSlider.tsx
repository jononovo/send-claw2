import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Map, X, Unlock, Loader2, User, Mail } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useToast } from "@/hooks/use-toast";
import { fireUnlockConfetti } from "@/features/animations";
import { DemoSimulationPlayer } from "@/features/demo-simulations";
import { logConversionEvent } from "@/features/attribution";
import duckImage from "./assets/3d_cute_duckling_mascot_edited.webp";
import duckImageMobile from "./assets/3d_cute_duckling_mascot_edited-400w.webp";
import bgImage from "./assets/abstract_3d_sales_background_with_envelopes_and_charts.webp";
import salesImage from "./assets/sales_meeting_v9_transparent.webp";
import dealFlowImage from "./assets/deal_flow_v6_transparent.webp";
import leadsImage from "./assets/email-notification-no-bg-crop.webp";
import outreachImage from "./assets/outreach_campaign_v9_transparent.webp";
import danThumb from "./assets/professional_headshot_of_dan_hartmann_thumb.jpg";
import sarahThumb from "./assets/professional_headshot_of_sarah_chen_thumb.jpg";
import mikeThumb from "./assets/professional_headshot_of_mike_ross_thumb.jpg";

interface ApplyFormData {
  name: string;
  email: string;
}

interface HeroSectionDualSliderProps {
  onBeginSecretCodeFlow: () => void;
  onOpenLoginModal: () => void;
  onOpenSecretCodeRegistration: () => void;
  isRegistrationModalOpen: boolean;
  showQuestionnaire: boolean;
}

function getPlayerCount(atDate?: Date): number {
  const BASE_COUNT = 1248;
  const BASE_DATE_EST = new Date('2026-01-06T09:00:00-05:00');
  
  const targetDate = atDate || new Date();
  
  if (targetDate < BASE_DATE_EST) return BASE_COUNT;
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  const parts = formatter.formatToParts(targetDate);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
  const estHour = parseInt(getPart('hour'), 10);
  const estMinute = parseInt(getPart('minute'), 10);
  const estMonth = parseInt(getPart('month'), 10);
  const estDay = parseInt(getPart('day'), 10);
  const estYear = parseInt(getPart('year'), 10);
  
  const baseParts = formatter.formatToParts(BASE_DATE_EST);
  const getBasePart = (type: string) => baseParts.find(p => p.type === type)?.value || '0';
  const baseMonth = parseInt(getBasePart('month'), 10);
  const baseDay = parseInt(getBasePart('day'), 10);
  const baseYear = parseInt(getBasePart('year'), 10);
  
  const estTodayUTC = Date.UTC(estYear, estMonth - 1, estDay);
  const estBaseDayUTC = Date.UTC(baseYear, baseMonth - 1, baseDay);
  const msPerDay = 24 * 60 * 60 * 1000;
  const fullDaysPassed = Math.floor((estTodayUTC - estBaseDayUTC) / msPerDay);
  
  let totalIncrements = Math.max(0, fullDaysPassed) * 24;
  
  if (estHour >= 9 && estHour < 17) {
    const minutesSince9AM = (estHour - 9) * 60 + estMinute;
    totalIncrements += Math.floor(minutesSince9AM / 20);
  } else if (estHour >= 17) {
    totalIncrements += 24;
  }
  
  return BASE_COUNT + totalIncrements;
}

function getNewPlayersLast8Hours(): number {
  const now = new Date();
  const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);
  return Math.max(0, getPlayerCount(now) - getPlayerCount(eightHoursAgo));
}

const LOADING_MESSAGES = [
  "Unlocking sales processes...",
  "Loading registration portal...",
];

const content = [
  { 
    text: "Sales", 
    component: (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="text-4xl mb-4">🤝</div>
        <h3 className="text-2xl font-bold text-white mb-2">Close More Deals</h3>
        <p className="text-sm text-gray-400">Automate your outreach and focus on closing.</p>
      </div>
    ), 
    label: "Meeting Booked",
    rotation: -3
  },
  { 
    text: "Sales", 
    image: salesImage, 
    label: "Meeting Booked", 
    rotation: 2, 
    duration: 4000
  },
  { 
    text: "Workflow", 
    type: "demo",
    label: "See it in Action",
    rotation: 0,
    duration: 45000,
    containerClass: "!bg-transparent !border-none !shadow-none !backdrop-blur-none !p-0"
  },
  { 
    text: "Deal-flow", 
    image: dealFlowImage, 
    label: "Demo Call", 
    rotation: -2, 
    duration: 4000,
    containerClass: "!bg-transparent !border-none !shadow-none !backdrop-blur-none",
    imageClass: "mix-blend-screen scale-125 object-contain"
  },
  { 
    text: "Leads", 
    image: leadsImage, 
    label: "New Reply", 
    rotation: 4, 
    duration: 4000,
    containerClass: "!bg-transparent !border-none !shadow-none !backdrop-blur-none",
    imageClass: "mix-blend-screen scale-125 object-contain"
  },
  { 
    text: "Outreach", 
    image: outreachImage, 
    label: "Campaign Sent", 
    rotation: -3, 
    duration: 4000,
    containerClass: "!bg-transparent !border-none !shadow-none !backdrop-blur-none",
    imageClass: "mix-blend-screen scale-125 object-contain"
  },
  { text: "Sales", label: "Enter Code", duration: 30000 },
];

export function HeroSectionDualSlider({
  onBeginSecretCodeFlow,
  onOpenLoginModal,
  onOpenSecretCodeRegistration,
  isRegistrationModalOpen,
  showQuestionnaire,
}: HeroSectionDualSliderProps) {
  const { toast } = useToast();
  
  const [code, setCode] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHoveringDuck, setIsHoveringDuck] = useState(false);
  const [isQuestHovered, setIsQuestHovered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showAccessGranted, setShowAccessGranted] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyFormData, setApplyFormData] = useState<ApplyFormData>({
    name: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const [isDuckLoaded, setIsDuckLoaded] = useState(false);
  const [shouldRenderDemo, setShouldRenderDemo] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const triggerUnlockConfetti = () => {
    fireUnlockConfetti(buttonRef.current);
  };

  useEffect(() => {
    if (currentIndex === 2 && !shouldRenderDemo) {
      setShouldRenderDemo(true);
    }
  }, [currentIndex, shouldRenderDemo]);

  useEffect(() => {
    if (currentIndex === 6) return;
    if (showAccessGranted) return;
    if (showQuestionnaire) return;
    if (isRegistrationModalOpen) return;
    if (showApplyForm) return;
    
    const item = content[currentIndex];
    const duration = (item as any).duration || 6000;
    
    let slideTimeout: ReturnType<typeof setTimeout> | undefined;
    
    const deferralTimeout = setTimeout(() => {
      slideTimeout = setTimeout(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          if (next >= 6) return 0;
          return next;
        });
      }, duration);
    }, 150);

    return () => {
      clearTimeout(deferralTimeout);
      if (slideTimeout) clearTimeout(slideTimeout);
    };
  }, [currentIndex, showAccessGranted, showQuestionnaire, isRegistrationModalOpen, showApplyForm]);

  const handleQuack = () => {
    const validCodes = ["quack", "charlie"];
    if (validCodes.includes(code.toLowerCase())) {
      window.dataLayer?.push({ event: 'secret_code_unlock' });
      logConversionEvent('secret_code_unlock').catch(() => {});
      
      onBeginSecretCodeFlow();
      setIsUnlocking(true);
      triggerUnlockConfetti();
      
      setTimeout(() => {
        setIsUnlocking(false);
        setShowAccessGranted(true);
        setLoadingMessageIndex(0);
        
        setTimeout(() => setLoadingMessageIndex(1), 1000);
        
        setTimeout(() => {
          setShowAccessGranted(false);
          setCurrentIndex(0);
          localStorage.setItem('accessCode', code.toLowerCase());
          setCode("");
          onOpenSecretCodeRegistration();
        }, 2000);
      }, 600);
    } else {
      toast({
        title: "WRONG CODE 🚫",
        description: "That's not the secret password!",
        variant: "destructive",
        className: "font-heading font-bold",
      });
    }
  };

  const handleCloseOverlay = () => {
    setCurrentIndex(0);
    setShowApplyForm(false);
    setCode("");
  };

  const handleApplySubmit = async () => {
    if (!applyFormData.name || !applyFormData.email) {
      toast({
        title: "Please fill in your details",
        description: "We need your name and email to continue.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/access-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: applyFormData.name,
          email: applyFormData.email
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        toast({
          title: "Oops!",
          description: data.error || "Something went wrong. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      window.dataLayer?.push({ event: 'access_code_requested' });
      logConversionEvent('access_code_requested').catch(() => {});
      
      toast({
        title: "Application Received! 🎉",
        description: "Check your email for confirmation. We'll send your code soon!",
        className: "bg-primary text-primary-foreground border-none font-heading font-bold",
      });
      setShowApplyForm(false);
      setApplyFormData({ name: "", email: "" });
      setCurrentIndex(0);
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Please check your internet and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative z-10 min-h-[90vh] flex flex-col justify-center">
      <div className="absolute top-6 left-6 md:top-10 md:left-10 z-30">
        <div className="font-bold flex items-center text-3xl">
          <div className="flex items-end ml-3">
            <span className="text-3xl opacity-80">🐥</span>
            <span className="text-2xl md:inline hidden opacity-60">🥚🥚🥚🥚</span>
          </div>
        </div>
      </div>

      <div className="absolute top-10 left-0 right-0 flex justify-center z-20">
        <span className="px-4 py-1.5 rounded-full bg-white/5 text-white/20 text-xs font-bold uppercase tracking-widest border border-white/5 backdrop-blur-md">
          Stealth Mode
        </span>
      </div>

      <div className="absolute top-4 right-6 md:top-6 md:right-10 z-30">
        <button 
          type="button"
          onClick={onOpenLoginModal}
          className="text-sm text-white/10 hover:text-white/30 transition-colors font-bold uppercase tracking-widest bg-transparent border-none cursor-pointer" 
          data-testid="link-login"
        >
          Login
        </button>
      </div>

      <div className="absolute inset-0 z-0">
        {isDuckLoaded && (
          <div 
            className="absolute inset-0 opacity-40 mix-blend-screen bg-cover bg-center"
            style={{ backgroundImage: `url(${bgImage})` }}
            aria-hidden="true"
          />
        )}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>

      <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center py-20">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col gap-8 max-w-xl"
        >
          <div className="space-y-4 relative pt-12 lg:pt-24">
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.8, y: 0 }}
              transition={{ duration: 0.5, delay: 0 }}
              className="block text-sm lg:text-base text-gray-400 font-medium tracking-widest uppercase mb-2 pl-1 font-mono"
            >
              Founder-led
            </motion.span>
            <h1 className="text-6xl lg:text-8xl font-bold leading-[0.9] tracking-normal text-gray-200 font-serif h-[1.8em] relative z-20">
              <span className="block mb-2">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={content[currentIndex].text}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="inline-block"
                  >
                    {content[currentIndex].text}.
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-100 drop-shadow-[0_0_30px_rgba(250,204,21,0.3)]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentIndex >= 3 ? "simplified" : "gamified"}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="inline-block"
                  >
                    {currentIndex >= 3 ? "Simplified." : "Gamified."}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>

            <div className="absolute -top-12 -right-4 md:-right-24 lg:-right-32 w-48 h-32 md:w-64 md:h-40 pointer-events-none z-10 hidden sm:block">
              <AnimatePresence mode="wait">
                {currentIndex === 0 && (
                  <motion.div
                    key="visual-context-left"
                    layoutId="visual-context"
                    initial={{ opacity: 0, x: -20, scale: 0.9, rotate: -5 }}
                    animate={{ opacity: 1, x: 0, scale: 1, rotate: 3 }}
                    exit={{ opacity: 0, x: 20, scale: 0.9, rotate: 10 }}
                    transition={{ duration: 0.6, ease: "circOut" }}
                    className="relative w-full h-full"
                  >
                    <div className="relative w-full h-full rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black/50 backdrop-blur-sm">
                      {content[currentIndex].component}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.4 }}
              className="text-xl text-muted-foreground leading-relaxed max-w-md font-medium relative z-20 pt-8"
            >
              <TooltipProvider delayDuration={1500}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span 
                      className="inline-flex items-center gap-2 cursor-pointer"
                      onMouseEnter={() => setIsQuestHovered(true)}
                      onMouseLeave={() => setIsQuestHovered(false)}
                      style={{ perspective: "600px" }}
                    >
                      <motion.span
                        animate={isQuestHovered ? {
                          scale: [1, 1.2, 1],
                          rotate: [0, 15, 0]
                        } : {}}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      >
                        <Map className="w-5 h-5" />
                      </motion.span>
                      <motion.span
                        animate={{ 
                          color: isQuestHovered ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.7)",
                          textShadow: isQuestHovered ? "0 0 8px rgba(255,255,255,0.3)" : "none"
                        }}
                        transition={{ duration: 0.2 }}
                        className="cursor-pointer"
                      >
                        Quest 1:
                      </motion.span>
                      <span className="inline-flex items-center overflow-hidden">
                        <motion.span
                          className="inline-flex text-muted-foreground/70"
                          initial="hidden"
                          animate={isQuestHovered ? "revealed" : "hidden"}
                          variants={{
                            hidden: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
                            revealed: { transition: { staggerChildren: 0.025, delayChildren: 0.05 } }
                          }}
                        >
                          {"Find your target customers".split("").map((char, i) => (
                            <motion.span
                              key={i}
                              className="inline-block"
                              variants={{
                                hidden: { x: -8, opacity: 0, scale: 0.8 },
                                revealed: { x: 0, opacity: 1, scale: 1 }
                              }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                            >
                              {char === " " ? "\u00A0" : char}
                            </motion.span>
                          ))}
                        </motion.span>
                      </span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs bg-gray-900 text-white border-gray-700">
                    <p>Don't worry "Fluffy" 🐥 has AI search for this - She's incredible!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          </div>

          {currentIndex !== 6 && (
            <div className="flex flex-col gap-4 w-full max-w-md mt-4">
              <div className="relative flex-1 group/input flex items-center">
                <Input 
                  type="text" 
                  placeholder="ENTER_SECRET_CODE" 
                  className="h-16 bg-black/40 backdrop-blur-md border-none text-xl md:text-2xl pl-8 pr-16 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-white/40 font-code tracking-widest uppercase text-white w-full relative z-10 transition-all duration-500 text-center"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && code.length >= 5 && handleQuack()}
                  onFocus={() => setCurrentIndex(6)}
                  data-testid="input-secret-code"
                />

                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/60 group-focus-within/input:border-white transition-colors pointer-events-none z-10" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/60 group-focus-within/input:border-white transition-colors pointer-events-none z-10" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/60 group-focus-within/input:border-white transition-colors pointer-events-none z-10" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/60 group-focus-within/input:border-white transition-colors pointer-events-none z-10" />
                
                <AnimatePresence>
                  {code.length >= 5 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="absolute right-3 z-20 p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors flex items-center justify-center"
                      onClick={handleQuack}
                      data-testid="button-quack"
                    >
                      <ArrowRight className="w-5 h-5 text-white" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {isMounted && currentIndex === 6 && !showQuestionnaire && createPortal(
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                transition={{ duration: 0.5 }}
              />
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                onClick={handleCloseOverlay}
                className="fixed top-6 right-6 z-50 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors cursor-pointer"
                data-testid="button-close-overlay"
              >
                <X className="w-6 h-6 text-white/70 hover:text-white" />
              </motion.button>
              
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-w-md w-full scale-110 shadow-2xl flex flex-col gap-4 px-4">
                <AnimatePresence mode="wait">
                  {!showAccessGranted && !showApplyForm && (
                    <motion.div 
                      key="code-input"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="w-full"
                    >
                      <div className="relative flex-1 group/input flex items-center">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ 
                            opacity: isUnlocking ? 0.8 : 1,
                            scale: isUnlocking ? 1.2 : 1,
                          }}
                          className={`absolute inset-0 blur-xl rounded-lg z-0 transition-colors duration-300 ${
                            isUnlocking ? 'bg-yellow-500/40' : 'bg-blue-500/20'
                          }`}
                        />
                        
                        <Input 
                          type="text" 
                          placeholder="ENTER_SECRET_CODE" 
                          className={`h-16 bg-black border-none text-xl md:text-2xl pl-8 pr-16 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-white/40 font-code tracking-widest uppercase text-white w-full relative z-10 transition-all duration-500 text-center ${
                            isUnlocking 
                              ? 'shadow-[0_0_40px_rgba(250,204,21,0.5)]' 
                              : 'shadow-[0_0_30px_rgba(59,130,246,0.3)]'
                          }`}
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && code.length >= 5 && handleQuack()}
                          autoFocus
                          disabled={isUnlocking}
                          data-testid="input-secret-code-floating"
                        />

                        <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 transition-colors pointer-events-none z-10 ${isUnlocking ? 'border-yellow-400' : 'border-white/60 group-focus-within/input:border-white'}`} />
                        <div className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 transition-colors pointer-events-none z-10 ${isUnlocking ? 'border-yellow-400' : 'border-white/60 group-focus-within/input:border-white'}`} />
                        <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 transition-colors pointer-events-none z-10 ${isUnlocking ? 'border-yellow-400' : 'border-white/60 group-focus-within/input:border-white'}`} />
                        <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 transition-colors pointer-events-none z-10 ${isUnlocking ? 'border-yellow-400' : 'border-white/60 group-focus-within/input:border-white'}`} />
                        
                        <AnimatePresence>
                          {code.length >= 5 && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ 
                                opacity: 1, 
                                scale: isUnlocking ? [1, 1.3, 1] : 1,
                              }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ type: "spring", stiffness: 300, damping: 25 }}
                              className="absolute right-3 z-20"
                            >
                              <Button 
                                ref={buttonRef}
                                size="icon" 
                                className={`h-10 w-10 rounded-md text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center ${
                                  isUnlocking 
                                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500 shadow-[0_0_20px_rgba(250,204,21,0.6)]' 
                                    : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                                onClick={handleQuack}
                                disabled={isUnlocking}
                                data-testid="button-quack-floating"
                              >
                                {isUnlocking ? (
                                  <motion.div
                                    animate={{ rotate: [0, 360] }}
                                    transition={{ duration: 0.5 }}
                                  >
                                    <Unlock className="w-5 h-5" />
                                  </motion.div>
                                ) : (
                                  <ArrowRight className="w-5 h-5" />
                                )}
                              </Button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isUnlocking && !showAccessGranted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`w-full text-center ${showApplyForm ? '' : 'mt-24'}`}
                  >
                    {!showApplyForm && (
                      <Button 
                        variant="link" 
                        className="text-white/60 hover:text-white transition-colors font-code uppercase tracking-widest text-sm no-underline hover:no-underline cursor-pointer" 
                        onClick={() => setShowApplyForm(true)}
                        data-testid="link-apply-code"
                      >
                        Don't have a code? Request one <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                    
                    <AnimatePresence>
                      {showApplyForm && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 200, damping: 25 }}
                          className="overflow-hidden"
                        >
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 via-cyan-500/5 to-transparent blur-2xl rounded-lg" />
                            
                            <div className="relative space-y-4 p-6 bg-gray-900/60 backdrop-blur-md rounded-lg border border-white/15 text-left">
                              <p className="text-xl text-white/70 text-center mb-4 font-code uppercase tracking-widest">
                                REQUEST EARLY ACCESS
                              </p>
                              
                              <div>
                                <div className="relative">
                                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                  <Input
                                    type="text"
                                    placeholder="Enter your name"
                                    value={applyFormData.name}
                                    onChange={(e) => setApplyFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="h-12 bg-black/60 border-white/10 pl-11 text-white placeholder:text-gray-500 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50"
                                    data-testid="input-apply-name"
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                  <Input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={applyFormData.email}
                                    onChange={(e) => setApplyFormData(prev => ({ ...prev, email: e.target.value }))}
                                    className="h-12 bg-black/60 border-white/10 pl-11 text-white placeholder:text-gray-500 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50"
                                    data-testid="input-apply-email"
                                  />
                                </div>
                              </div>

                              <div className="pt-2">
                                <Button
                                  onClick={handleApplySubmit}
                                  disabled={isSubmitting}
                                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold text-lg shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all disabled:opacity-50"
                                  data-testid="button-submit-application"
                                >
                                  {isSubmitting ? (
                                    <>
                                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                      Submitting...
                                    </>
                                  ) : (
                                    <>
                                      Join the Game
                                      <ArrowRight className="w-5 h-5 ml-2" />
                                    </>
                                  )}
                                </Button>
                              </div>
                              
                              <div className="text-center pt-2">
                                <Button 
                                  variant="link" 
                                  className="text-white/50 hover:text-white transition-colors font-code uppercase tracking-widest text-xs no-underline hover:no-underline cursor-pointer" 
                                  onClick={() => setShowApplyForm(false)}
                                  data-testid="link-back-to-code"
                                >
                                  I have a code
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            </>,
            document.body
          )}
          
          {isMounted && showAccessGranted && createPortal(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="text-center"
              >
                <motion.div
                  animate={{ 
                    boxShadow: [
                      "0 0 40px rgba(250,204,21,0.4)",
                      "0 0 80px rgba(250,204,21,0.6)",
                      "0 0 40px rgba(250,204,21,0.4)"
                    ]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center"
                >
                  <Unlock className="w-12 h-12 text-white" />
                </motion.div>
                
                <motion.h2 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl md:text-5xl font-bold text-white mb-4 font-heading"
                >
                  Access Granted!
                </motion.h2>
                
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-center gap-3 text-gray-400"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={loadingMessageIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="text-lg"
                    >
                      {LOADING_MESSAGES[loadingMessageIndex]}
                    </motion.span>
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            </motion.div>,
            document.body
          )}
            
          <div className="flex items-center gap-6">
            <HoverCard openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-4 text-sm text-muted-foreground/80 p-3 rounded-2xl bg-white/5 border border-white/5 w-fit backdrop-blur-md hover:bg-white/10 transition-colors cursor-default">
                  <div className="flex -space-x-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shadow-lg bg-gray-800">
                      <img src={danThumb} alt="Player" loading="lazy" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-8 h-8 rounded-full border border-white/10 shadow-lg bg-gradient-to-br from-zinc-500 to-zinc-600 flex items-center justify-center">
                      <span className="text-xs font-medium text-white/80">AL</span>
                    </div>
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shadow-lg bg-gray-800">
                      <img src={sarahThumb} alt="Player" loading="lazy" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shadow-lg bg-gray-800">
                      <img src={mikeThumb} alt="Player" loading="lazy" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <p className="font-heading"><span className="text-white font-bold">{getPlayerCount().toLocaleString()}</span> Players Waiting</p>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-auto bg-zinc-900/95 border-white/10 backdrop-blur-md" data-testid="tooltip-new-players">
                <p className="text-sm text-white/80 font-heading">
                  <span className="text-white font-bold">{getNewPlayersLast8Hours()}</span> new players joined in the last 8 hours
                </p>
              </HoverCardContent>
            </HoverCard>

            <Button 
              variant="link" 
              className="text-muted-foreground hover:text-gray-400 transition-colors font-heading cursor-pointer" 
              data-testid="link-apply"
              onClick={() => {
                setCurrentIndex(6);
                setShowApplyForm(true);
              }}
            >
              Apply for a code <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>

        <div className="relative flex items-center justify-center w-full h-[500px]">
          <AnimatePresence mode="wait">
            {currentIndex !== 0 && currentIndex !== 6 && (
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 ${
                (content[currentIndex] as any).type === 'demo' 
                  ? 'w-[520px] h-[520px] max-w-[90vw] max-h-[90vw]' 
                  : 'w-[80%] max-w-md aspect-video'
              }`}>
                <motion.div
                  key="visual-context-right"
                  layoutId="visual-context"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1, rotate: content[currentIndex].rotation || 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.6, ease: "circOut" }}
                  className="w-full h-full"
                >
                  {(content[currentIndex] as any).type !== 'demo' && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-cyan-400/30 rounded-2xl blur-2xl transform scale-105 opacity-60" />
                  )}

                  <div className={`relative w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/50 backdrop-blur-sm group ${(content[currentIndex] as any).containerClass || ''}`}>
                    {!(content[currentIndex] as any).containerClass?.includes('!bg-transparent') && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-cyan-400/10 opacity-50" />
                    )}
                    {(content[currentIndex] as any).type === 'demo' ? (
                      <div className="w-full h-full flex items-center justify-center">
                        {shouldRenderDemo ? (
                          <DemoSimulationPlayer 
                            simulation="search-composer-demo" 
                            width={520}
                            height={520}
                            className="shadow-none"
                            onClose={() => setCurrentIndex((prev) => (prev + 1) % content.length)}
                          />
                        ) : (
                          <div className="flex items-center justify-center text-white/50">
                            <Loader2 className="w-8 h-8 animate-spin" />
                          </div>
                        )}
                      </div>
                    ) : (content[currentIndex] as any).component ? (
                      <div className="w-full h-full flex items-center justify-center">
                        {(content[currentIndex] as any).component}
                      </div>
                    ) : (
                      <img 
                        src={(content[currentIndex] as any).image} 
                        alt={content[currentIndex].label}
                        loading="lazy"
                        className={`w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105 ${(content[currentIndex] as any).imageClass || ''}`}
                      />
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotate: 10 }}
            animate={{ 
              opacity: currentIndex === 0 ? 1 : 0, 
              scale: currentIndex === 0 ? 1 : 0.5, 
              x: currentIndex === 0 ? 0 : 400,
              y: currentIndex === 0 ? 0 : -400,
              rotate: currentIndex === 0 ? 0 : 45
            }}
            transition={{ duration: 0.8, type: "spring" }}
            className="relative flex items-center justify-center z-20"
            onMouseEnter={() => setIsHoveringDuck(true)}
            onMouseLeave={() => setIsHoveringDuck(false)}
          >
            <motion.div 
              animate={{ 
                scale: isHoveringDuck ? 1.2 : 1,
                opacity: isHoveringDuck ? 0.8 : (currentIndex === 0 ? 0.5 : 0)
              }}
              className="absolute inset-0 bg-primary/30 blur-[120px] rounded-full" 
            />
            
            <motion.img 
              src={duckImage}
              srcSet={`${duckImageMobile} 400w, ${duckImage} 800w`}
              sizes="(max-width: 640px) 400px, 800px"
              alt="Fluffy the Duck" 
              loading="lazy"
              onLoad={() => setIsDuckLoaded(true)}
              animate={{ 
                y: currentIndex === 0 ? [0, -20, 0] : 0,
                rotate: isHoveringDuck ? [0, -5, 5, 0] : 0
              }}
              transition={{ 
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 0.5 }
              }}
              className="relative z-10 w-full max-w-[300px] lg:max-w-[350px] drop-shadow-2xl cursor-pointer"
              style={{ filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.6))" }}
            />
            
            <AnimatePresence>
              {currentIndex === 0 && (
                <>
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0, y: [0, -10, 0] }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.5, y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
                    className="absolute top-10 right-0 lg:-right-12 bg-black/40 backdrop-blur-md border border-white/5 p-4 rounded-2xl z-20 shadow-2xl flex items-center gap-3 w-48"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-xl border border-blue-500/20">
                      📧
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Action</p>
                      <p className="text-sm font-bold text-gray-200">Email Sent <span className="text-gray-500">+50XP</span></p>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0, y: [0, 15, 0] }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.5, delay: 0.1, y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 } }}
                    className="absolute bottom-20 -left-4 lg:-left-16 bg-black/40 backdrop-blur-md border border-white/5 p-4 rounded-2xl z-20 shadow-2xl flex items-center gap-3 w-52"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-xl border border-green-500/20">
                      🎯
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">New Lead</p>
                      <p className="text-sm font-bold text-gray-200">Prospect Found</p>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.5, delay: 0.2, y: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 } }}
                    className="absolute -bottom-4 right-10 bg-black/40 backdrop-blur-md border border-white/5 text-gray-200 p-3 rounded-2xl z-30 shadow-xl flex items-center gap-2"
                  >
                    <span className="text-xl">🔥</span>
                    <div className="leading-tight">
                      <p className="text-xs font-black uppercase opacity-80">Streak</p>
                      <p className="text-sm font-bold">12 Days</p>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

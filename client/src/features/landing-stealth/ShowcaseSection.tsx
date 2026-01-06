import { useState, useEffect, useMemo, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building2, Users, Search } from "lucide-react";
import { DemoSimulationPlayer } from "@/features/demo-simulations";

function BrowserFrame({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[#1a1814] rounded-xl overflow-hidden shadow-2xl border border-white/10 w-full">
      {/* Browser chrome header - darker/cooler tint to differentiate */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#0f0e0c] border-b border-white/5">
        {/* Traffic light buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#febc2e]" />
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#28c840]" />
        </div>
        {/* Address bar */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 bg-white/5 rounded-md text-[10px] sm:text-xs text-gray-500">
            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>app.5ducks.com</span>
          </div>
        </div>
        {/* Spacer to balance traffic lights */}
        <div className="w-[36px] sm:w-[44px]" />
      </div>
      {/* Demo content */}
      {children}
    </div>
  );
}

const SHOWCASE_PROMPTS = [
  { id: 1, prompt: "biotech series A startups in Austin", role: "CTO", companies: 7, contacts: 55 },
  { id: 3, prompt: "AI/ML startups in San Francisco", role: "Engineering", companies: 6, contacts: 218 },
  { id: 16, prompt: "plumbers in flushing queens", role: "Operations", companies: 7, contacts: 11 },
  { id: 17, prompt: "evangelical churches in Staten Island", role: "Leadership", companies: 7, contacts: 26 },
  { id: 18, prompt: "boutique ad agencies in NYC", role: "Creative", companies: 7, contacts: 21 },
  { id: 19, prompt: "web dev agencies in NYC using WordPress", role: "Engineering", companies: 7, contacts: 23 },
  { id: 20, prompt: "software companies in Zurich", role: "Engineering", companies: 7, contacts: 20 },
  { id: 21, prompt: "recently exited startups in Miami", role: "Leadership", companies: 7, contacts: 33 },
  { id: 10, prompt: "fitness chains in NYC", role: "Operations", companies: 7, contacts: 40 },
  { id: 11, prompt: "marketing agencies in Austin", role: "Creative", companies: 7, contacts: 27 },
  { id: 5, prompt: "Healthcare tech companies in Boston", role: "Sales", companies: 6, contacts: 186 },
  { id: 13, prompt: "real estate lawyers in Atlanta", role: "Legal", companies: 7, contacts: 45 },
  { id: 7, prompt: "energy companies in New York", role: "Legal", companies: 12, contacts: 33 },
  { id: 4, prompt: "FinTech companies in London", role: "Leadership", companies: 6, contacts: 285 },
  { id: 14, prompt: "investment banks in New York City", role: "Finance", companies: 7, contacts: 51 },
];

export function ShowcaseSection() {
  const shuffledPrompts = useMemo(() => {
    const shuffled = [...SHOWCASE_PROMPTS];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const [selectedPrompt, setSelectedPrompt] = useState<number>(() => shuffledPrompts[0]?.id ?? 1);
  const [mobileModalOpen, setMobileModalOpen] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMobileClose = () => {
    setMobileModalOpen(null);
  };

  return (
    <div className="relative z-20 bg-[#0A0A10] py-24 border-t border-white/5">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-serif text-white mb-4">
            See Real Results
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            Click any search to instantly see the companies and contacts we found
          </p>
        </motion.div>
        
        {/* Desktop: Split-panel layout */}
        <div className="hidden lg:flex lg:justify-center lg:items-start gap-10 xl:gap-16 max-w-7xl mx-auto">
          {/* Left: Scrollable prompt list */}
          <div className="w-[320px] shrink-0 bg-white/5 border border-white/10 rounded-2xl p-3 max-h-[560px] overflow-y-auto scrollbar-dark">
            <div className="space-y-1">
              {shuffledPrompts.map((item, index) => {
                const isActive = selectedPrompt === item.id;
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                    viewport={{ once: true }}
                    onClick={() => setSelectedPrompt(item.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive 
                        ? "bg-amber-500/15" 
                        : "hover:bg-white/5"
                    }`}
                    data-testid={`button-showcase-${item.id}`}
                  >
                    <p className={`font-medium leading-snug mb-1 transition-colors text-sm ${
                      isActive ? "text-amber-200" : "text-white/80"
                    }`}>
                      {item.prompt}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {item.companies}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {item.contacts}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        isActive ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-gray-500"
                      }`}>
                        {item.role}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
          
          {/* Right: Live demo preview with browser chrome */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="relative w-full max-w-[580px] xl:max-w-[640px]"
          >
            <BrowserFrame>
              <DemoSimulationPlayer
                simulation="showcase-results"
                params={{ id: selectedPrompt }}
                responsive
                aspectRatio={58/50}
                showControls={false}
              />
            </BrowserFrame>
          </motion.div>
        </div>
        
        {/* Mobile/Tablet: Card grid with modal */}
        <div className="lg:hidden">
          <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {shuffledPrompts.slice(0, 8).map((item, index) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                viewport={{ once: true }}
                onClick={() => setMobileModalOpen(item.id)}
                className="group text-left p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/30 rounded-xl transition-all duration-300"
                data-testid={`button-showcase-mobile-${item.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Search className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium leading-tight mb-1.5 text-sm group-hover:text-amber-200 transition-colors">
                      {item.prompt}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {item.companies}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {item.contacts}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Mobile Modal */}
      {isMounted && createPortal(
        <AnimatePresence>
          {mobileModalOpen !== null && (
            <motion.div
              key="showcase-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
              onClick={handleMobileClose}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative w-full max-w-lg max-h-[calc(100svh-2rem)]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleMobileClose}
                  className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white transition-all border border-white/10"
                  data-testid="button-close-showcase"
                >
                  <X size={18} />
                </button>
                
                <BrowserFrame>
                  <DemoSimulationPlayer
                    simulation="showcase-results"
                    params={{ id: mobileModalOpen }}
                    responsive
                    aspectRatio={58/70}
                    showControls={false}
                  />
                </BrowserFrame>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

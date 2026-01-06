import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building2, Users, Search } from "lucide-react";
import { DemoSimulationPlayer } from "@/features/demo-simulations";

const SHOWCASE_PROMPTS = [
  { id: 1, prompt: "biotech series A startups in Austin", role: "CTO", companies: 7, contacts: 55 },
  { id: 2, prompt: "private credit asset managers in NYC", role: "Finance", companies: 7, contacts: 45 },
  { id: 3, prompt: "AI/ML startups in San Francisco", role: "Engineering", companies: 6, contacts: 218 },
  { id: 4, prompt: "FinTech companies in London", role: "Leadership", companies: 6, contacts: 285 },
  { id: 5, prompt: "Healthcare tech companies in Boston", role: "Sales", companies: 6, contacts: 186 },
  { id: 6, prompt: "large audit firms in NYC", role: "Leadership", companies: 7, contacts: 44 },
  { id: 7, prompt: "energy companies in New York", role: "Legal", companies: 12, contacts: 33 },
  { id: 8, prompt: "hedge funds in Connecticut", role: "Finance", companies: 7, contacts: 63 },
  { id: 9, prompt: "hedge funds in Miami", role: "Leadership", companies: 7, contacts: 40 },
  { id: 10, prompt: "fitness chains in NYC", role: "Operations", companies: 7, contacts: 40 },
  { id: 11, prompt: "marketing agencies in Austin", role: "Creative", companies: 7, contacts: 27 },
  { id: 12, prompt: "tech hedge funds in Seattle", role: "Engineering", companies: 7, contacts: 38 },
  { id: 13, prompt: "real estate lawyers in Atlanta", role: "Legal", companies: 7, contacts: 45 },
  { id: 14, prompt: "investment banks in New York City", role: "Finance", companies: 7, contacts: 51 },
  { id: 15, prompt: "hedge funds in Los Angeles", role: "Leadership", companies: 7, contacts: 60 },
];

export function ShowcaseSection() {
  const [selectedPrompt, setSelectedPrompt] = useState<number>(1);
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
        <div className="hidden lg:grid lg:grid-cols-[320px_1fr] gap-6 max-w-6xl mx-auto">
          {/* Left: Scrollable prompt list */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 max-h-[560px] overflow-y-auto">
            <div className="space-y-1">
              {SHOWCASE_PROMPTS.map((item, index) => {
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
                        ? "bg-amber-500/15 border-l-2 border-amber-400" 
                        : "hover:bg-white/5 border-l-2 border-transparent"
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
          
          {/* Right: Live demo preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="relative"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedPrompt}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <DemoSimulationPlayer
                  simulation="showcase-results"
                  params={{ id: selectedPrompt }}
                  width={580}
                  height={540}
                  showControls={false}
                  className="shadow-2xl mx-auto"
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
        
        {/* Mobile/Tablet: Card grid with modal */}
        <div className="lg:hidden">
          <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {SHOWCASE_PROMPTS.slice(0, 8).map((item, index) => (
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
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
              onClick={handleMobileClose}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleMobileClose}
                  className="absolute -top-3 -right-3 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white transition-all border border-white/10"
                  data-testid="button-close-showcase"
                >
                  <X size={20} />
                </button>
                
                <DemoSimulationPlayer
                  simulation="showcase-results"
                  params={{ id: mobileModalOpen }}
                  width={520}
                  height={540}
                  showControls={false}
                  className="shadow-2xl"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

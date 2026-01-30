import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Sparkles, Map, Database, Search, Filter } from "lucide-react";

interface TabData {
  id: string;
  icon: typeof Zap;
  title: string;
  summary: string;
  fullDescription: string;
  graphic: () => JSX.Element;
}

const ComparisonChart = () => (
  <div className="w-full h-full flex items-center justify-center p-6">
    <div className="w-full max-w-md">
      <div className="flex items-end justify-center gap-8 h-48">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-20 bg-red-500/20 border border-red-500/40 rounded-t-lg h-32 flex items-end justify-center pb-2">
              <Database className="w-8 h-8 text-red-400/60" />
            </div>
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-red-400 text-sm font-mono">300M+</span>
            </div>
          </div>
          <span className="text-gray-500 text-sm mt-3 text-center">Stale DB</span>
          <span className="text-gray-600 text-xs">12-18 months old</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-20 bg-green-500/20 border border-green-500/40 rounded-t-lg h-16 flex items-end justify-center pb-2">
              <Zap className="w-8 h-8 text-green-400" />
            </div>
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-green-400 text-sm font-mono">Fresh</span>
            </div>
          </div>
          <span className="text-gray-400 text-sm mt-3 text-center">Live Search</span>
          <span className="text-green-400/80 text-xs">Real-time</span>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-gray-500 text-sm">
          <span className="text-yellow-400">Quality</span> over quantity
        </p>
      </div>
    </div>
  </div>
);

const PromptVsFilters = () => (
  <div className="w-full h-full flex items-center justify-center p-6">
    <div className="w-full max-w-lg space-y-6">
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-sm font-medium">Traditional Approach</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Industry", "Company Size", "Revenue", "Location", "Tech Stack", "Job Title", "Seniority", "Department", "Keywords"].map((filter) => (
            <div key={filter} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-gray-500 truncate">
              {filter} ▾
            </div>
          ))}
        </div>
        <p className="text-gray-600 text-xs mt-3 italic">+ 66 more filters...</p>
      </div>
      
      <div className="flex items-center justify-center">
        <span className="text-gray-600 text-sm">vs</span>
      </div>
      
      <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 text-sm font-medium">5Ducks Approach</span>
        </div>
        <div className="bg-black/40 border border-white/20 rounded-lg px-4 py-3">
          <span className="text-white font-mono text-sm">
            "SaaS companies in Austin with Series A funding"
          </span>
          <span className="animate-pulse text-yellow-400 ml-1">|</span>
        </div>
        <p className="text-gray-400 text-xs mt-3">Just type what you want. That's it.</p>
      </div>
    </div>
  </div>
);

const SearchExamples = () => {
  const examples = [
    "Beach-side 4-star hotels on the Space Coast",
    "Recently-exited startups in Miami",
    "Family-owned wineries in Napa Valley",
    "AI companies hiring remote engineers",
    "Boutique marketing agencies in Brooklyn",
  ];
  
  const [visibleExamples, setVisibleExamples] = useState<number[]>([0, 1, 2]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleExamples(prev => {
        const next = prev.map(i => (i + 1) % examples.length);
        return next;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-6">
          <Search className="w-5 h-5 text-yellow-400" />
          <span className="text-gray-400 text-sm">Searches that are impossible elsewhere:</span>
        </div>
        
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {visibleExamples.map((exampleIndex, i) => (
              <motion.div
                key={`${exampleIndex}-${i}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-gray-300 text-sm">"{examples[exampleIndex]}"</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        <p className="text-center text-gray-500 text-sm mt-6">
          <span className="text-yellow-400">Literally anything.</span> At your fingertips.
        </p>
      </div>
    </div>
  );
};

const tabs: TabData[] = [
  {
    id: "fresh-data",
    icon: Zap,
    title: "0 Contacts in Our DB",
    summary: "Fresh data, every search",
    fullDescription: "The era of cold emailing 30k \"industry-related\" people is over. Find your ISP for THIS WEEK, maybe 10, 20 or 30, and email them.",
    graphic: ComparisonChart,
  },
  {
    id: "one-prompt",
    icon: Sparkles,
    title: "1 Prompt, Not 75 Filters",
    summary: "Just type what you want",
    fullDescription: "No dropdown mazes. No endless checkboxes. No \"advanced search\" tutorials. Just describe your ideal customer in plain English and let AI do the rest.",
    graphic: PromptVsFilters,
  },
  {
    id: "unsearchable",
    icon: Map,
    title: "Search the Unsearchable",
    summary: "Queries nobody else can run",
    fullDescription: "Traditional databases can only filter by industry, pathname, and company size. We can find \"recently-exited startups\" or \"beach-side hotels\" — context that exists nowhere else.",
    graphic: SearchExamples,
  },
];

const AUTO_ROTATE_INTERVAL = 4000;
const PAUSE_AFTER_CLICK = 8000;

export function FreshDataSection() {
  const [activeTab, setActiveTab] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseTimeout, setPauseTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleTabClick = useCallback((index: number) => {
    setActiveTab(index);
    setIsPaused(true);
    
    if (pauseTimeout) {
      clearTimeout(pauseTimeout);
    }
    
    const timeout = setTimeout(() => {
      setIsPaused(false);
    }, PAUSE_AFTER_CLICK);
    
    setPauseTimeout(timeout);
  }, [pauseTimeout]);

  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setActiveTab(prev => (prev + 1) % tabs.length);
    }, AUTO_ROTATE_INTERVAL);
    
    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    return () => {
      if (pauseTimeout) {
        clearTimeout(pauseTimeout);
      }
    };
  }, [pauseTimeout]);

  const activeTabData = tabs[activeTab];
  const GraphicComponent = activeTabData.graphic;

  return (
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
          <h2 className="text-3xl md:text-5xl font-serif text-white mb-4">Fresh Data. Zero Bloat.</h2>
          <p className="text-xl text-gray-500 italic">
            While competitors rely on stale databases, we search fresh — every time.
          </p>
        </motion.div>
        
        <div className="max-w-5xl mx-auto">
          {/* Desktop: Vertical tabs layout */}
          <div 
            className="hidden md:grid md:grid-cols-[300px_1fr] gap-6"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="space-y-3">
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = index === activeTab;
                
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => handleTabClick(index)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
                      isActive 
                        ? "bg-yellow-500/10 border-yellow-500/30" 
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                    data-testid={`tab-${tab.id}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        isActive ? "bg-yellow-500/20" : "bg-white/10"
                      }`}>
                        <Icon className={`w-5 h-5 ${isActive ? "text-yellow-400" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <h3 className={`font-bold transition-colors ${isActive ? "text-white" : "text-gray-400"}`}>
                          {tab.title}
                        </h3>
                        <p className={`text-sm transition-colors ${isActive ? "text-gray-400" : "text-gray-600"}`}>
                          {tab.summary}
                        </p>
                      </div>
                    </div>
                    
                    {isActive && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: AUTO_ROTATE_INTERVAL / 1000, ease: "linear" }}
                        className="h-0.5 bg-yellow-500/50 mt-3 rounded-full"
                        key={`progress-${activeTab}`}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden min-h-[400px] flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex flex-col"
                >
                  <div className="flex-1">
                    <GraphicComponent />
                  </div>
                  
                  <div className="p-6 border-t border-white/10 bg-black/20">
                    <p className="text-gray-300 leading-relaxed">
                      {activeTabData.fullDescription}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          
          {/* Mobile: Accordion layout */}
          <div className="md:hidden space-y-4">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = index === activeTab;
              const Graphic = tab.graphic;
              
              return (
                <motion.div
                  key={tab.id}
                  className="border border-white/10 rounded-xl overflow-hidden"
                  initial={false}
                >
                  <button
                    onClick={() => handleTabClick(index)}
                    className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${
                      isActive ? "bg-yellow-500/10" : "bg-white/5"
                    }`}
                    data-testid={`accordion-${tab.id}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isActive ? "bg-yellow-500/20" : "bg-white/10"
                    }`}>
                      <Icon className={`w-5 h-5 ${isActive ? "text-yellow-400" : "text-gray-400"}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold ${isActive ? "text-white" : "text-gray-400"}`}>
                        {tab.title}
                      </h3>
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 border-t border-white/10">
                          <div className="h-64">
                            <Graphic />
                          </div>
                          <p className="text-gray-400 text-sm mt-4">
                            {tab.fullDescription}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X, Trophy, Target } from "lucide-react";
import type { QuestProgressHeaderProps } from "../types";

export function QuestProgressHeader({
  questName,
  challengesCompleted,
  totalChallenges,
  currentChallengeName,
  isVisible,
  onClose,
}: QuestProgressHeaderProps) {
  const progressPercentage = (challengesCompleted / totalChallenges) * 100;
  const [isExpanded, setIsExpanded] = useState(false);
  const collapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringRef = useRef(false);

  const clearCollapseTimeout = useCallback(() => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
  }, []);

  const scheduleCollapse = useCallback((delay: number) => {
    clearCollapseTimeout();
    collapseTimeoutRef.current = setTimeout(() => {
      if (!isHoveringRef.current) {
        setIsExpanded(false);
      }
    }, delay);
  }, [clearCollapseTimeout]);

  const handleMouseEnter = useCallback(() => {
    isHoveringRef.current = true;
    clearCollapseTimeout();
    setIsExpanded(true);
  }, [clearCollapseTimeout]);

  const handleMouseLeave = useCallback(() => {
    isHoveringRef.current = false;
    scheduleCollapse(1500);
  }, [scheduleCollapse]);

  const handleTap = useCallback(() => {
    if (!isExpanded) {
      setIsExpanded(true);
      scheduleCollapse(2000);
    } else {
      clearCollapseTimeout();
      setIsExpanded(false);
    }
  }, [isExpanded, scheduleCollapse, clearCollapseTimeout]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
          data-testid="quest-progress-header"
          data-recorder-ui="true"
        >
          <motion.div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleTap}
            animate={{
              width: isExpanded ? "100%" : "auto",
            }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="pointer-events-auto bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-yellow-500/30 shadow-lg cursor-pointer"
            style={{
              borderBottomLeftRadius: isExpanded ? 0 : 8,
              borderBottomRightRadius: isExpanded ? 0 : 8,
            }}
          >
            <AnimatePresence mode="wait">
              {isExpanded ? (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="max-w-screen-xl mx-auto px-4 py-2 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 sm:gap-4">
                    <Link 
                      href="/quests" 
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium text-yellow-400 hidden sm:inline">
                        {questName}
                      </span>
                    </Link>
                    
                    <div className="h-4 w-px bg-gray-600" />
                    
                    <Link 
                      href="/quests"
                      className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Target className="h-4 w-4 text-gray-400 flex-shrink-0 hidden sm:block" />
                      <span className="text-xs text-gray-300 truncate">
                        {currentChallengeName || "Ready for next challenge"}
                      </span>
                    </Link>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 sm:w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercentage}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">
                        {challengesCompleted}/{totalChallenges}
                      </span>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                      }}
                      className="text-gray-400 hover:text-white transition-colors p-1"
                      data-testid="close-quest-header"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="compressed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="px-3 py-1.5 flex items-center gap-2"
                >
                  <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    className="text-gray-500 hover:text-white transition-colors"
                    data-testid="close-quest-header-compressed"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GuidanceTooltipProps } from "../types";
import { findElement } from "../utils/elementSelector";
import ducklingMascot from "@/assets/duckling-mascot.png";

export function GuidanceTooltip({
  targetSelector,
  contentMatch,
  instruction,
  position = "auto",
  isVisible,
  onDismiss,
  onBack,
  onClose,
  stepNumber,
  totalSteps,
  playbackMode = "guide",
  onModeToggle,
  hasVideo,
}: GuidanceTooltipProps) {
  const [coords, setCoords] = useState<{ top: number; left: number; arrowPosition: string } | null>(null);
  const animationRef = useRef<number>();

  const calculatePosition = useCallback(() => {
    let element: Element | null = null;
    try {
      element = findElement(targetSelector, contentMatch);
    } catch (e) {
      setCoords(null);
      return;
    }
    if (!element) {
      setCoords(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    const tooltipWidth = 260;
    const tooltipHeight = 100;
    const spacing = 16;
    const mascotOffset = 40; // Extra space for duckling when tooltip is on the right

    let finalPosition = position;
    if (position === "auto") {
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = window.innerWidth - rect.right;

      if (spaceBelow >= tooltipHeight + spacing) {
        finalPosition = "bottom";
      } else if (spaceAbove >= tooltipHeight + spacing) {
        finalPosition = "top";
      } else if (spaceRight >= tooltipWidth + spacing) {
        finalPosition = "right";
      } else {
        finalPosition = "left";
      }
    }

    let top = 0;
    let left = 0;
    let arrowPosition = "top";

    switch (finalPosition) {
      case "bottom":
        top = rect.bottom + spacing;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = "top";
        break;
      case "top":
        top = rect.top - tooltipHeight - spacing;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = "bottom";
        break;
      case "right":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + spacing + mascotOffset;
        arrowPosition = "left";
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - spacing;
        arrowPosition = "right";
        break;
    }

    left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));
    top = Math.max(10, Math.min(top, window.innerHeight - tooltipHeight - 10));

    setCoords({ top, left, arrowPosition });
  }, [targetSelector, contentMatch, position]);

  useEffect(() => {
    if (!isVisible || !targetSelector) {
      setCoords(null);
      return;
    }

    const updatePosition = () => {
      calculatePosition();
      animationRef.current = requestAnimationFrame(updatePosition);
    };

    updatePosition();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetSelector, isVisible, calculatePosition]);

  if (!isVisible || !coords) return null;

  const arrowStyles: Record<string, React.CSSProperties> = {
    top: {
      position: "absolute",
      top: "-8px",
      left: "50%",
      transform: "translateX(-50%)",
      borderLeft: "8px solid transparent",
      borderRight: "8px solid transparent",
      borderBottom: "8px solid #1f2937",
    },
    bottom: {
      position: "absolute",
      bottom: "-8px",
      left: "50%",
      transform: "translateX(-50%)",
      borderLeft: "8px solid transparent",
      borderRight: "8px solid transparent",
      borderTop: "8px solid #1f2937",
    },
    left: {
      position: "absolute",
      left: "-8px",
      top: "50%",
      transform: "translateY(-50%)",
      borderTop: "8px solid transparent",
      borderBottom: "8px solid transparent",
      borderRight: "8px solid #1f2937",
    },
    right: {
      position: "absolute",
      right: "-8px",
      top: "50%",
      transform: "translateY(-50%)",
      borderTop: "8px solid transparent",
      borderBottom: "8px solid transparent",
      borderLeft: "8px solid #1f2937",
    },
  };

  return createPortal(
    <>
      <style>
        {`
          @keyframes mascot-wiggle {
            0% { transform: translateY(0) rotate(0deg); }
            2% { transform: translateY(-4px) rotate(0deg); }
            4% { transform: translateY(0) rotate(0deg); }
            4%, 35% { transform: translateY(0) rotate(0deg); }
            36% { transform: rotate(5deg); }
            37% { transform: rotate(-5deg); }
            38% { transform: rotate(0deg); }
            38%, 75% { transform: translateY(0) rotate(0deg); }
            77% { transform: translateY(-2px) rotate(2deg); }
            79% { transform: translateY(-3px) rotate(-1deg); }
            81% { transform: translateY(-1px) rotate(1deg); }
            83% { transform: translateY(0) rotate(0deg); }
            83%, 100% { transform: translateY(0) rotate(0deg); }
          }
          .mascot-wiggle {
            animation: mascot-wiggle 12s ease-in-out infinite;
          }
        `}
      </style>
      <AnimatePresence>
        {isVisible && (
          <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="fixed z-[9999] w-[260px] bg-gray-800 text-white rounded-lg shadow-2xl border border-yellow-500/30"
          style={{ top: coords.top, left: coords.left }}
          data-testid="guidance-tooltip"
          data-recorder-ui="true"
        >
          <div style={arrowStyles[coords.arrowPosition]} />
          
          <img 
            src={ducklingMascot} 
            alt="Duckling guide" 
            className="absolute -left-12 -top-2 w-10 h-10 mascot-wiggle object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
          />
          
          <div className="p-3">
            <div className="flex items-start gap-2">
              <p className="text-sm text-gray-200 leading-snug flex-1">
                {playbackMode === "show" ? (
                  <span className="text-yellow-400 italic">Watching: {instruction}</span>
                ) : (
                  instruction
                )}
                <span className="inline-flex items-center align-middle ml-1">
                  {stepNumber && stepNumber > 1 && onBack && playbackMode === "guide" && (
                    <button
                      className="text-gray-400 hover:text-yellow-400 h-5 w-5 p-0 inline-flex items-center justify-center transition-colors"
                      onClick={onBack}
                      data-testid="tooltip-back"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {stepNumber && totalSteps && (
                    <span className="text-xs text-gray-400 font-medium">
                      {stepNumber} / {totalSteps}
                    </span>
                  )}
                  {playbackMode === "guide" && (
                    <button
                      className="text-gray-400 hover:text-yellow-400 h-5 w-5 p-0 inline-flex items-center justify-center transition-colors"
                      onClick={onDismiss}
                      data-testid="tooltip-next"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {onClose && (
                    <button
                      className="text-gray-400 hover:text-red-400 h-5 w-5 p-0 ml-1 inline-flex items-center justify-center transition-colors"
                      onClick={onClose}
                      data-testid="tooltip-close"
                      title="Close guidance"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              </p>
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}

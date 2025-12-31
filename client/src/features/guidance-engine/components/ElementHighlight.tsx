import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ElementHighlightProps } from "../types";

export function ElementHighlight({ targetSelector, isVisible }: ElementHighlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!isVisible || !targetSelector) {
      setRect(null);
      return;
    }

    const updatePosition = () => {
      try {
        const element = document.querySelector(targetSelector);
        if (element) {
          const newRect = element.getBoundingClientRect();
          setRect(newRect);
        } else {
          setRect(null);
        }
      } catch (e) {
        // Invalid selector (e.g., Tailwind classes with brackets like min-h-[80px])
        setRect(null);
      }
      animationRef.current = requestAnimationFrame(updatePosition);
    };

    updatePosition();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetSelector, isVisible]);

  if (!isVisible || !rect) return null;

  const padding = 6;
  const highlightStyle: React.CSSProperties = {
    position: "fixed",
    top: rect.top - padding + window.scrollY,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
    border: "3px solid #facc15",
    borderRadius: "8px",
    boxShadow: "0 0 12px 2px rgba(250, 204, 21, 0.4)",
    pointerEvents: "none" as const,
    zIndex: 9998,
    animation: "guidance-pulse 2s infinite",
  };

  return createPortal(
    <>
      <style>
        {`
          @keyframes guidance-pulse {
            0% { box-shadow: 0 0 12px 2px rgba(250, 204, 21, 0.4); }
            50% { box-shadow: 0 0 18px 3px rgba(250, 204, 21, 0.6); }
            100% { box-shadow: 0 0 12px 2px rgba(250, 204, 21, 0.4); }
          }
        `}
      </style>
      <div style={highlightStyle} data-testid="element-highlight" />
    </>,
    document.body
  );
}

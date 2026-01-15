import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ElementHighlightProps } from "../types";
import { findElement } from "../utils/elementSelector";

export function ElementHighlight({ targetSelector, contentMatch, isVisible, actionType }: ElementHighlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!isVisible || !targetSelector) {
      setRect(null);
      return;
    }

    const updatePosition = () => {
      try {
        const element = findElement(targetSelector, contentMatch);
        if (element) {
          const newRect = element.getBoundingClientRect();
          setRect(newRect);
        } else {
          setRect(null);
        }
      } catch (e) {
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
  }, [targetSelector, contentMatch, isVisible]);

  if (!isVisible || !rect) return null;

  const padding = 6;
  const isTypeAction = actionType === "type";
  
  const highlightStyle: React.CSSProperties = {
    position: "fixed",
    top: rect.top - padding + window.scrollY,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
    border: isTypeAction ? "3px dashed #60a5fa" : "3px solid #facc15",
    borderRadius: "8px",
    boxShadow: isTypeAction 
      ? "0 0 12px 2px rgba(96, 165, 250, 0.4)" 
      : "0 0 12px 2px rgba(250, 204, 21, 0.4)",
    pointerEvents: "none" as const,
    zIndex: 9998,
    animation: isTypeAction ? "guidance-type-pulse 1.5s infinite" : "guidance-pulse 2s infinite",
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
          @keyframes guidance-type-pulse {
            0% { box-shadow: 0 0 12px 2px rgba(96, 165, 250, 0.4); border-color: #60a5fa; }
            50% { box-shadow: 0 0 18px 3px rgba(96, 165, 250, 0.6); border-color: #93c5fd; }
            100% { box-shadow: 0 0 12px 2px rgba(96, 165, 250, 0.4); border-color: #60a5fa; }
          }
        `}
      </style>
      <div style={highlightStyle} data-testid="element-highlight" />
    </>,
    document.body
  );
}

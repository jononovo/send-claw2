import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { SpotlightOverlayProps } from "../types";
import { findElement } from "../utils/elementSelector";

export function SpotlightOverlay({ targetSelector, contentMatch, isVisible }: SpotlightOverlayProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!isVisible || !targetSelector) {
      setRect(null);
      return;
    }

    const updatePosition = () => {
      const element = findElement(targetSelector, contentMatch);
      if (element) {
        const newRect = element.getBoundingClientRect();
        setRect(newRect);
      } else {
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

  if (!isVisible) return null;

  const padding = 10;
  const cutoutRect = rect
    ? {
        left: rect.left - padding,
        top: rect.top - padding,
        right: rect.right + padding,
        bottom: rect.bottom + padding,
      }
    : null;

  const clipPath = cutoutRect
    ? `polygon(
        0 0, 100% 0, 100% 100%, 0 100%, 0 0,
        ${cutoutRect.left}px ${cutoutRect.top}px,
        ${cutoutRect.right}px ${cutoutRect.top}px,
        ${cutoutRect.right}px ${cutoutRect.bottom}px,
        ${cutoutRect.left}px ${cutoutRect.bottom}px,
        ${cutoutRect.left}px ${cutoutRect.top}px
      )`
    : undefined;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 z-[9997] pointer-events-none transition-all duration-300"
      style={{ clipPath }}
      data-testid="spotlight-overlay"
    />,
    document.body
  );
}

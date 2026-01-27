import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight } from "lucide-react";

interface AutoAdvanceButtonProps {
  duration: number;
  onClick: () => void;
  label?: string;
  countdownPrefix?: string;
  className?: string;
  disabled?: boolean;
  delayMs?: number;
}

export function AutoAdvanceButton({
  duration,
  onClick,
  label = "Next",
  countdownPrefix = "Next in",
  className = "",
  disabled = false,
  delayMs = 0,
}: AutoAdvanceButtonProps) {
  const [remainingTime, setRemainingTime] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  const [isDelaying, setIsDelaying] = useState(delayMs > 0);
  const baseRemainingRef = useRef(duration);
  const timerStartRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);
  const onClickRef = useRef(onClick);

  onClickRef.current = onClick;

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    setRemainingTime(duration);
    baseRemainingRef.current = duration;
    hasCompletedRef.current = false;
    setIsDelaying(delayMs > 0);
  }, [duration, delayMs]);

  useEffect(() => {
    if (delayMs > 0 && isDelaying) {
      const delayTimeout = setTimeout(() => setIsDelaying(false), delayMs);
      return () => clearTimeout(delayTimeout);
    }
  }, [delayMs, isDelaying]);

  useEffect(() => {
    if (disabled || isDelaying) {
      clearTimers();
      return;
    }

    if (isPaused) {
      if (timerStartRef.current > 0) {
        const elapsed = Date.now() - timerStartRef.current;
        const newRemaining = Math.max(0, baseRemainingRef.current - elapsed);
        baseRemainingRef.current = newRemaining;
        setRemainingTime(newRemaining);
      }
      clearTimers();
      return;
    }

    timerStartRef.current = Date.now();

    timeoutRef.current = setTimeout(() => {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onClickRef.current();
      }
    }, baseRemainingRef.current);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - timerStartRef.current;
      const newRemaining = Math.max(0, baseRemainingRef.current - elapsed);
      setRemainingTime(newRemaining);
    }, 50);

    return clearTimers;
  }, [isPaused, disabled, clearTimers]);

  const handleClick = () => {
    if (hasCompletedRef.current || disabled) return;
    hasCompletedRef.current = true;
    clearTimers();
    onClick();
  };

  const handleMouseEnter = () => {
    if (!disabled) setIsPaused(true);
  };

  const handleMouseLeave = () => {
    if (!disabled) setIsPaused(false);
  };

  const progressPercent = ((duration - remainingTime) / duration) * 100;
  const secondsLeft = Math.ceil(remainingTime / 1000);
  const displayText = isDelaying || isPaused ? label : `${countdownPrefix} ${secondsLeft}...`;

  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      className={`relative w-full h-14 text-lg font-bold rounded-xl overflow-hidden transition-all ${
        disabled
          ? "bg-white/10 text-gray-500 cursor-not-allowed"
          : "bg-gradient-to-r from-yellow-400 to-amber-500 text-black cursor-pointer hover:shadow-[0_0_30px_rgba(250,204,21,0.3)]"
      } ${className}`}
      data-testid="button-form-auto-advance"
    >
      {!disabled && !isDelaying && (
        <div
          className="absolute bottom-0 left-0 h-1.5 bg-amber-700/60 rounded-b-xl transition-none"
          style={{ width: `${progressPercent}%` }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center">
        {displayText}
        <ChevronRight className="w-5 h-5 ml-2" />
      </span>
    </button>
  );
}

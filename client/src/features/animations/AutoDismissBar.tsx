import { useState, useEffect, useRef, useCallback } from "react";

interface AutoDismissBarProps {
  duration?: number;
  onComplete: () => void;
  isPaused?: boolean;
  isVisible?: boolean;
  showCountdown?: boolean;
  countdownLabel?: string;
  className?: string;
}

export function AutoDismissBar({
  duration = 5000,
  onComplete,
  isPaused = false,
  isVisible = true,
  showCountdown = true,
  countdownLabel = "Closing in",
  className = "",
}: AutoDismissBarProps) {
  const [remainingTime, setRemainingTime] = useState(duration);
  const baseRemainingRef = useRef(duration);
  const timerStartRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  
  onCompleteRef.current = onComplete;

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
    if (isVisible) {
      setRemainingTime(duration);
      baseRemainingRef.current = duration;
    }
  }, [isVisible, duration]);

  useEffect(() => {
    if (!isVisible) {
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
      onCompleteRef.current();
    }, baseRemainingRef.current);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - timerStartRef.current;
      const newRemaining = Math.max(0, baseRemainingRef.current - elapsed);
      setRemainingTime(newRemaining);
    }, 50);

    return clearTimers;
  }, [isVisible, isPaused, clearTimers]);

  if (!isVisible) return null;

  const progressPercent = (remainingTime / duration) * 100;
  const secondsLeft = Math.ceil(remainingTime / 1000);

  return (
    <div className={`w-full ${className}`}>
      {showCountdown && (
        <p className="text-xs text-gray-400 text-center mb-2">
          {countdownLabel} {secondsLeft}...
        </p>
      )}
      <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

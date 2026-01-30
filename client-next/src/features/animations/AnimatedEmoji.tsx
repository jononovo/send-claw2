import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type EmojiAnimation = 
  | "disco-bounce" 
  | "salsa-spin" 
  | "breakdance" 
  | "wiggle" 
  | "pulse" 
  | "bounce"
  | "none";

export type EggState = "egg" | "cracked" | "hatched";

interface AnimatedEmojiProps {
  emoji: string;
  animation?: EmojiAnimation;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  autoPlay?: boolean;
  duration?: number;
  onClick?: () => void;
  "data-testid"?: string;
}

const sizeClasses = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-5xl",
};

const animationClasses: Record<EmojiAnimation, string> = {
  "disco-bounce": "animate-disco-bounce",
  "salsa-spin": "animate-salsa-spin",
  "breakdance": "animate-breakdance",
  wiggle: "",
  pulse: "",
  bounce: "",
  none: "",
};

const wiggleVariants = {
  idle: { y: 0, rotate: 0 },
  wiggle: {
    y: [0, -4, 0, -2, 0],
    rotate: [0, -3, 3, -2, 0],
    transition: { duration: 1.2, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const pulseVariants = {
  idle: { scale: 1 },
  pulse: {
    scale: [1, 1.15, 1],
    transition: { duration: 0.6, ease: "easeInOut" },
  },
};

const bounceVariants = {
  idle: { y: 0 },
  bounce: {
    y: [0, -8, 0],
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export function AnimatedEmoji({
  emoji,
  animation = "none",
  size = "md",
  className,
  autoPlay = false,
  duration,
  onClick,
  "data-testid": testId,
}: AnimatedEmojiProps) {
  const [isAnimating, setIsAnimating] = useState(autoPlay);

  useEffect(() => {
    if (autoPlay && duration) {
      const timer = setTimeout(() => setIsAnimating(false), duration);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, duration]);

  const useCssAnimation = ["disco-bounce", "salsa-spin", "breakdance"].includes(animation);

  if (useCssAnimation) {
    return (
      <span
        className={cn(
          sizeClasses[size],
          isAnimating && animationClasses[animation],
          "inline-block transition-transform",
          onClick && "cursor-pointer hover:scale-110",
          className
        )}
        onClick={onClick}
        data-testid={testId}
      >
        {emoji}
      </span>
    );
  }

  const variants = 
    animation === "wiggle" ? wiggleVariants :
    animation === "pulse" ? pulseVariants :
    animation === "bounce" ? bounceVariants :
    { idle: {}, active: {} };

  return (
    <motion.span
      className={cn(
        sizeClasses[size],
        "inline-block",
        onClick && "cursor-pointer",
        className
      )}
      variants={variants}
      initial="idle"
      animate={isAnimating ? animation : "idle"}
      whileHover={onClick ? { scale: 1.1 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      onClick={() => {
        if (onClick) onClick();
        if (!autoPlay) {
          setIsAnimating(true);
          setTimeout(() => setIsAnimating(false), 1200);
        }
      }}
      data-testid={testId}
    >
      {emoji}
    </motion.span>
  );
}

interface EggStateEmojiProps {
  state: EggState;
  isNew?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
  "data-testid"?: string;
}

const EGG_EMOJIS: Record<EggState, string> = {
  egg: "🥚",
  cracked: "🐣",
  hatched: "🐥",
};

export function EggStateEmoji({
  state,
  isNew = false,
  size = "lg",
  className,
  onClick,
  "data-testid": testId,
}: EggStateEmojiProps) {
  const emoji = EGG_EMOJIS[state];
  const shouldAnimate = state === "cracked" && isNew;

  return (
    <AnimatedEmoji
      emoji={emoji}
      animation={shouldAnimate ? "disco-bounce" : "none"}
      size={size}
      className={cn(
        state === "hatched" && "hover:scale-110",
        className
      )}
      autoPlay={shouldAnimate}
      duration={5000}
      onClick={onClick}
      data-testid={testId}
    />
  );
}

interface DucklingMascotProps {
  size?: "sm" | "md" | "lg" | "xl";
  autoWiggle?: boolean;
  wiggleInterval?: number;
  className?: string;
  onClick?: () => void;
  isHappy?: boolean;
  "data-testid"?: string;
}

export function DucklingMascot({
  size = "md",
  autoWiggle = false,
  wiggleInterval = 180000,
  className,
  onClick,
  isHappy = false,
  "data-testid": testId,
}: DucklingMascotProps) {
  const [shouldWiggle, setShouldWiggle] = useState(false);

  useEffect(() => {
    if (!autoWiggle) return;

    const triggerWiggle = () => {
      setShouldWiggle(true);
      setTimeout(() => setShouldWiggle(false), 1500);
    };

    const interval = setInterval(triggerWiggle, wiggleInterval);
    return () => clearInterval(interval);
  }, [autoWiggle, wiggleInterval]);

  const emoji = isHappy ? "😊" : "🐥";

  return (
    <motion.span
      className={cn(
        sizeClasses[size],
        "inline-block",
        onClick && "cursor-pointer",
        className
      )}
      animate={{
        y: shouldWiggle ? [0, -4, 0, -2, 0] : 0,
      }}
      transition={{
        y: { duration: 1.2, ease: [0.25, 0.1, 0.25, 1] },
      }}
      whileHover={onClick ? { scale: 1.1 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      onClick={onClick}
      data-testid={testId}
    >
      {emoji}
    </motion.span>
  );
}

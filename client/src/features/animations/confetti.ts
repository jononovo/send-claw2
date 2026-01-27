import confetti from "canvas-confetti";

export type ConfettiPreset = 
  | "sectionComplete"
  | "finalComplete" 
  | "challengeComplete"
  | "unlock"
  | "dailyComplete"
  | "celebrate"
  | "campaignComplete";

export interface ConfettiOptions {
  duration?: number;
  origin?: { x: number; y: number };
}

const COLORS = {
  gold: ["#fbbf24", "#f59e0b", "#d97706"],
  goldExtended: ["#fbbf24", "#f59e0b", "#d97706", "#10b981", "#3b82f6"],
  unlock: ["#fbbf24", "#f59e0b", "#d97706", "#fef3c7", "#22c55e", "#10b981", "#a3e635"],
  celebration: ["#FFD700", "#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0"],
};

function fireContinuousBurst(
  durationMs: number,
  particleCount: number,
  colors: string[],
  originY = 0.7
): void {
  const end = Date.now() + durationMs;

  const frame = () => {
    confetti({
      particleCount,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: originY },
      colors,
    });
    confetti({
      particleCount,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: originY },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}

export function fireTouchConfetti(): void {
  fireContinuousBurst(450, 2, COLORS.gold, 0.7);
}

export function fireShortConfetti(): void {
  fireContinuousBurst(500, 2, COLORS.gold, 0.7);
}

export function fireFinalConfetti(): void {
  const duration = 3000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.6 },
      colors: COLORS.goldExtended,
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.6 },
      colors: COLORS.goldExtended,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}

export function fireLongConfetti(): void {
  fireContinuousBurst(2000, 3, COLORS.gold, 0.7);
}

export function fireUnlockConfetti(buttonElement?: HTMLElement | null): void {
  let x = 0.5;
  let y = 0.5;

  if (buttonElement) {
    const rect = buttonElement.getBoundingClientRect();
    x = (rect.left + rect.width / 2) / window.innerWidth;
    y = (rect.top + rect.height / 2) / window.innerHeight;
  }

  confetti({
    particleCount: 80,
    spread: 60,
    origin: { x, y },
    colors: ["#fbbf24", "#f59e0b", "#d97706", "#fef3c7"],
    shapes: ["circle", "square"],
    scalar: 1.2,
  });

  setTimeout(() => {
    confetti({
      particleCount: 40,
      spread: 100,
      origin: { x, y },
      colors: ["#22c55e", "#10b981", "#a3e635"],
      shapes: ["circle"],
      scalar: 0.8,
    });
  }, 150);
}

export function fireDailyCompleteConfetti(): void {
  confetti({
    particleCount: 100,
    spread: 60,
    origin: { x: 0.5, y: 0.1 },
  });
}

export function fireCelebrateConfetti(): void {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#fbbf24", "#f59e0b", "#22c55e", "#10b981"],
  });
}

export function fireCampaignCompleteConfetti(): void {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
}

export function fireConfetti(preset: ConfettiPreset, options?: ConfettiOptions): void {
  switch (preset) {
    case "sectionComplete":
      fireShortConfetti();
      break;
    case "finalComplete":
      fireFinalConfetti();
      break;
    case "challengeComplete":
      fireLongConfetti();
      break;
    case "unlock":
      fireUnlockConfetti();
      break;
    case "dailyComplete":
      fireDailyCompleteConfetti();
      break;
    case "celebrate":
      fireCelebrateConfetti();
      break;
    case "campaignComplete":
      fireCampaignCompleteConfetti();
      break;
    default:
      fireCelebrateConfetti();
  }
}

export function useConfetti() {
  return {
    fire: fireConfetti,
    fireTouchConfetti,
    fireShortConfetti,
    fireLongConfetti,
    fireFinalConfetti,
    fireUnlockConfetti,
    fireDailyCompleteConfetti,
    fireCelebrateConfetti,
    fireCampaignCompleteConfetti,
  };
}

import { useEffect, useState } from "react";

// Animation states
type EmojiState = 'egg' | 'hatching' | 'chick' | 'settled' | 'dancing1' | 'dancing2' | 'dancing3';

// Dance definitions
const DANCE_ANIMATIONS = {
  dancing1: "animate-disco-bounce",
  dancing2: "animate-salsa-spin",
  dancing3: "animate-breakdance"
};

// Duration settings
const DANCE_DURATION = 5000; // 5 seconds
const DANCE_INTERVAL = 180000; // 3 minutes

export function EggAnimation() {
  const [state, setState] = useState<EmojiState>('egg');
  const [currentDance, setCurrentDance] = useState<number>(1);

  useEffect(() => {
    // Starting act (warmup) sequence with updated timings
    const startSequence = setTimeout(() => {
      // Start after 7 seconds initial delay
      setState('hatching');
    }, 7000);

    const chickTimeout = setTimeout(() => {
      // Transform to chick 3 seconds after hatching starts
      setState('chick');
    }, 10000); // 7s initial + 3s hatching

    const settleTimeout = setTimeout(() => {
      // Settle after 2 seconds of bouncing
      setState('settled');
    }, 15000); // 7s initial + 3s hatching + 3s chick appearance + 2s bounce

    return () => {
      clearTimeout(startSequence);
      clearTimeout(chickTimeout);
      clearTimeout(settleTimeout);
    };
  }, []);

  useEffect(() => {
    if (state === 'settled') {
      // Start the dance rotation
      const danceRotation = setInterval(() => {
        // Trigger dance
        setState(`dancing${currentDance}` as EmojiState);

        // Schedule end of dance
        setTimeout(() => {
          setState('settled');
          // Move to next dance routine
          setCurrentDance(current => (current % 3) + 1);
        }, DANCE_DURATION);
      }, DANCE_INTERVAL);

      return () => clearInterval(danceRotation);
    }
  }, [state, currentDance]);

  // Get the appropriate animation class based on state
  const animationClass = state === 'egg' ? 'animate-egg-shake' :
    state === 'hatching' ? 'animate-hatching-wobble' :
    state === 'chick' ? 'animate-chick-bounce' :
    state.startsWith('dancing') ? DANCE_ANIMATIONS[state as keyof typeof DANCE_ANIMATIONS] :
    '';

  return (
    <div className="flex items-center gap-2">
      <span 
        className={`text-4xl transform transition-transform duration-300 ${animationClass}`}
      >
        {state === 'egg' ? '🥚' : 
         state === 'hatching' ? '🐣' : 
         '🐥'}
      </span>
    </div>
  );
}
/**
 * Credit Sparkle Trail Animation
 * 
 * Animates sparkle particles from a source element (credit badge) 
 * to the credits display in the header.
 */

interface SparkleConfig {
  size: number;
  delay: number;
  offsetX: number;
  offsetY: number;
}

// Increased sparkle sizes for more prominence
const SPARKLE_CONFIGS: SparkleConfig[] = [
  { size: 32, delay: 0, offsetX: 0, offsetY: 0 },
  { size: 24, delay: 70, offsetX: -10, offsetY: 8 },
  { size: 18, delay: 140, offsetX: 10, offsetY: -6 },
];

const ANIMATION_DURATION = 1100; // ms
const WAVE_DELAYS = [0, 200, 500]; // ms delays for each wave (0, 200, 500 = third wave 300ms after second)

/**
 * Play a coin/sparkle sound effect using Web Audio API
 */
function playCoinSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant coin chime sound
    const playTone = (frequency: number, startTime: number, duration: number, volume: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, startTime);
      
      // Envelope for pleasant sound
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    
    // Coin chime: ascending notes (subtle volume)
    playTone(880, now, 0.15, 0.04);        // A5
    playTone(1100, now + 0.08, 0.12, 0.035); // C#6
    playTone(1320, now + 0.15, 0.2, 0.03); // E6
    
  } catch (e) {
    // Audio not supported, silently fail
    console.debug('[SparkleTrail] Audio not available');
  }
}

function createSparkleElement(
  startX: number,
  startY: number,
  config: SparkleConfig,
  index: number
): HTMLDivElement {
  const sparkle = document.createElement('div');
  
  // Enhanced glow effect for more prominence
  sparkle.style.cssText = `
    position: fixed;
    left: ${startX + config.offsetX}px;
    top: ${startY + config.offsetY}px;
    width: ${config.size}px;
    height: ${config.size}px;
    background: radial-gradient(circle,
      rgba(255,255,255,1) 0%,
      rgba(255,223,0,0.8) 30%,
      rgba(255,180,0,0.5) 50%,
      transparent 70%);
    border-radius: 50%;
    pointer-events: none;
    z-index: ${10001 - index};
    box-shadow: 0 0 ${config.size * 0.6}px rgba(255,215,0,0.8),
                0 0 ${config.size * 1.2}px rgba(255,180,0,0.5),
                0 0 ${config.size * 2}px rgba(255,150,0,0.3);
    transition: left ${ANIMATION_DURATION}ms cubic-bezier(0.25, 0.1, 0.25, 1),
                top ${ANIMATION_DURATION}ms cubic-bezier(0.25, 0.1, 0.25, 1),
                transform ${ANIMATION_DURATION}ms ease-out,
                opacity ${ANIMATION_DURATION}ms ease-out;
  `;
  
  return sparkle;
}

function applyBounceEffect(element: Element): void {
  const htmlElement = element as HTMLElement;
  const originalTransition = htmlElement.style.transition;
  const originalTransform = htmlElement.style.transform;
  
  htmlElement.style.transition = 'transform 0.2s ease-out';
  htmlElement.style.transform = 'scale(1.2)';
  
  setTimeout(() => {
    htmlElement.style.transform = originalTransform || 'scale(1)';
    setTimeout(() => {
      htmlElement.style.transition = originalTransition;
    }, 200);
  }, 200);
}

/**
 * Find the credits display target element in the header
 */
function findCreditsTarget(): Element | null {
  return document.querySelector('[data-credits-target]');
}

/**
 * Run a single sparkle animation wave
 */
function runSparkleWave(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  targetElement: Element | null,
  applyBounce: boolean,
  waveIndex: number
): void {
  SPARKLE_CONFIGS.forEach((config, index) => {
    setTimeout(() => {
      const sparkle = createSparkleElement(startX, startY, config, index);
      document.body.appendChild(sparkle);

      requestAnimationFrame(() => {
        sparkle.style.left = `${endX}px`;
        sparkle.style.top = `${endY}px`;
        sparkle.style.transform = 'scale(0.4)';
        sparkle.style.opacity = '0';
      });

      setTimeout(() => {
        sparkle.remove();
      }, ANIMATION_DURATION + 50);
    }, config.delay);
  });

  // Apply bounce if requested (typically only on last wave)
  if (applyBounce && targetElement) {
    setTimeout(() => {
      applyBounceEffect(targetElement);
    }, ANIMATION_DURATION);
  }
}

/**
 * Animate sparkle particles from a source element to the credits display
 * Runs the animation in 3 waves (0ms, 200ms, 500ms) for extra prominence
 * 
 * @param sourceElement - The element to animate from (credit badge/chip)
 * @param options - Optional configuration
 * @returns Promise that resolves when animation completes
 */
export function animateCreditSparkles(
  sourceElement: HTMLElement | null,
  options: {
    targetElement?: Element | null;
    onComplete?: () => void;
    bounce?: boolean;
    playSound?: boolean;
  } = {}
): Promise<void> {
  return new Promise((resolve) => {
    const { 
      targetElement = findCreditsTarget(), 
      onComplete,
      bounce = true,
      playSound = true
    } = options;

    if (!sourceElement) {
      console.warn('[SparkleTrail] No source element provided');
      resolve();
      return;
    }

    if (!targetElement) {
      console.warn('[SparkleTrail] No target element found. Add data-credits-target to the credits display.');
      resolve();
      return;
    }

    const sourceRect = sourceElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    const startX = sourceRect.left + sourceRect.width / 2;
    const startY = sourceRect.top + sourceRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    // Play sound on first wave
    if (playSound) {
      playCoinSound();
    }

    // Run all waves with their respective delays
    const lastWaveIndex = WAVE_DELAYS.length - 1;
    WAVE_DELAYS.forEach((delay, waveIndex) => {
      setTimeout(() => {
        const isLastWave = waveIndex === lastWaveIndex;
        runSparkleWave(startX, startY, endX, endY, targetElement, bounce && isLastWave, waveIndex);
      }, delay);
    });

    // Resolve after all animations complete
    const lastWaveDelay = WAVE_DELAYS[WAVE_DELAYS.length - 1];
    const totalDuration = ANIMATION_DURATION + lastWaveDelay + 250;
    setTimeout(() => {
      onComplete?.();
      resolve();
    }, totalDuration);
  });
}

/**
 * Hook for using sparkle animation in React components
 */
export function useSparkleTrail() {
  return {
    animateCreditSparkles,
    findCreditsTarget,
  };
}

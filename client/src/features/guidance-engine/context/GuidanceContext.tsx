import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import type { GuidanceContextValue, QuestTrigger, Challenge } from "../types";
import { useGuidanceEngine } from "../hooks/useGuidanceEngine";
import { QUESTS, resolveDelay } from "../quests";
import { useAuth } from "@/hooks/use-auth";
import {
  ElementHighlight,
  GuidanceTooltip,
  FluffyGuide,
  QuestProgressHeader,
  ChallengeComplete,
} from "../components";
import { GuidanceVideoPlayer, getChallengeVideo } from "../video";

const GuidanceContext = createContext<GuidanceContextValue | null>(null);

const defaultGuidanceValue: GuidanceContextValue = {
  state: {
    isActive: false,
    currentQuestId: null,
    currentChallengeIndex: 0,
    currentStepIndex: 0,
    completedQuests: [],
    completedChallenges: {},
    isHeaderVisible: false,
    playbackMode: "guide",
  },
  currentQuest: null,
  currentChallenge: null,
  currentStep: null,
  startQuest: () => {},
  startNextChallenge: () => {},
  advanceStep: () => {},
  previousStep: () => {},
  completeChallenge: () => {},
  pauseGuidance: () => {},
  resumeGuidance: () => {},
  toggleHeader: () => {},
  resetProgress: () => {},
  restartChallenge: () => {},
  getChallengeProgress: () => ({ completed: 0, total: 0 }),
  getQuestProgress: () => ({ completed: 0, total: 0 }),
  startChallenge: () => {},
  stopChallenge: () => {},
  isTestMode: false,
  setPlaybackMode: () => {},
  videoTimestamps: [],
  setVideoTimestamps: () => {},
  recording: { isRecording: false, steps: [], selectedQuestId: null, startRoute: null, includeVideo: false, videoBlob: null, videoStartTime: null, videoUploadId: null, videoUploadStatus: 'idle' },
  startRecording: () => {},
  stopRecording: () => [],
  clearRecording: () => {},
  setVideoBlob: () => {},
  setVideoUploadStatus: () => {},
  refreshChallengeVideo: async () => {},
};

/**
 * Returns the guidance context, or safe defaults if the provider hasn't loaded yet.
 * 
 * Why defaults instead of throwing:
 * GuidanceProvider is lazy-loaded to reduce the critical rendering path (~70KB deferred).
 * Components using this hook render immediately with no-op functions and empty state,
 * then automatically upgrade once the provider loads. This allows the landing page
 * and other routes to render without waiting for the guidance engine.
 */
export function useGuidance() {
  const context = useContext(GuidanceContext);
  return context ?? defaultGuidanceValue;
}

interface GuidanceProviderProps {
  children: React.ReactNode;
  autoStartForNewUsers?: boolean;
}

const GUIDANCE_ENABLED_ROUTES = ["/app", "/quests", "/contacts", "/campaigns", "/replies", "/account", "/strategy"];

function isGuidanceEnabledRoute(location: string): boolean {
  return GUIDANCE_ENABLED_ROUTES.some(route => location === route || location.startsWith(route + "/"));
}

function getTriggerStorageKey(questId: string): string {
  return `fluffy-quest-triggered-${questId}`;
}

function hasQuestBeenTriggered(questId: string): boolean {
  return localStorage.getItem(getTriggerStorageKey(questId)) === "true";
}

function markQuestAsTriggered(questId: string): void {
  localStorage.setItem(getTriggerStorageKey(questId), "true");
}

function isRouteMatch(currentLocation: string, triggerRoute: string): boolean {
  return currentLocation === triggerRoute || currentLocation.startsWith(triggerRoute + "/");
}

export function GuidanceProvider({ children, autoStartForNewUsers = true }: GuidanceProviderProps) {
  const [location, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const engine = useGuidanceEngine({ 
    authReady: !authLoading, 
    userId: user?.id ?? null 
  });
  const [showChallengeComplete, setShowChallengeComplete] = useState(false);
  const [completedChallengeName, setCompletedChallengeName] = useState("");
  const [completedChallengeMessage, setCompletedChallengeMessage] = useState("");
  const [completedChallengeCredits, setCompletedChallengeCredits] = useState<number>(0);
  const previousStepKey = useRef<string | null>(null);
  const shownChallengeCompletionRef = useRef<string | null>(null);
  const advanceDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Simple tooltip visibility: ref for state, counter to force re-render
  const tooltipHiddenRef = useRef(false);
  const [, setVisibilityTick] = useState(0);
  
  // Video playback state
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoCurrentTimeMs, setVideoCurrentTimeMs] = useState(0);
  const lastAdvancedStepRef = useRef<number>(-1);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingInProgressRef = useRef<boolean>(false);
  const completionScheduledRef = useRef<boolean>(false);
  const completionTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Early tooltip visibility - tooltip appears 1.2 seconds before action in show mode
  const [showTooltipEarly, setShowTooltipEarly] = useState(false);
  
  // Stable refs for engine functions to avoid effect re-runs when engine object changes
  const startQuestRef = useRef(engine.startQuest);
  startQuestRef.current = engine.startQuest;
  const advanceStepRef = useRef(engine.advanceStep);
  advanceStepRef.current = engine.advanceStep;
  const pauseGuidanceRef = useRef(engine.pauseGuidance);
  pauseGuidanceRef.current = engine.pauseGuidance;
  const setVideoTimestampsRef = useRef(engine.setVideoTimestamps);
  setVideoTimestampsRef.current = engine.setVideoTimestamps;

  const { state, currentQuest, currentChallenge, currentStep, getChallengeProgress, videoTimestamps } = engine;

  const isOnEnabledRoute = isGuidanceEnabledRoute(location);
  const isOnAppRoute = location === "/app" || location.startsWith("/app/");

  // Handle route-based navigation for steps that require a specific page
  // Only auto-navigate when STEP changes (advancing through quest), not when user manually navigates
  useEffect(() => {
    if (!state.isActive || !currentStep?.route) {
      // Reset ref when guidance becomes inactive so next activation will check route
      if (!state.isActive) previousStepKey.current = null;
      return;
    }
    
    const stepKey = `${state.currentQuestId}-${state.currentChallengeIndex}-${state.currentStepIndex}`;
    
    // Only auto-navigate when step changes, not on every location change
    if (previousStepKey.current !== stepKey) {
      previousStepKey.current = stepKey;
      
      const expectedRoute = currentStep.route;
      const isOnCorrectRoute = location === expectedRoute || location.startsWith(expectedRoute + "/");
      
      if (!isOnCorrectRoute) {
        navigate(expectedRoute);
      }
    }
  }, [state.isActive, currentStep, state.currentQuestId, state.currentChallengeIndex, state.currentStepIndex, location, navigate]);

  const refreshChallengeVideo = useCallback(async (challengeId: string) => {
    try {
      const video = await getChallengeVideo(challengeId);
      if (video?.url) {
        setVideoUrl(video.url);
        setShowVideo(true);
      }
    } catch {
    }
  }, []);

  // Fetch guidance video for current challenge and store timestamps
  useEffect(() => {
    if (!state.isActive || !currentChallenge?.id) {
      setVideoUrl(null);
      setShowVideo(false);
      setVideoTimestampsRef.current([]);
      return;
    }

    let cancelled = false;
    const fetchStart = Date.now();
    console.log(`[TIMING ${fetchStart}] Fetching video for challenge: ${currentChallenge.id}`);
    getChallengeVideo(currentChallenge.id)
      .then((video) => {
        if (cancelled) return;
        const now = Date.now();
        if (video?.url) {
          setVideoUrl(video.url);
          setShowVideo(true);
          if (video.timestamps && Array.isArray(video.timestamps)) {
            console.log(`[TIMING ${now}] Timestamps LOADED (took ${now - fetchStart}ms): ${JSON.stringify(video.timestamps)}`);
            setVideoTimestampsRef.current(video.timestamps);
          } else {
            console.log(`[TIMING ${now}] Video loaded but NO timestamps`);
          }
        } else {
          setVideoUrl(null);
          setShowVideo(false);
          setVideoTimestampsRef.current([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVideoUrl(null);
          setShowVideo(false);
          setVideoTimestampsRef.current([]);
        }
      });

    return () => { cancelled = true; };
  }, [state.isActive, currentChallenge?.id]);

  // Auto-resume on navigation removed - guidance should only start via explicit triggers
  // Users can manually resume by clicking Fluffy if they want to continue a paused challenge

  // Show-me mode with timestamps: advance steps based on actual video playback time
  // Steps show at their exact recorded timestamp - simple and direct
  useEffect(() => {
    const now = Date.now();
    // Only run when in show mode with timestamps
    if (!state.isActive || state.playbackMode !== "show" || !currentChallenge) {
      return;
    }

    if (videoTimestamps.length === 0 || !isVideoPlaying) {
      return;
    }

    const currentStepIdx = state.currentStepIndex;
    const totalSteps = currentChallenge.steps.length;

    // Don't advance past the last step
    if (currentStepIdx >= totalSteps - 1) {
      return;
    }

    // Find the timestamp for the next step's action
    // For step -1 (initial state in show mode), the next step is 0
    const nextStepIdx = currentStepIdx + 1;
    const nextStepTimestamp = videoTimestamps.find(t => t.stepIndex === nextStepIdx);

    if (nextStepTimestamp) {
      // Advance to next step when video reaches the step's timestamp
      // BUT wait for typing to complete if typing is in progress
      if (videoCurrentTimeMs >= nextStepTimestamp.timestamp && nextStepIdx > lastAdvancedStepRef.current) {
        if (typingInProgressRef.current) {
          console.log(`[TIMING ${now}] WAITING for typing to complete before advancing to step ${nextStepIdx}`);
          return;
        }
        console.log(`[TIMING ${now}] STEP ADVANCING to step ${nextStepIdx} at videoTime ${videoCurrentTimeMs}ms (timestamp: ${nextStepTimestamp.timestamp}ms)`);
        lastAdvancedStepRef.current = nextStepIdx;
        advanceStepRef.current();
      }
    } else {
      console.log(`[TIMING ${now}] No timestamp found for next step ${nextStepIdx}`);
    }
  }, [state.isActive, state.playbackMode, state.currentStepIndex, currentChallenge, videoTimestamps, isVideoPlaying, videoCurrentTimeMs]);

  // Show-me mode fallback: Use fixed delay when no timestamps available
  useEffect(() => {
    // Clear any existing fallback timer
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    // Only run fallback when in show mode without timestamps
    if (!state.isActive || state.playbackMode !== "show" || !currentChallenge) {
      lastAdvancedStepRef.current = -1;
      return;
    }

    // If we have timestamps, let the video-based effect handle it
    if (videoTimestamps.length > 0) {
      return;
    }

    const currentStepIdx = state.currentStepIndex;
    const totalSteps = currentChallenge.steps.length;

    // Don't advance past the last step
    if (currentStepIdx >= totalSteps - 1) {
      return;
    }

    // Fallback: Use fixed delay + wait for action completion when no timestamps available
    // For step -1, advance immediately to show first step; for other steps wait for action
    const baseDelay = currentStepIdx === -1 ? 500 : 2000;
    
    const checkAndAdvance = () => {
      // For step -1, can always advance (no action to wait for)
      // For other steps, wait for the action to be performed
      const canAdvance = currentStepIdx === -1 || lastPerformedStepRef.current >= currentStepIdx;
      
      console.log(`[Show mode fallback] Check advance - step: ${currentStepIdx}, lastPerformed: ${lastPerformedStepRef.current}, canAdvance: ${canAdvance}`);
      
      if (canAdvance) {
        console.log(`[Show mode fallback] Advancing to next step after step ${currentStepIdx}`);
        advanceStepRef.current();
      } else {
        // Action not performed yet - check again after a short delay
        fallbackTimerRef.current = setTimeout(checkAndAdvance, 200);
      }
    };
    
    fallbackTimerRef.current = setTimeout(checkAndAdvance, baseDelay);

    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [state.isActive, state.playbackMode, state.currentStepIndex, currentChallenge, videoTimestamps]);

  // Reset step tracking when challenge changes
  useEffect(() => {
    // Reset to -2 so that advancing from -1 to 0 works correctly
    lastAdvancedStepRef.current = -2;
    typingInProgressRef.current = false;
    completionScheduledRef.current = false;
    setShowTooltipEarly(false);
    setVideoCurrentTimeMs(0);
    setIsVideoPlaying(false);
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
  }, [currentChallenge?.id]);
  
  // Show-me mode: Show tooltip 1.2 seconds before action executes
  useEffect(() => {
    if (!state.isActive || state.playbackMode !== "show" || !currentStep) {
      setShowTooltipEarly(false);
      return;
    }
    
    const hasTimestamps = videoTimestamps.length > 0;
    const currentStepTimestamp = videoTimestamps.find(t => t.stepIndex === state.currentStepIndex);
    
    if (hasTimestamps && currentStepTimestamp) {
      const tooltipShowTime = currentStepTimestamp.timestamp - 1200; // 1.2 seconds before action
      
      if (videoCurrentTimeMs >= tooltipShowTime && videoCurrentTimeMs < currentStepTimestamp.timestamp) {
        // We're in the tooltip preview window - show tooltip
        if (!showTooltipEarly) {
          console.log(`[TOOLTIP] Showing tooltip early at ${videoCurrentTimeMs}ms (action at ${currentStepTimestamp.timestamp}ms)`);
          setShowTooltipEarly(true);
        }
      } else if (videoCurrentTimeMs >= currentStepTimestamp.timestamp) {
        // Past the action time - tooltip should remain visible (action is happening)
        if (!showTooltipEarly) {
          setShowTooltipEarly(true);
        }
      } else {
        // Before tooltip window - hide tooltip
        if (showTooltipEarly) {
          setShowTooltipEarly(false);
        }
      }
    } else {
      // No timestamps - always show tooltip
      setShowTooltipEarly(true);
    }
  }, [state.isActive, state.playbackMode, state.currentStepIndex, currentStep, videoTimestamps, videoCurrentTimeMs, showTooltipEarly]);
  
  // Reset completion state when show mode is exited
  useEffect(() => {
    if (!state.isActive || state.playbackMode !== "show") {
      completionScheduledRef.current = false;
    }
  }, [state.isActive, state.playbackMode]);

  // Show-me mode: Perform actions automatically (click, type, etc.)
  // Actions are synced to video timestamps - they execute when video reaches the step's timestamp
  // IMPORTANT: Actions execute at their EXACT recorded timestamp, independent of tooltip timing
  const lastPerformedStepRef = useRef<number>(-1);
  
  useEffect(() => {
    // Only perform actions in show mode
    if (!state.isActive || state.playbackMode !== "show" || !currentStep) {
      lastPerformedStepRef.current = -1;
      return;
    }

    const now = Date.now();
    console.log(`[TIMING ${now}] Action effect triggered - stepIdx: ${state.currentStepIndex}, lastPerformed: ${lastPerformedStepRef.current}, action: ${currentStep.action}, value: ${currentStep.value}, videoTime: ${videoCurrentTimeMs}ms`);

    // Don't re-perform the same step
    if (state.currentStepIndex === lastPerformedStepRef.current) {
      console.log(`[TIMING ${now}] Skipping - already performed step ${state.currentStepIndex}`);
      return;
    }

    // Check if we have video timestamps to sync with
    const hasTimestamps = videoTimestamps.length > 0;
    const currentStepTimestamp = videoTimestamps.find(t => t.stepIndex === state.currentStepIndex);
    
    console.log(`[TIMING ${now}] Timestamp lookup - stepIdx: ${state.currentStepIndex}, found: ${JSON.stringify(currentStepTimestamp)}, videoTime: ${videoCurrentTimeMs}ms, hasTimestamps: ${hasTimestamps}`);
    
    if (hasTimestamps && currentStepTimestamp) {
      // Video hasn't reached this step's timestamp yet - don't perform action
      if (videoCurrentTimeMs < currentStepTimestamp.timestamp) {
        const waitTime = currentStepTimestamp.timestamp - videoCurrentTimeMs;
        console.log(`[TIMING ${now}] WAITING - video at ${videoCurrentTimeMs}ms, action scheduled at ${currentStepTimestamp.timestamp}ms, need to wait ${waitTime}ms more`);
        return;
      }
      const delay = videoCurrentTimeMs - currentStepTimestamp.timestamp;
      console.log(`[TIMING ${now}] READY to execute - video at ${videoCurrentTimeMs}ms, action timestamp was ${currentStepTimestamp.timestamp}ms (${delay}ms late)`);
    } else if (!hasTimestamps) {
      // No timestamps - execute action immediately (fallback mode)
      console.log(`[TIMING ${now}] No timestamps - executing action immediately for step ${state.currentStepIndex}`);
    }

    console.log(`[TIMING ${now}] EXECUTING action: ${currentStep.action} for step ${state.currentStepIndex}`);

    // Perform the action (video has reached the timestamp, or no timestamps available)
    const performAction = () => {
      const execTime = Date.now();
      try {
        const element = document.querySelector(currentStep.selector);
        console.log(`[TIMING ${execTime}] performAction() called - selector: "${currentStep.selector}", element found: ${!!element}`);
        if (!element) {
          console.warn(`[TIMING ${execTime}] Element NOT found: ${currentStep.selector}`);
          return;
        }

        lastPerformedStepRef.current = state.currentStepIndex;
        console.log(`[TIMING ${execTime}] Marked step ${state.currentStepIndex} as performed`);

        // Helper to schedule completion after last step
        const scheduleCompletionIfLastStep = () => {
          if (currentChallenge && state.currentStepIndex === currentChallenge.steps.length - 1 && !completionScheduledRef.current) {
            completionScheduledRef.current = true;
            console.log(`[COMPLETION] Last step performed - scheduling challenge completion in 1.5s`);
            completionTimerRef.current = setTimeout(() => {
              console.log(`[COMPLETION] Completing challenge - hiding highlight`);
              advanceStepRef.current();
            }, 1500);
          }
        };

        switch (currentStep.action) {
          case "click":
            // Simulate a click
            if (element instanceof HTMLElement) {
              console.log(`[TIMING ${execTime}] CLICK action - scrolling and clicking element`);
              // Scroll element into view first
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              // Create and dispatch a click event
              const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              });
              element.dispatchEvent(clickEvent);
              console.log(`[TIMING ${Date.now()}] CLICK dispatched`);
              scheduleCompletionIfLastStep();
            }
            break;

          case "type":
            // Type text into the input
            console.log(`[TIMING ${execTime}] TYPE action - element is input/textarea: ${element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement}, value: "${currentStep.value}"`);
            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
              // Scroll and focus
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.focus();
              
              // Get the value to type
              const valueToType = currentStep.value || '';
              
              // Calculate typing speed based on time until next step
              // This ensures typing finishes just before the next step's timestamp
              const currentStepTimestamp = videoTimestamps.find(t => t.stepIndex === state.currentStepIndex);
              const nextStepTimestamp = videoTimestamps.find(t => t.stepIndex === state.currentStepIndex + 1);
              
              let typingIntervalMs = 100; // Default: 100ms per character
              if (currentStepTimestamp && nextStepTimestamp && valueToType.length > 0) {
                const availableTimeMs = nextStepTimestamp.timestamp - currentStepTimestamp.timestamp;
                // Leave 500ms buffer before next step, divide remaining time by character count
                const calculatedInterval = Math.floor((availableTimeMs - 500) / valueToType.length);
                // Clamp between 50ms (fast) and 150ms (slow) per character
                typingIntervalMs = Math.max(50, Math.min(150, calculatedInterval));
                console.log(`[TIMING ${execTime}] TYPE - calculated interval: ${calculatedInterval}ms, using: ${typingIntervalMs}ms (available: ${availableTimeMs}ms for ${valueToType.length} chars)`);
              }
              
              console.log(`[TIMING ${execTime}] TYPE starting - "${valueToType}" (${valueToType.length} chars, ${typingIntervalMs}ms/char)`);
              
              // Get the native value setter to properly trigger React's state updates
              // React overrides the value setter, so we need to use the native one
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                element instanceof HTMLTextAreaElement 
                  ? window.HTMLTextAreaElement.prototype 
                  : window.HTMLInputElement.prototype, 
                'value'
              )?.set;
              
              if (!nativeInputValueSetter) {
                console.error('[TIMING] Could not get native value setter');
                return;
              }
              
              // Clear existing value using native setter
              nativeInputValueSetter.call(element, '');
              element.dispatchEvent(new Event('input', { bubbles: true }));
              
              // Mark typing as in progress (prevents step advancement until done)
              typingInProgressRef.current = true;
              
              // Simulate typing character by character for a realistic effect
              let charIndex = 0;
              let currentValue = '';
              const typeInterval = setInterval(() => {
                if (charIndex < valueToType.length) {
                  currentValue += valueToType[charIndex];
                  // Use native setter to bypass React's synthetic event system
                  nativeInputValueSetter.call(element, currentValue);
                  // Dispatch input event - React listens for this to update state
                  const inputEvent = new Event('input', { bubbles: true });
                  element.dispatchEvent(inputEvent);
                  charIndex++;
                } else {
                  clearInterval(typeInterval);
                  // Final dispatch to ensure React state is updated
                  const changeEvent = new Event('change', { bubbles: true });
                  element.dispatchEvent(changeEvent);
                  // Also trigger blur/focus cycle to ensure form validation picks up the value
                  element.blur();
                  element.focus();
                  // Mark typing as complete
                  typingInProgressRef.current = false;
                  console.log(`[TIMING ${Date.now()}] TYPE completed - "${valueToType}", element.value="${element.value}"`);
                  scheduleCompletionIfLastStep();
                }
              }, typingIntervalMs);
            }
            break;

          case "hover":
            // Simulate hover
            if (element instanceof HTMLElement) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
              scheduleCompletionIfLastStep();
            }
            break;

          case "view":
            // Just scroll into view
            if (element instanceof HTMLElement) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              scheduleCompletionIfLastStep();
            }
            break;
        }
      } catch (err) {
        console.error("[Show mode] Error performing action:", err);
      }
    };

    // Execute action immediately - actions happen at their exact recorded timestamp
    performAction();
  }, [state.isActive, state.playbackMode, state.currentStepIndex, currentStep, videoTimestamps, videoCurrentTimeMs]);

  useEffect(() => {
    if (!autoStartForNewUsers) return;
    if (authLoading) return;
    if (state.isActive) return;
    if (state.currentQuestId) return;

    const evaluateTrigger = (questId: string, trigger: QuestTrigger): boolean => {
      const requiresAuth = trigger.requiresAuth !== false;
      const once = trigger.once !== false;

      if (requiresAuth && !user) return false;
      if (once && hasQuestBeenTriggered(questId)) return false;
      if (state.completedQuests.includes(questId)) return false;

      if (trigger.route && !isRouteMatch(location, trigger.route)) return false;

      switch (trigger.type) {
        case "newUser":
          return state.completedQuests.length === 0;
        case "firstVisit":
          return true;
        case "route":
          return true;
        case "userEvent":
          return false;
        default:
          return false;
      }
    };

    for (const quest of QUESTS) {
      for (const challenge of quest.challenges) {
        if (!challenge.trigger) continue;
        if (challenge.trigger.type === "userEvent") continue;
        
        const shouldTrigger = evaluateTrigger(quest.id, challenge.trigger);

        if (shouldTrigger) {
          const delay = resolveDelay(challenge.startDelay, "startDelay");
          const timer = setTimeout(() => {
            startQuestRef.current(quest.id);
            markQuestAsTriggered(quest.id);
          }, delay);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [autoStartForNewUsers, authLoading, user, location, state.isActive, state.currentQuestId, state.completedQuests]);

  useEffect(() => {
    if (!autoStartForNewUsers) return;
    if (authLoading) return;

    const eventChallenges: { quest: typeof QUESTS[0]; challenge: Challenge }[] = [];
    for (const quest of QUESTS) {
      for (const challenge of quest.challenges) {
        if (challenge.trigger?.type === "userEvent" && challenge.trigger.eventName) {
          eventChallenges.push({ quest, challenge });
        }
      }
    }
    if (eventChallenges.length === 0) return;

    const handleUserEvent = (e: Event) => {
      const eventName = (e as CustomEvent).type;
      
      for (const { quest, challenge } of eventChallenges) {
        if (challenge.trigger?.eventName !== eventName) continue;
        
        const requiresAuth = challenge.trigger.requiresAuth !== false;
        const once = challenge.trigger.once !== false;

        if (requiresAuth && !user) continue;
        if (once && hasQuestBeenTriggered(quest.id)) continue;
        if (state.completedQuests.includes(quest.id)) continue;
        if (state.isActive || state.currentQuestId) continue;

        startQuestRef.current(quest.id);
        markQuestAsTriggered(quest.id);
        break;
      }
    };

    const eventNames = Array.from(new Set(eventChallenges.map(ec => ec.challenge.trigger!.eventName!)));
    eventNames.forEach(name => window.addEventListener(name, handleUserEvent));

    return () => {
      eventNames.forEach(name => window.removeEventListener(name, handleUserEvent));
    };
  }, [autoStartForNewUsers, authLoading, user, state.isActive, state.currentQuestId, state.completedQuests]);

  // Dispatch setupEvent when starting a challenge that requires it
  useEffect(() => {
    if (
      state.isActive &&
      state.currentStepIndex === 0 &&
      currentChallenge?.setupEvent &&
      currentStep?.route &&
      location === currentStep.route
    ) {
      // Delay to ensure target page is mounted and event listeners are attached
      const timer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent(currentChallenge.setupEvent!));
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [state.isActive, state.currentStepIndex, currentChallenge, currentStep, location]);

  useEffect(() => {
    if (isOnEnabledRoute && state.isActive && !state.isHeaderVisible && !engine.isTestMode) {
      engine.pauseGuidance();
    }
  }, [isOnEnabledRoute, state.isActive, state.isHeaderVisible, engine, engine.isTestMode]);

  // Reset tooltip visibility when step changes
  useEffect(() => {
    tooltipHiddenRef.current = false;
    setVisibilityTick(t => t + 1);
  }, [state.currentQuestId, state.currentChallengeIndex, state.currentStepIndex]);

  useEffect(() => {
    const selector = currentStep?.selector;
    const action = currentStep?.action;
    const advanceDelay = currentStep?.advanceDelay;
    
    if (!isOnEnabledRoute || !state.isActive || !selector) return;

    // Clear any existing timer when step changes
    if (advanceDelayTimerRef.current) {
      clearTimeout(advanceDelayTimerRef.current);
      advanceDelayTimerRef.current = null;
    }

    // Hide tooltip immediately, then advance after delay
    const hideAndAdvance = () => {
      if (advanceDelayTimerRef.current) return; // Prevent double-clicks
      tooltipHiddenRef.current = true;
      setVisibilityTick(t => t + 1);
      const delay = resolveDelay(advanceDelay, "advanceDelay");
      advanceDelayTimerRef.current = setTimeout(() => {
        advanceStepRef.current();
      }, delay);
    };

    let hasAdvancedForType = false;

    const isInteractiveElement = (el: Element): boolean => {
      const tagName = el.tagName.toLowerCase();
      const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
      if (interactiveTags.includes(tagName)) return true;
      
      const role = el.getAttribute('role');
      if (role === 'button' || role === 'link' || role === 'menuitem' || role === 'tab') return true;
      
      if ((el as HTMLElement).isContentEditable) return true;
      if (el.hasAttribute('onclick') || el.hasAttribute('tabindex')) return true;
      
      return false;
    };

    const isGuidanceUI = (el: Element): boolean => {
      return el.closest('[data-recorder-ui="true"]') !== null ||
             el.closest('[data-testid="guidance-tooltip"]') !== null ||
             el.closest('[data-testid="fluffy-guide"]') !== null;
    };

    const handleElementClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      let stepElement: Element | null = null;
      try {
        stepElement = document.querySelector(selector);
      } catch {
        // Invalid selector
      }
      
      // Check if click is on the target element - advance step
      if (stepElement && (stepElement === target || stepElement.contains(target))) {
        if (action === "click") {
          hideAndAdvance();
        }
        return;
      }

      // Check if click is on guidance UI - ignore
      if (isGuidanceUI(target)) {
        return;
      }

      // Check if click is on an interactive element outside target - pause guidance
      const clickPath = e.composedPath();
      for (const el of clickPath) {
        if (!(el instanceof Element)) continue;
        if (isInteractiveElement(el)) {
          pauseGuidanceRef.current();
          return;
        }
      }
    };

    const handleInput = (e: Event) => {
      // In "show" mode, step advancement is controlled by video timestamps, not user input
      if (state.playbackMode === "show") return;
      if (action !== "type" || hasAdvancedForType) return;
      
      const target = e.target as HTMLElement;
      const stepElement = document.querySelector(selector);
      
      if (stepElement && (stepElement === target || stepElement.contains(target))) {
        hasAdvancedForType = true;
        hideAndAdvance();
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pauseGuidanceRef.current();
      }
    };

    document.addEventListener("click", handleElementClick, true);
    document.addEventListener("keydown", handleKeyPress);
    document.addEventListener("input", handleInput, true);

    return () => {
      document.removeEventListener("click", handleElementClick, true);
      document.removeEventListener("keydown", handleKeyPress);
      document.removeEventListener("input", handleInput, true);
      if (advanceDelayTimerRef.current) {
        clearTimeout(advanceDelayTimerRef.current);
        advanceDelayTimerRef.current = null;
      }
    };
  }, [isOnEnabledRoute, state.isActive, state.playbackMode, currentStep?.selector, currentStep?.action, currentStep?.advanceDelay]);

  const prevCompletedChallengesRef = useRef<Record<string, string[]>>(
    JSON.parse(JSON.stringify(state.completedChallenges))
  );

  useEffect(() => {
    // Don't show completion modal in "show" mode - users are just watching a demo
    if (state.playbackMode === "show") {
      prevCompletedChallengesRef.current = JSON.parse(JSON.stringify(state.completedChallenges));
      return;
    }
    
    if (!state.isActive && currentChallenge && currentQuest) {
      const completedForQuest = state.completedChallenges[currentQuest.id] || [];
      const prevCompletedForQuest = prevCompletedChallengesRef.current[currentQuest.id] || [];
      
      const isNewCompletion = completedForQuest.includes(currentChallenge.id) && 
                             !prevCompletedForQuest.includes(currentChallenge.id);
      
      if (isNewCompletion && !showChallengeComplete) {
        setCompletedChallengeName(currentChallenge.name);
        setCompletedChallengeMessage(currentChallenge.completionMessage || "Great job!");
        setCompletedChallengeCredits(currentChallenge.completionCredits ?? 110);
        setShowChallengeComplete(true);
      }
    }
    
    prevCompletedChallengesRef.current = JSON.parse(JSON.stringify(state.completedChallenges));
  }, [state.isActive, state.completedChallenges, currentChallenge, currentQuest, showChallengeComplete, state.playbackMode]);

  const handleChallengeCompleteClose = useCallback(() => {
    setShowChallengeComplete(false);
    engine.pauseGuidance();
  }, [engine]);

  const handleNextChallenge = useCallback(() => {
    setShowChallengeComplete(false);
    engine.startNextChallenge();
  }, [engine]);

  const handleFluffyClick = useCallback(() => {
    if (state.isActive) {
      engine.pauseGuidance();
    } else {
      engine.resumeGuidance();
    }
  }, [state.isActive, engine]);

  const handleHeaderClose = useCallback(() => {
    engine.pauseGuidance();
    engine.toggleHeader();
  }, [engine]);

  const challengeProgress = getChallengeProgress();
  
  const contextValue = {
    ...engine,
    refreshChallengeVideo,
  };

  return (
    <GuidanceContext.Provider value={contextValue}>
      {/* Quest progress header renders before children to push content down */}
      {isOnEnabledRoute && (
        <QuestProgressHeader
          questName={currentQuest?.name || "Quest"}
          challengesCompleted={challengeProgress.completed}
          totalChallenges={challengeProgress.total}
          currentChallengeName={currentChallenge?.name}
          isVisible={state.isHeaderVisible}
          onClose={handleHeaderClose}
        />
      )}

      {children}

      {/* Other guidance UI elements render after children (overlays) */}
      {isOnEnabledRoute && (
        <>
          <FluffyGuide
            onClick={handleFluffyClick}
            isActive={state.isActive}
            onCloseGuide={engine.pauseGuidance}
          />

          <GuidanceVideoPlayer
            videoUrl={videoUrl}
            isVisible={showVideo && state.isActive}
            onClose={() => setShowVideo(false)}
            position="bottom-left"
            size="small"
            onTimeUpdate={setVideoCurrentTimeMs}
            onPlayStateChange={setIsVideoPlaying}
            canAutoPlay={state.playbackMode !== "show" || videoTimestamps.length > 0}
          />

          {state.isActive && currentStep && (
            <>
              <ElementHighlight
                targetSelector={currentStep.selector}
                isVisible={state.isActive && !tooltipHiddenRef.current && (state.playbackMode !== "show" || showTooltipEarly)}
                actionType={currentStep.action}
              />
              <GuidanceTooltip
                targetSelector={currentStep.selector}
                instruction={currentStep.instruction}
                position={currentStep.tooltipPosition || "auto"}
                isVisible={state.isActive && !tooltipHiddenRef.current && (state.playbackMode !== "show" || showTooltipEarly)}
                onDismiss={() => engine.advanceStep()}
                onBack={() => engine.previousStep()}
                onClose={() => engine.pauseGuidance()}
                stepNumber={state.currentStepIndex + 1}
                totalSteps={currentChallenge?.steps.length}
                playbackMode={state.playbackMode}
                hasVideo={!!videoUrl}
                onModeToggle={() => {
                  engine.setPlaybackMode(state.playbackMode === "guide" ? "show" : "guide");
                }}
              />
            </>
          )}

          <ChallengeComplete
            isVisible={showChallengeComplete}
            challengeName={completedChallengeName}
            message={completedChallengeMessage}
            creditsAwarded={completedChallengeCredits}
            onContinue={handleNextChallenge}
            onDismiss={handleChallengeCompleteClose}
          />
        </>
      )}
    </GuidanceContext.Provider>
  );
}

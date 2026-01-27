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
import { findElement } from "../utils/elementSelector";

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
  
  // Video playback state (video is visual companion, doesn't control timeline)
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoCurrentTimeMs, setVideoCurrentTimeMs] = useState(0);
  const typingInProgressRef = useRef<boolean>(false);
  const completionScheduledRef = useRef<boolean>(false);
  const completionTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Timing constants for highlight visibility
  const TYPING_INTERVAL_MS = 200;      // Fixed 200ms per character
  const CLICK_HIDE_DELAY_MS = 500;     // Highlight stays 500ms after click
  
  // Timeline-based show mode: all events scheduled upfront
  const [highlightVisible, setHighlightVisible] = useState(false);
  const [visibleStepIndex, setVisibleStepIndex] = useState<number>(-1);
  const timelineTimersRef = useRef<NodeJS.Timeout[]>([]);
  const timelineStartedRef = useRef<boolean>(false);
  
  // Helper to clear all timeline timers
  const clearTimelineTimers = useCallback(() => {
    timelineTimersRef.current.forEach(timer => clearTimeout(timer));
    timelineTimersRef.current = [];
    timelineStartedRef.current = false;
  }, []);
  
  // Helper to schedule a timer and track it for cleanup
  const scheduleTimelineEvent = useCallback((callback: () => void, delayMs: number) => {
    const timer = setTimeout(callback, Math.max(0, delayMs));
    timelineTimersRef.current.push(timer);
    return timer;
  }, []);
  
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
  // In show mode, use visibleStepIndex for earlier navigation (before action fires)
  // In guide mode, use engine's currentStepIndex
  useEffect(() => {
    if (!state.isActive) {
      previousStepKey.current = null;
      return;
    }
    
    // Determine which step to use for navigation
    // In show mode, use visibleStepIndex to navigate early (when highlight appears)
    // In guide mode, use currentStepIndex
    const activeStepIndex = state.playbackMode === "show" && visibleStepIndex >= 0 
      ? visibleStepIndex 
      : state.currentStepIndex;
    const activeStep = currentChallenge?.steps[activeStepIndex];
    
    if (!activeStep?.route) {
      return;
    }
    
    const stepKey = `${state.currentQuestId}-${state.currentChallengeIndex}-${activeStepIndex}`;
    
    // Only auto-navigate when step changes, not on every location change
    if (previousStepKey.current !== stepKey) {
      previousStepKey.current = stepKey;
      
      const expectedRoute = activeStep.route;
      const isOnCorrectRoute = location === expectedRoute || location.startsWith(expectedRoute + "/");
      
      if (!isOnCorrectRoute) {
        console.log(`[ROUTE] Navigating to ${expectedRoute} for step ${activeStepIndex}`);
        navigate(expectedRoute);
      }
    }
  }, [state.isActive, state.playbackMode, currentChallenge, currentStep, state.currentQuestId, state.currentChallengeIndex, state.currentStepIndex, visibleStepIndex, location, navigate]);

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

  // Reset state when challenge changes
  useEffect(() => {
    typingInProgressRef.current = false;
    completionScheduledRef.current = false;
    setHighlightVisible(false);
    setVisibleStepIndex(-1);
    clearTimelineTimers();
    setVideoCurrentTimeMs(0);
    setIsVideoPlaying(false);
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
  }, [currentChallenge?.id, clearTimelineTimers]);

  // Reset when show mode is exited
  useEffect(() => {
    if (!state.isActive || state.playbackMode !== "show") {
      completionScheduledRef.current = false;
      clearTimelineTimers();
      setHighlightVisible(false);
      setVisibleStepIndex(-1);
      timelineStartedRef.current = false;
    }
  }, [state.isActive, state.playbackMode, clearTimelineTimers]);

  // ============================================================================
  // TIMELINE-BASED SHOW MODE
  // All events (show highlight, execute action, hide highlight) are scheduled
  // upfront when show mode starts. Video plays alongside but doesn't control timing.
  // ============================================================================
  
  // Helper function to perform an action on an element
  const performActionOnElement = useCallback((
    stepIndex: number,
    step: { selector: string; contentMatch?: string; action: string; value?: string },
    steps: { selector: string; contentMatch?: string; action: string; value?: string }[],
    timestamps: { stepIndex: number; timestamp: number }[]
  ) => {
    const execTime = Date.now();
    try {
      const element = findElement(step.selector, step.contentMatch);
      console.log(`[TIMELINE ${execTime}] Action for step ${stepIndex}: ${step.action}, selector: "${step.selector}", contentMatch: "${step.contentMatch || 'none'}", found: ${!!element}`);
      
      if (!element) {
        console.warn(`[TIMELINE ${execTime}] Element NOT found: ${step.selector}`);
        return;
      }

      const isLastStep = stepIndex === steps.length - 1;

      switch (step.action) {
        case "click":
          if (element instanceof HTMLElement) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const clickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window
            });
            element.dispatchEvent(clickEvent);
            console.log(`[TIMELINE ${Date.now()}] CLICK dispatched for step ${stepIndex}`);
          }
          break;

        case "type":
          if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.focus();
            
            const valueToType = step.value || '';
            
            // Fixed typing speed: 200ms per character
            const typingIntervalMs = TYPING_INTERVAL_MS;
            
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              element instanceof HTMLTextAreaElement 
                ? window.HTMLTextAreaElement.prototype 
                : window.HTMLInputElement.prototype, 
              'value'
            )?.set;
            
            if (!nativeInputValueSetter) {
              console.error('[TIMELINE] Could not get native value setter');
              return;
            }
            
            nativeInputValueSetter.call(element, '');
            element.dispatchEvent(new Event('input', { bubbles: true }));
            
            typingInProgressRef.current = true;
            
            let charIndex = 0;
            let currentValue = '';
            const typeInterval = setInterval(() => {
              if (charIndex < valueToType.length) {
                currentValue += valueToType[charIndex];
                nativeInputValueSetter.call(element, currentValue);
                element.dispatchEvent(new Event('input', { bubbles: true }));
                charIndex++;
              } else {
                clearInterval(typeInterval);
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.blur();
                element.focus();
                typingInProgressRef.current = false;
                console.log(`[TIMELINE ${Date.now()}] TYPE completed for step ${stepIndex}`);
              }
            }, typingIntervalMs);
          }
          break;

        case "hover":
          if (element instanceof HTMLElement) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          }
          break;

        case "view":
          if (element instanceof HTMLElement) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          break;
      }

      // Schedule completion after last step
      if (isLastStep && !completionScheduledRef.current) {
        completionScheduledRef.current = true;
        console.log(`[TIMELINE] Last step ${stepIndex} - scheduling completion`);
        completionTimerRef.current = setTimeout(() => {
          console.log(`[TIMELINE] Completing challenge`);
          advanceStepRef.current();
        }, 1500);
      }
    } catch (err) {
      console.error("[TIMELINE] Error performing action:", err);
    }
  }, []);

  // Main timeline scheduling effect - runs once when show mode starts
  useEffect(() => {
    // Only run in show mode with a challenge
    if (!state.isActive || state.playbackMode !== "show" || !currentChallenge) {
      return;
    }

    // Don't re-schedule if already started
    if (timelineStartedRef.current) {
      return;
    }

    const steps = currentChallenge.steps;
    const hasTimestamps = videoTimestamps.length > 0;
    
    console.log(`[TIMELINE] Starting show mode - ${steps.length} steps, hasTimestamps: ${hasTimestamps}`);

    // Build timeline: either from recorded timestamps or with fallback fixed delays
    interface TimelineEntry {
      stepIndex: number;
      showTime: number;    // When to show highlight (1.2s before action)
      actionTime: number;  // When to execute action
      hideTime: number;    // When to hide highlight
    }
    
    const timeline: TimelineEntry[] = [];
    const HIGHLIGHT_LEAD_TIME = 1200; // Show highlight 1.2s before action
    const FALLBACK_STEP_DURATION = 3000; // 3s per step when no timestamps
    
    // Calculate typing duration based on value length
    const getTypingDuration = (step: { value?: string }) => {
      const valueLength = (step.value || '').length;
      return valueLength * TYPING_INTERVAL_MS;
    };
    
    if (hasTimestamps) {
      // Use recorded timestamps
      for (let i = 0; i < steps.length; i++) {
        const ts = videoTimestamps.find(t => t.stepIndex === i);
        if (!ts) continue;
        
        const actionTime = ts.timestamp;
        const showTime = Math.max(0, actionTime - HIGHLIGHT_LEAD_TIME);
        
        // Hide time depends on action type
        let hideTime: number;
        if (steps[i].action === "type") {
          // For typing, hide when typing completes (no buffer)
          hideTime = actionTime + getTypingDuration(steps[i]);
        } else {
          // For click/hover/view, hide 500ms after action
          hideTime = actionTime + CLICK_HIDE_DELAY_MS;
        }
        
        timeline.push({ stepIndex: i, showTime, actionTime, hideTime });
      }
    } else {
      // Fallback: fixed delays between steps
      let currentTime = 0;
      for (let i = 0; i < steps.length; i++) {
        const showTime = currentTime;
        const actionTime = currentTime + HIGHLIGHT_LEAD_TIME;
        
        let hideTime: number;
        if (steps[i].action === "type") {
          const typingDuration = getTypingDuration(steps[i]);
          hideTime = actionTime + typingDuration;
          currentTime = hideTime + 500; // Next step starts after typing completes + buffer
        } else {
          hideTime = actionTime + CLICK_HIDE_DELAY_MS;
          currentTime = actionTime + FALLBACK_STEP_DURATION - HIGHLIGHT_LEAD_TIME;
        }
        
        timeline.push({ stepIndex: i, showTime, actionTime, hideTime });
      }
    }

    console.log(`[TIMELINE] Built timeline:`, timeline);

    // Mark as started before scheduling
    timelineStartedRef.current = true;

    // Schedule all events
    // Track the engine's current step to know when to advance
    // Note: advanceStepRef.current() will handle the actual increment
    
    timeline.forEach((entry, idx) => {
      const step = steps[entry.stepIndex];
      
      // Schedule: show highlight (visual only, no engine state change)
      scheduleTimelineEvent(() => {
        console.log(`[TIMELINE] Showing highlight for step ${entry.stepIndex}`);
        setVisibleStepIndex(entry.stepIndex);
        setHighlightVisible(true);
      }, entry.showTime);
      
      // Schedule: execute action AND advance engine step
      // Advancing at action time (not show time) ensures routes don't change prematurely
      scheduleTimelineEvent(() => {
        console.log(`[TIMELINE] Advancing engine to step ${entry.stepIndex} and executing action`);
        advanceStepRef.current();
        performActionOnElement(entry.stepIndex, step, steps, videoTimestamps);
      }, entry.actionTime);
      
      // Schedule: hide highlight (unless it's the last step - let completion handler do it)
      if (idx < timeline.length - 1) {
        scheduleTimelineEvent(() => {
          console.log(`[TIMELINE] Hiding highlight for step ${entry.stepIndex}`);
          setHighlightVisible(false);
          setVisibleStepIndex(-1);
        }, entry.hideTime);
      } else {
        // Last step: hide after completion delay
        scheduleTimelineEvent(() => {
          console.log(`[TIMELINE] Hiding highlight for last step ${entry.stepIndex}`);
          setHighlightVisible(false);
          setVisibleStepIndex(-1);
        }, entry.hideTime + 1500);
      }
    });

    return () => {
      clearTimelineTimers();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally exclude state.currentStepIndex to prevent cleanup from clearing timers on every step advance
  }, [state.isActive, state.playbackMode, currentChallenge, videoTimestamps, scheduleTimelineEvent, clearTimelineTimers, performActionOnElement]);

  // Get the step to display (for tooltip) - use visibleStepIndex in show mode
  const displayStep = state.playbackMode === "show" && visibleStepIndex >= 0 
    ? currentChallenge?.steps[visibleStepIndex] ?? currentStep
    : currentStep;

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

  // Listen for guidance events from QuestsPage (which is outside the provider context)
  useEffect(() => {
    const handleStartQuest = (e: Event) => {
      const { questId, mode } = (e as CustomEvent).detail;
      if (questId) {
        startQuestRef.current(questId, mode || 'guide');
      }
    };

    const handleRestartChallenge = (e: Event) => {
      const { questId, challengeIndex, mode } = (e as CustomEvent).detail;
      if (questId !== undefined && challengeIndex !== undefined) {
        engine.restartChallenge(questId, challengeIndex, mode || 'guide');
      }
    };

    const handleResumeGuidance = () => {
      engine.resumeGuidance();
    };

    window.addEventListener('guidance:start-quest', handleStartQuest);
    window.addEventListener('guidance:restart-challenge', handleRestartChallenge);
    window.addEventListener('guidance:resume-guidance', handleResumeGuidance);

    return () => {
      window.removeEventListener('guidance:start-quest', handleStartQuest);
      window.removeEventListener('guidance:restart-challenge', handleRestartChallenge);
      window.removeEventListener('guidance:resume-guidance', handleResumeGuidance);
    };
  }, [engine]);

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

    // Ref to track hide timer for cleanup
    let hideTimerRef: NodeJS.Timeout | null = null;
    
    // Hide tooltip after delay based on action type, then advance
    const hideAndAdvance = (actionType: string) => {
      if (advanceDelayTimerRef.current) return; // Prevent double-clicks
      
      // Calculate hide delay based on action type
      let hideDelay: number;
      if (actionType === "type") {
        // For typing: hide when typing completes (chars × 200ms)
        const valueLength = (currentStep?.value || '').length;
        hideDelay = valueLength * TYPING_INTERVAL_MS;
      } else {
        // For click/hover/view: hide after 500ms
        hideDelay = CLICK_HIDE_DELAY_MS;
      }
      
      // Schedule hiding the tooltip after the delay
      hideTimerRef = setTimeout(() => {
        tooltipHiddenRef.current = true;
        setVisibilityTick(t => t + 1);
      }, hideDelay);
      
      // Schedule advancing to next step (after hide delay + any configured advanceDelay)
      const delay = resolveDelay(advanceDelay, "advanceDelay");
      advanceDelayTimerRef.current = setTimeout(() => {
        advanceStepRef.current();
      }, hideDelay + delay);
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
      if (state.playbackMode === "show") return;
      
      const target = e.target as HTMLElement;
      let stepElement: Element | null = null;
      try {
        stepElement = findElement(selector, currentStep?.contentMatch);
      } catch {
        // Invalid selector
      }
      
      // Check if click is on the target element - advance step
      if (stepElement && (stepElement === target || stepElement.contains(target))) {
        if (action === "click") {
          hideAndAdvance("click");
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
      const stepElement = findElement(selector, currentStep?.contentMatch);
      
      if (stepElement && (stepElement === target || stepElement.contains(target))) {
        hasAdvancedForType = true;
        hideAndAdvance("type");
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
      if (hideTimerRef) {
        clearTimeout(hideTimerRef);
        hideTimerRef = null;
      }
      if (advanceDelayTimerRef.current) {
        clearTimeout(advanceDelayTimerRef.current);
        advanceDelayTimerRef.current = null;
      }
    };
  }, [isOnEnabledRoute, state.isActive, state.playbackMode, currentStep?.selector, currentStep?.action, currentStep?.advanceDelay, currentStep?.value]);

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

          {state.isActive && displayStep && (
            <>
              <ElementHighlight
                targetSelector={displayStep.selector}
                contentMatch={displayStep.contentMatch}
                isVisible={state.isActive && !tooltipHiddenRef.current && (state.playbackMode !== "show" || highlightVisible)}
                actionType={displayStep.action}
              />
              <GuidanceTooltip
                targetSelector={displayStep.selector}
                contentMatch={displayStep.contentMatch}
                instruction={displayStep.instruction}
                position={displayStep.tooltipPosition || "auto"}
                isVisible={state.isActive && !tooltipHiddenRef.current && (state.playbackMode !== "show" || highlightVisible)}
                onDismiss={() => engine.advanceStep()}
                onBack={() => engine.previousStep()}
                onClose={() => engine.pauseGuidance()}
                stepNumber={(state.playbackMode === "show" ? visibleStepIndex : state.currentStepIndex) + 1}
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

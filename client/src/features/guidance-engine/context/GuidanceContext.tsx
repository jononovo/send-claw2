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
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const showModeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const showModeStartTimeRef = useRef<number | null>(null);
  
  // Stable refs for engine functions to avoid effect re-runs when engine object changes
  const startQuestRef = useRef(engine.startQuest);
  startQuestRef.current = engine.startQuest;
  const advanceStepRef = useRef(engine.advanceStep);
  advanceStepRef.current = engine.advanceStep;
  const pauseGuidanceRef = useRef(engine.pauseGuidance);
  pauseGuidanceRef.current = engine.pauseGuidance;

  const { state, currentQuest, currentChallenge, currentStep, getChallengeProgress } = engine;

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
      engine.setVideoTimestamps([]);
      return;
    }

    let cancelled = false;
    getChallengeVideo(currentChallenge.id)
      .then((video) => {
        if (cancelled) return;
        if (video?.url) {
          setVideoUrl(video.url);
          setShowVideo(true);
          if (video.timestamps && Array.isArray(video.timestamps)) {
            engine.setVideoTimestamps(video.timestamps);
          }
        } else {
          setVideoUrl(null);
          setShowVideo(false);
          engine.setVideoTimestamps([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVideoUrl(null);
          setShowVideo(false);
          engine.setVideoTimestamps([]);
        }
      });

    return () => { cancelled = true; };
  }, [state.isActive, currentChallenge?.id, engine]);

  // Auto-resume on navigation removed - guidance should only start via explicit triggers
  // Users can manually resume by clicking Fluffy if they want to continue a paused challenge

  // Show-me mode: auto-advance through steps based on video timestamps or fixed delays
  useEffect(() => {
    if (!state.isActive || state.playbackMode !== "show" || !currentChallenge) {
      if (showModeTimerRef.current) {
        clearTimeout(showModeTimerRef.current);
        showModeTimerRef.current = null;
      }
      showModeStartTimeRef.current = null;
      return;
    }

    const { videoTimestamps } = engine;
    const currentStepIdx = state.currentStepIndex;
    const totalSteps = currentChallenge.steps.length;

    // If we've completed all steps, don't set another timer
    if (currentStepIdx >= totalSteps) {
      return;
    }

    // Initialize start time on first step
    if (showModeStartTimeRef.current === null) {
      showModeStartTimeRef.current = Date.now();
    }

    // Calculate delay until next step
    let delayMs: number;

    if (videoTimestamps.length > 0) {
      // Use recorded timestamps - they're in milliseconds relative to video start
      const currentTimestamp = videoTimestamps.find(t => t.stepIndex === currentStepIdx);
      const nextTimestamp = videoTimestamps.find(t => t.stepIndex === currentStepIdx + 1);

      if (currentTimestamp && nextTimestamp) {
        // Delay is the difference between this step's timestamp and next step's
        delayMs = nextTimestamp.timestamp - currentTimestamp.timestamp;
      } else if (nextTimestamp) {
        // First step - use next timestamp as delay
        delayMs = nextTimestamp.timestamp;
      } else {
        // Last step or no timestamp - use default
        delayMs = 2000;
      }
    } else {
      // No timestamps available - use fixed delay
      delayMs = 2000;
    }

    // Ensure minimum delay
    delayMs = Math.max(delayMs, 500);

    showModeTimerRef.current = setTimeout(() => {
      advanceStepRef.current();
    }, delayMs);

    return () => {
      if (showModeTimerRef.current) {
        clearTimeout(showModeTimerRef.current);
        showModeTimerRef.current = null;
      }
    };
  }, [state.isActive, state.playbackMode, state.currentStepIndex, currentChallenge, engine]);

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
  }, [isOnEnabledRoute, state.isActive, currentStep?.selector, currentStep?.action, currentStep?.advanceDelay]);

  const prevCompletedChallengesRef = useRef<Record<string, string[]>>(
    JSON.parse(JSON.stringify(state.completedChallenges))
  );

  useEffect(() => {
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
  }, [state.isActive, state.completedChallenges, currentChallenge, currentQuest, showChallengeComplete]);

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
          />

          {state.isActive && currentStep && (
            <>
              <ElementHighlight
                targetSelector={currentStep.selector}
                isVisible={state.isActive && !tooltipHiddenRef.current}
              />
              <GuidanceTooltip
                targetSelector={currentStep.selector}
                instruction={currentStep.instruction}
                position={currentStep.tooltipPosition || "auto"}
                isVisible={state.isActive && !tooltipHiddenRef.current}
                onDismiss={() => engine.advanceStep()}
                onBack={() => engine.previousStep()}
                onClose={() => engine.pauseGuidance()}
                stepNumber={state.currentStepIndex + 1}
                totalSteps={currentChallenge?.steps.length}
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

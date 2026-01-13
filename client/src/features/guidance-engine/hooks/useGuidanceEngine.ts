import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { GuidanceState, GuidanceContextValue, Quest, Challenge, GuidanceStep, RecordingState, RecordedStep, PlaybackMode, VideoTimestamp } from "../types";
import { QUESTS, getQuestById, getFirstIncompleteQuest } from "../quests";

const defaultRecordingState: RecordingState = {
  isRecording: false,
  selectedQuestId: null,
  startRoute: null,
  steps: [],
  includeVideo: false,
  videoBlob: null,
  videoStartTime: null,
  videoUploadId: null,
  videoUploadStatus: 'idle',
};

const STORAGE_KEY = "fluffy-guidance-progress";

const defaultState: GuidanceState = {
  isActive: false,
  currentQuestId: null,
  currentChallengeIndex: 0,
  currentStepIndex: 0,
  completedQuests: [],
  completedChallenges: {},
  isHeaderVisible: false,
  playbackMode: "guide",
};

function loadProgress(): GuidanceState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultState, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load guidance progress:", e);
  }
  return defaultState;
}

function saveProgress(state: GuidanceState) {
  try {
    const persistedState = {
      completedQuests: state.completedQuests,
      completedChallenges: state.completedChallenges,
      currentQuestId: state.currentQuestId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
  } catch (e) {
    console.error("Failed to save guidance progress:", e);
  }
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

async function fetchServerProgress(): Promise<Partial<GuidanceState> | null> {
  try {
    const authToken = localStorage.getItem('authToken');
    
    const headers: HeadersInit = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const res = await fetch("/api/guidance/progress", { 
      credentials: "include",
      headers 
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("[GuidanceEngine] Failed to fetch server guidance progress:", e);
    return null;
  }
}

async function syncToServer(state: GuidanceState): Promise<void> {
  const authToken = localStorage.getItem('authToken');
  const payload = {
    completedQuests: state.completedQuests,
    completedChallenges: state.completedChallenges,
    currentQuestId: state.currentQuestId,
  };
  
  try {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const res = await fetch("/api/guidance/progress", {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error("[GuidanceEngine] Sync failed:", res.status, errorText);
    }
  } catch (e) {
    console.error("[GuidanceEngine] Failed to sync guidance progress to server:", e);
  }
}

interface UseGuidanceEngineOptions {
  authReady: boolean;
  userId: number | null;
}

const TEST_QUEST_ID = "__test__";

export function useGuidanceEngine(options: UseGuidanceEngineOptions): GuidanceContextValue {
  const { authReady, userId } = options;
  const [state, setState] = useState<GuidanceState>(loadProgress);
  const [isInitialized, setIsInitialized] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserIdRef = useRef<number | null>(null);
  
  const [testChallenge, setTestChallenge] = useState<Challenge | null>(null);
  const testCompleteCallbackRef = useRef<(() => void) | null>(null);
  
  const [recording, setRecording] = useState<RecordingState>(defaultRecordingState);
  const recordingRef = useRef(false);
  
  const [videoTimestamps, setVideoTimestamps] = useState<VideoTimestamp[]>([]);

  // Initialize from server once auth is ready
  useEffect(() => {
    if (!authReady) {
      return;
    }

    async function initFromServer() {
      const serverProgress = await fetchServerProgress();
      if (serverProgress) {
        setState((prev) => ({
          ...prev,
          completedQuests: serverProgress.completedQuests || prev.completedQuests,
          completedChallenges: serverProgress.completedChallenges || prev.completedChallenges,
          currentQuestId: serverProgress.currentQuestId ?? prev.currentQuestId,
        }));
      }
      setIsInitialized(true);
      lastUserIdRef.current = userId;
    }
    initFromServer();
  }, [authReady, userId]);

  // Re-fetch progress when user changes (login/logout transition)
  useEffect(() => {
    if (!authReady || !isInitialized) return;
    if (lastUserIdRef.current === userId) return;
    
    lastUserIdRef.current = userId;
    
    async function refetchProgress() {
      const serverProgress = await fetchServerProgress();
      if (serverProgress) {
        setState((prev) => ({
          ...prev,
          completedQuests: serverProgress.completedQuests || prev.completedQuests,
          completedChallenges: serverProgress.completedChallenges || prev.completedChallenges,
          currentQuestId: serverProgress.currentQuestId ?? prev.currentQuestId,
        }));
      }
    }
    refetchProgress();
  }, [authReady, isInitialized, userId]);

  // Sync to server when state changes (with debounce)
  useEffect(() => {
    if (state.currentQuestId === TEST_QUEST_ID) {
      return;
    }
    
    saveProgress(state);
    
    if (!isInitialized) {
      return;
    }
    
    if (!authReady) {
      return;
    }
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncToServer(state);
    }, 1000);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [state, isInitialized, authReady, userId]);

  const isTestMode = state.currentQuestId === TEST_QUEST_ID;

  const currentQuest: Quest | null = useMemo(() => {
    if (!state.currentQuestId) return null;
    if (isTestMode) return null;
    return getQuestById(state.currentQuestId) || null;
  }, [state.currentQuestId, isTestMode]);

  const currentChallenge: Challenge | null = useMemo(() => {
    if (isTestMode) return testChallenge;
    if (!currentQuest) return null;
    return currentQuest.challenges[state.currentChallengeIndex] || null;
  }, [currentQuest, state.currentChallengeIndex, isTestMode, testChallenge]);

  const currentStep: GuidanceStep | null = useMemo(() => {
    if (!currentChallenge) return null;
    return currentChallenge.steps[state.currentStepIndex] || null;
  }, [currentChallenge, state.currentStepIndex]);

  const startQuest = useCallback((questId: string, mode: PlaybackMode = "guide") => {
    const quest = getQuestById(questId);
    if (!quest) return;

    const completedChallengesForQuest = state.completedChallenges[questId] || [];
    const firstIncompleteIndex = quest.challenges.findIndex(
      (c) => !completedChallengesForQuest.includes(c.id) && c.steps.length > 0
    );

    if (firstIncompleteIndex < 0) return;

    // In "show" mode, start at step -1 so the first tooltip waits for video timing
    // In "guide" mode, start at step 0 immediately
    const initialStepIndex = mode === "show" ? -1 : 0;

    setState((prev) => ({
      ...prev,
      isActive: true,
      currentQuestId: questId,
      currentChallengeIndex: firstIncompleteIndex,
      currentStepIndex: initialStepIndex,
      isHeaderVisible: true,
      playbackMode: mode,
    }));
  }, [state.completedChallenges]);

  const startNextChallenge = useCallback(() => {
    if (!currentQuest) {
      const firstQuest = getFirstIncompleteQuest(state.completedQuests);
      if (firstQuest) {
        startQuest(firstQuest.id);
      }
      return;
    }

    const completedChallengesForQuest = state.completedChallenges[currentQuest.id] || [];
    const nextValidIndex = currentQuest.challenges.findIndex(
      (c, idx) => idx > state.currentChallengeIndex && 
                  c.steps.length > 0 && 
                  !completedChallengesForQuest.includes(c.id)
    );
    
    if (nextValidIndex >= 0) {
      setState((prev) => ({
        ...prev,
        isActive: true,
        currentChallengeIndex: nextValidIndex,
        currentStepIndex: 0,
        isHeaderVisible: true,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        completedQuests: [...prev.completedQuests, currentQuest.id],
        currentQuestId: null,
        currentChallengeIndex: 0,
        currentStepIndex: 0,
        isActive: false,
      }));
    }
  }, [currentQuest, state.currentChallengeIndex, state.completedQuests, state.completedChallenges, startQuest]);

  const advanceStep = useCallback(() => {
    if (!currentChallenge) return;

    const nextStepIndex = state.currentStepIndex + 1;
    
    if (nextStepIndex < currentChallenge.steps.length) {
      setState((prev) => ({
        ...prev,
        currentStepIndex: nextStepIndex,
      }));
    } else {
      const questId = state.currentQuestId;
      if (questId) {
        const completedForQuest = state.completedChallenges[questId] || [];
        setState((prev) => ({
          ...prev,
          completedChallenges: {
            ...prev.completedChallenges,
            [questId]: [...completedForQuest, currentChallenge.id],
          },
          isActive: false,
        }));
      }
    }
  }, [currentChallenge, state.currentStepIndex, state.currentQuestId, state.completedChallenges]);

  const previousStep = useCallback(() => {
    if (state.currentStepIndex > 0) {
      setState((prev) => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex - 1,
      }));
    }
  }, [state.currentStepIndex]);

  const completeChallenge = useCallback(() => {
    if (!currentChallenge || !state.currentQuestId) return;

    const completedForQuest = state.completedChallenges[state.currentQuestId] || [];
    
    setState((prev) => ({
      ...prev,
      completedChallenges: {
        ...prev.completedChallenges,
        [state.currentQuestId!]: [...completedForQuest, currentChallenge.id],
      },
      isActive: false,
      currentStepIndex: 0,
    }));
  }, [currentChallenge, state.currentQuestId, state.completedChallenges]);

  const pauseGuidance = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: false,
    }));
  }, []);

  const resumeGuidance = useCallback(() => {
    if (state.currentQuestId) {
      setState((prev) => ({
        ...prev,
        isActive: true,
        isHeaderVisible: true,
      }));
    } else {
      const firstQuest = getFirstIncompleteQuest(state.completedQuests);
      if (firstQuest) {
        startQuest(firstQuest.id);
      }
    }
  }, [state.currentQuestId, state.completedQuests, startQuest]);

  const toggleHeader = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isHeaderVisible: !prev.isHeaderVisible,
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setState(defaultState);
    localStorage.removeItem(STORAGE_KEY);
    syncToServer(defaultState);
  }, []);

  const restartChallenge = useCallback((questId: string, challengeIndex: number, mode: PlaybackMode = "guide") => {
    const quest = getQuestById(questId);
    if (!quest) return;
    
    const challenge = quest.challenges[challengeIndex];
    if (!challenge || challenge.steps.length === 0) return;

    const completedForQuest = state.completedChallenges[questId] || [];
    const updatedCompleted = completedForQuest.filter(id => id !== challenge.id);

    // In "show" mode, start at step -1 so the first tooltip waits for video timing
    // In "guide" mode, start at step 0 immediately
    const initialStepIndex = mode === "show" ? -1 : 0;

    setState((prev) => ({
      ...prev,
      isActive: true,
      currentQuestId: questId,
      currentChallengeIndex: challengeIndex,
      currentStepIndex: initialStepIndex,
      isHeaderVisible: true,
      playbackMode: mode,
      completedChallenges: {
        ...prev.completedChallenges,
        [questId]: updatedCompleted,
      },
    }));
  }, [state.completedChallenges]);

  const getChallengeProgress = useCallback((): { completed: number; total: number } => {
    if (!currentQuest) return { completed: 0, total: 0 };
    const completedForQuest = state.completedChallenges[currentQuest.id] || [];
    return {
      completed: completedForQuest.length,
      total: currentQuest.challenges.length,
    };
  }, [currentQuest, state.completedChallenges]);

  const getQuestProgress = useCallback((): { completed: number; total: number } => {
    return {
      completed: state.completedQuests.length,
      total: QUESTS.length,
    };
  }, [state.completedQuests]);

  const startChallenge = useCallback((challenge: Challenge, onComplete?: () => void, mode: PlaybackMode = "guide") => {
    setTestChallenge(challenge);
    testCompleteCallbackRef.current = onComplete || null;
    setState((prev) => ({
      ...prev,
      isActive: true,
      currentQuestId: TEST_QUEST_ID,
      currentChallengeIndex: 0,
      currentStepIndex: 0,
      isHeaderVisible: true,
      playbackMode: mode,
    }));
  }, []);

  const stopChallenge = useCallback(() => {
    setTestChallenge(null);
    testCompleteCallbackRef.current = null;
    setState((prev) => ({
      ...prev,
      isActive: false,
      currentQuestId: null,
      currentChallengeIndex: 0,
      currentStepIndex: 0,
    }));
  }, []);

  // Recording functions
  const getBestSelector = useCallback((element: HTMLElement): string => {
    if (element.dataset.testid) {
      return `[data-testid="${element.dataset.testid}"]`;
    }
    if (element.id) {
      return `#${element.id}`;
    }
    if (element.className && typeof element.className === 'string') {
      const classes = element.className
        .split(' ')
        .filter(c => c && !c.startsWith('hover:') && !c.startsWith('focus:'))
        .map(c => c.replace(/\[/g, '\\[').replace(/\]/g, '\\]')); // Escape brackets in Tailwind arbitrary value classes
      if (classes.length > 0) {
        const uniqueClasses = classes.slice(0, 3).join('.');
        return `${element.tagName.toLowerCase()}.${uniqueClasses}`;
      }
    }
    return element.tagName.toLowerCase();
  }, []);

  const getElementDescription = useCallback((element: HTMLElement): string => {
    const text = element.textContent?.trim().slice(0, 50);
    if (text) return text;
    if (element.getAttribute('placeholder')) {
      return element.getAttribute('placeholder') || '';
    }
    if (element.getAttribute('aria-label')) {
      return element.getAttribute('aria-label') || '';
    }
    return element.tagName.toLowerCase();
  }, []);

  // Global recording event listeners - these persist across page navigations
  useEffect(() => {
    if (!recording.isRecording) {
      recordingRef.current = false;
      return;
    }
    
    recordingRef.current = true;

    const handleClick = (e: MouseEvent) => {
      if (!recordingRef.current) return;
      
      const target = e.target as HTMLElement;
      if (target.closest('[data-recorder-ui]')) return;
      
      const selector = getBestSelector(target);
      const step: RecordedStep = {
        selector,
        action: "click",
        tagName: target.tagName.toLowerCase(),
        textContent: getElementDescription(target),
        route: window.location.pathname,
        timestamp: Date.now(),
      };
      
      setRecording(prev => ({
        ...prev,
        steps: [...prev.steps, step],
      }));
    };

    const handleInput = (e: Event) => {
      if (!recordingRef.current) return;
      
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!target.tagName || !['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (target.closest('[data-recorder-ui]')) return;
      
      const selector = getBestSelector(target);
      
      setRecording(prev => {
        const lastStep = prev.steps[prev.steps.length - 1];
        if (lastStep && lastStep.selector === selector && lastStep.action === "type") {
          const updated = [...prev.steps];
          updated[updated.length - 1] = {
            ...lastStep,
            typedValue: target.value,
          };
          return { ...prev, steps: updated };
        }
        
        return {
          ...prev,
          steps: [...prev.steps, {
            selector,
            action: "type" as const,
            tagName: target.tagName.toLowerCase(),
            textContent: target.placeholder || "input field",
            typedValue: target.value,
            route: window.location.pathname,
            timestamp: Date.now(),
          }],
        };
      });
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("input", handleInput, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("input", handleInput, true);
    };
  }, [recording.isRecording, getBestSelector, getElementDescription]);

  const startRecording = useCallback((questId: string, startRoute: string, includeVideo = false) => {
    setRecording({
      isRecording: true,
      selectedQuestId: questId,
      startRoute,
      steps: [],
      includeVideo,
      videoBlob: null,
      videoStartTime: includeVideo ? Date.now() : null,
      videoUploadId: null,
      videoUploadStatus: 'idle',
    });
  }, []);

  const stopRecording = useCallback((): RecordedStep[] => {
    const steps = recording.steps;
    setRecording(prev => ({
      ...prev,
      isRecording: false,
    }));
    return steps;
  }, [recording.steps]);

  const clearRecording = useCallback(() => {
    setRecording(defaultRecordingState);
  }, []);

  const setVideoBlob = useCallback((blob: Blob | null) => {
    setRecording(prev => ({
      ...prev,
      videoBlob: blob,
    }));
  }, []);

  const setVideoUploadStatus = useCallback((status: RecordingState['videoUploadStatus'], uploadId?: number | null) => {
    setRecording(prev => ({
      ...prev,
      videoUploadStatus: status,
      videoUploadId: uploadId !== undefined ? uploadId : prev.videoUploadId,
    }));
  }, []);

  const setPlaybackMode = useCallback((mode: PlaybackMode) => {
    setState((prev) => ({
      ...prev,
      playbackMode: mode,
    }));
  }, []);

  useEffect(() => {
    if (isTestMode && !state.isActive && testChallenge) {
      const callback = testCompleteCallbackRef.current;
      setTestChallenge(null);
      testCompleteCallbackRef.current = null;
      setState((prev) => ({
        ...prev,
        currentQuestId: null,
      }));
      if (callback) {
        setTimeout(callback, 100);
      }
    }
  }, [isTestMode, state.isActive, testChallenge]);

  return {
    state,
    currentQuest,
    currentChallenge,
    currentStep,
    startQuest,
    startNextChallenge,
    advanceStep,
    previousStep,
    completeChallenge,
    pauseGuidance,
    resumeGuidance,
    toggleHeader,
    resetProgress,
    restartChallenge,
    getChallengeProgress,
    getQuestProgress,
    startChallenge,
    stopChallenge,
    isTestMode,
    setPlaybackMode,
    videoTimestamps,
    setVideoTimestamps,
    recording,
    startRecording,
    stopRecording,
    clearRecording,
    setVideoBlob,
    setVideoUploadStatus,
  };
}

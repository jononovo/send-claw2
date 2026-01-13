import { ReactNode } from "react";

export interface GuidanceStep {
  id: string;
  selector: string;
  action: "click" | "type" | "view" | "hover";
  instruction: string;
  tooltipPosition?: "top" | "bottom" | "left" | "right" | "auto";
  value?: string;
  waitForUser?: boolean;
  validateCompletion?: () => boolean;
  route?: string;
  advanceDelay?: number;
}

export interface QuestTrigger {
  type: "newUser" | "firstVisit" | "route" | "userEvent";
  route?: string;           // Required for route/firstVisit/newUser types
  eventName?: string;       // Required for userEvent type
  requiresAuth?: boolean;   // Default true - must be logged in to trigger
  once?: boolean;           // Default true - only trigger once per user
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  steps: GuidanceStep[];
  completionMessage?: string;
  setupEvent?: string;
  trigger?: QuestTrigger;   // Defines when/how this challenge auto-starts
  startDelay?: number;      // Delay before challenge begins (omit = use default from defaults.ts)
  completionCredits?: number; // Credits awarded on completion (omit = use default from defaults.ts)
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  challenges: Challenge[];
}

export interface GuidanceState {
  isActive: boolean;
  currentQuestId: string | null;
  currentChallengeIndex: number;
  currentStepIndex: number;
  completedQuests: string[];
  completedChallenges: Record<string, string[]>;
  isHeaderVisible: boolean;
}

export interface GuidanceContextValue {
  state: GuidanceState;
  currentQuest: Quest | null;
  currentChallenge: Challenge | null;
  currentStep: GuidanceStep | null;
  startQuest: (questId: string) => void;
  startNextChallenge: () => void;
  advanceStep: () => void;
  previousStep: () => void;
  completeChallenge: () => void;
  pauseGuidance: () => void;
  resumeGuidance: () => void;
  toggleHeader: () => void;
  resetProgress: () => void;
  restartChallenge: (questId: string, challengeIndex: number) => void;
  getChallengeProgress: () => { completed: number; total: number };
  getQuestProgress: () => { completed: number; total: number };
  startChallenge: (challenge: Challenge, onComplete?: () => void) => void;
  stopChallenge: () => void;
  isTestMode: boolean;
  recording: RecordingState;
  startRecording: (questId: string, startRoute: string, includeVideo?: boolean) => void;
  stopRecording: () => RecordedStep[];
  clearRecording: () => void;
  setVideoBlob: (blob: Blob | null) => void;
  setVideoUploadStatus: (status: RecordingState['videoUploadStatus'], uploadId?: number | null) => void;
  refreshChallengeVideo: (challengeId: string) => Promise<void>;
}

export interface FluffyGuideProps {
  onClick: () => void;
  isActive: boolean;
}

export interface QuestProgressHeaderProps {
  questName: string;
  challengesCompleted: number;
  totalChallenges: number;
  currentChallengeName?: string;
  isVisible: boolean;
  onClose: () => void;
}

export interface ElementHighlightProps {
  targetSelector: string;
  isVisible: boolean;
}

export interface GuidanceTooltipProps {
  targetSelector: string;
  instruction: string;
  position: "top" | "bottom" | "left" | "right" | "auto";
  isVisible: boolean;
  onDismiss?: () => void;
  onBack?: () => void;
  onClose?: () => void;
  stepNumber?: number;
  totalSteps?: number;
}

export interface SpotlightOverlayProps {
  targetSelector: string;
  isVisible: boolean;
}

export interface RecordedStep {
  selector: string;
  action: "click" | "type" | "view" | "hover";
  tagName: string;
  textContent?: string;
  typedValue?: string;
  route: string;
  timestamp: number;
}

export interface RecordingState {
  isRecording: boolean;
  selectedQuestId: string | null;
  startRoute: string | null;
  steps: RecordedStep[];
  includeVideo: boolean;
  videoBlob: Blob | null;
  videoStartTime: number | null;
  videoUploadId: number | null;
  videoUploadStatus: 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';
}

export interface GeneratedChallenge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  steps: GuidanceStep[];
  completionMessage: string;
}

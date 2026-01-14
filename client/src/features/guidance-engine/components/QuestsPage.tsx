import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { 
  ChevronDown, 
  ChevronRight, 
  Check, 
  Lock, 
  Play, 
  Trophy,
  Target,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGuidance } from "../context/GuidanceContext";
import { QUESTS } from "../quests";
import { CertificateShowcase } from "./CertificateShowcase";
import type { Quest, Challenge } from "../types";
import { fireCelebrateConfetti } from "@/features/animations";

type QuestStatus = "completed" | "in-progress" | "locked";
type ChallengeStatus = "completed" | "in-progress" | "available" | "locked";

function getQuestStatus(
  quest: Quest,
  completedQuests: string[],
  currentQuestId: string | null,
  questIndex: number,
  completedQuestsCount: number
): QuestStatus {
  if (completedQuests.includes(quest.id)) return "completed";
  if (currentQuestId === quest.id) return "in-progress";
  if (questIndex <= completedQuestsCount) return "in-progress";
  return "locked";
}

function getChallengeStatus(
  challenge: Challenge,
  questId: string,
  completedChallenges: Record<string, string[]>,
  currentQuestId: string | null,
  currentChallengeIndex: number,
  challengeIndex: number,
  questStatus: QuestStatus,
  allChallenges: Challenge[],
  isActive: boolean
): ChallengeStatus {
  if (challenge.steps.length === 0) return "locked";
  
  const questCompletedChallenges = completedChallenges[questId] || [];
  
  if (questCompletedChallenges.includes(challenge.id)) return "completed";
  
  if (isActive && currentQuestId === questId && challengeIndex === currentChallengeIndex) {
    return "in-progress";
  }
  
  const isFirstIncomplete = allChallenges
    .slice(0, challengeIndex)
    .every(c => questCompletedChallenges.includes(c.id));
  
  if (isFirstIncomplete && questStatus !== "locked") {
    return "available";
  }
  
  return "locked";
}

interface QuestCardProps {
  quest: Quest;
  questIndex: number;
  status: QuestStatus;
  completedChallenges: Record<string, string[]>;
  currentQuestId: string | null;
  currentChallengeIndex: number;
  isActive: boolean;
  onStartQuest: (questId: string) => void;
  onContinueChallenge: (questId: string, challengeIndex: number) => void;
  onRestartChallenge: (questId: string, challengeIndex: number, challengeName: string) => void;
  onStartLockedChallenge: (questId: string, challengeIndex: number) => void;
  onShowDemo: (questId: string, challengeIndex: number) => void;
}

function QuestCard({
  quest,
  questIndex,
  status,
  completedChallenges,
  currentQuestId,
  currentChallengeIndex,
  isActive,
  onStartQuest,
  onContinueChallenge,
  onRestartChallenge,
  onStartLockedChallenge,
  onShowDemo,
}: QuestCardProps) {
  const [isExpanded, setIsExpanded] = useState(status === "in-progress");
  const [hoveredChallengeIndex, setHoveredChallengeIndex] = useState<number | null>(null);
  const questChallengesCompleted = (completedChallenges[quest.id] || []).length;
  const totalChallenges = quest.challenges.length;
  const progressPercent = (questChallengesCompleted / totalChallenges) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: questIndex * 0.1 }}
      className={`
        rounded-xl border backdrop-blur-sm overflow-hidden
        ${status === "completed" 
          ? "bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-500/30" 
          : status === "in-progress"
          ? "bg-gradient-to-br from-amber-900/30 to-amber-800/20 border-amber-500/30"
          : "bg-gray-900/50 border-gray-700/50 opacity-60"
        }
      `}
    >
      <button
        onClick={() => status !== "locked" && setIsExpanded(!isExpanded)}
        disabled={status === "locked"}
        className="w-full p-5 flex items-center gap-4 text-left hover:bg-white/5 transition-colors disabled:cursor-not-allowed"
      >
        <div className={`
          w-14 h-14 rounded-xl flex items-center justify-center text-2xl
          ${status === "completed" 
            ? "bg-green-500/20" 
            : status === "in-progress"
            ? "bg-amber-500/20"
            : "bg-gray-700/50"
          }
        `}>
          {status === "completed" ? (
            <Check className="h-7 w-7 text-green-400" />
          ) : status === "locked" ? (
            <Lock className="h-6 w-6 text-gray-500" />
          ) : (
            <span>{quest.emoji || "🎯"}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Quest {questIndex + 1}
            </span>
            {status === "completed" && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                Complete
              </span>
            )}
          </div>
          <h3 className={`text-lg font-semibold ${status === "locked" ? "text-gray-500" : "text-white"}`}>
            {quest.name}
          </h3>
          <p className={`text-sm ${status === "locked" ? "text-gray-600" : "text-gray-400"} line-clamp-1`}>
            {quest.description}
          </p>

          {status !== "locked" && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    status === "completed" ? "bg-green-500" : "bg-amber-500"
                  }`}
                />
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {questChallengesCompleted}/{totalChallenges}
              </span>
            </div>
          )}
        </div>

        {status !== "locked" && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && status !== "locked" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-2">
              {quest.challenges.map((challenge, challengeIndex) => {
                const challengeStatus = getChallengeStatus(
                  challenge,
                  quest.id,
                  completedChallenges,
                  currentQuestId,
                  currentChallengeIndex,
                  challengeIndex,
                  status,
                  quest.challenges,
                  isActive
                );

                const isHovered = hoveredChallengeIndex === challengeIndex;
                const hasSteps = challenge.steps.length > 0;

                return (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: challengeIndex * 0.05 }}
                    onMouseEnter={() => setHoveredChallengeIndex(challengeIndex)}
                    onMouseLeave={() => setHoveredChallengeIndex(null)}
                    onClick={() => {
                      if (challengeStatus === "completed") {
                        onRestartChallenge(quest.id, challengeIndex, challenge.name);
                      } else if (challengeStatus === "in-progress") {
                        onContinueChallenge(quest.id, challengeIndex);
                      } else if (challengeStatus === "available") {
                        onStartQuest(quest.id);
                      } else if (challengeStatus === "locked" && challenge.steps.length > 0) {
                        onStartLockedChallenge(quest.id, challengeIndex);
                      }
                    }}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg
                      ${challengeStatus === "completed"
                        ? "bg-green-500/10 cursor-pointer hover:bg-green-500/20"
                        : challengeStatus === "in-progress" || challengeStatus === "available"
                        ? "bg-amber-500/10 cursor-pointer hover:bg-amber-500/20"
                        : challenge.steps.length > 0
                        ? "bg-gray-800/50 cursor-pointer hover:bg-gray-700/50"
                        : "bg-gray-800/50"
                      }
                      transition-colors
                    `}
                  >
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center
                      ${challengeStatus === "completed"
                        ? "bg-green-500/20"
                        : challengeStatus === "in-progress" || challengeStatus === "available"
                        ? "bg-amber-500/20"
                        : "bg-gray-700/50"
                      }
                    `}>
                      {challengeStatus === "completed" ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : challengeStatus === "in-progress" || challengeStatus === "available" ? (
                        <Play className="h-4 w-4 text-amber-400" />
                      ) : (
                        <Play className="h-4 w-4 text-gray-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-medium ${
                        challengeStatus === "locked" ? "text-gray-500" : "text-white"
                      }`}>
                        {challenge.name}
                      </h4>
                      <p className={`text-xs ${
                        challengeStatus === "locked" ? "text-gray-600" : "text-gray-400"
                      } line-clamp-1`}>
                        {challenge.description}
                      </p>
                    </div>

                    <div className="text-xs text-gray-500">
                      {challenge.steps.length === 0 ? (
                        <span className="text-amber-500/70">Coming Soon</span>
                      ) : (
                        `${challenge.steps.length} step${challenge.steps.length !== 1 ? "s" : ""}`
                      )}
                    </div>

                    {/* Show demo button - appears on hover for all challenges with steps */}
                    {isHovered && hasSteps && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShowDemo(quest.id, challengeIndex);
                        }}
                        className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 text-xs px-2 gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Show demo
                      </Button>
                    )}

                    {(challengeStatus === "in-progress" || challengeStatus === "available") && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (challengeStatus === "available") {
                            onStartQuest(quest.id);
                          } else {
                            onContinueChallenge(quest.id, challengeIndex);
                          }
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-3"
                      >
                        {challengeStatus === "available" ? "Start" : "Continue"}
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function QuestsPage() {
  const [, navigate] = useLocation();
  const guidance = useGuidance();
  const { state, startQuest, resumeGuidance, restartChallenge, setPlaybackMode } = guidance;
  const [restartConfirm, setRestartConfirm] = useState<{questId: string; challengeIndex: number; challengeName: string;} | null>(null);

  const handleRestartRequest = (questId: string, challengeIndex: number, challengeName: string) => {
    setRestartConfirm({ questId, challengeIndex, challengeName });
  };

  const handleConfirmRestart = () => {
    if (restartConfirm) {
      restartChallenge(restartConfirm.questId, restartConfirm.challengeIndex);
      setRestartConfirm(null);
      navigate("/app");
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.add('dark');
    
    return () => {
      if (!wasDark) {
        root.classList.remove('dark');
      }
    };
  }, []);

  const handleStartQuest = (questId: string) => {
    startQuest(questId);
    navigate("/app");
  };

  const handleContinueChallenge = (questId: string, challengeIndex: number) => {
    if (state.currentQuestId === questId) {
      resumeGuidance();
      navigate("/app");
    } else {
      startQuest(questId);
      navigate("/app");
    }
  };

  const handleStartLockedChallenge = (questId: string, challengeIndex: number) => {
    restartChallenge(questId, challengeIndex);
    navigate("/app");
  };

  const handleShowDemo = (questId: string, challengeIndex: number) => {
    // Start the challenge in show mode (pass "show" as the mode parameter)
    restartChallenge(questId, challengeIndex, "show");
    navigate("/app");
  };

  const totalQuests = QUESTS.length;
  const completedQuestsCount = state.completedQuests.length;
  const overallProgress = totalQuests > 0 ? (completedQuestsCount / totalQuests) * 100 : 0;

  const handleCelebrate = () => {
    fireCelebrateConfetti();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/app")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to App</span>
        </button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 mb-4">
            <Trophy className="h-10 w-10 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Your Journey</h1>
          <p className="text-gray-400 mb-6">
            Complete quests to master the platform and unlock new abilities
          </p>

          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="flex-1 max-w-xs h-3 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-amber-500 to-green-500 rounded-full"
              />
            </div>
            <span className="text-sm text-gray-400">
              {completedQuestsCount}/{totalQuests} Quests
            </span>
          </div>

          {completedQuestsCount === totalQuests && totalQuests > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="mt-4"
            >
              <Button
                onClick={handleCelebrate}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Celebrate!
              </Button>
            </motion.div>
          )}
        </motion.div>

        <div className="space-y-4">
          {QUESTS.map((quest, questIndex) => {
            const status = getQuestStatus(
              quest,
              state.completedQuests,
              state.currentQuestId,
              questIndex,
              state.completedQuests.length
            );

            return (
              <QuestCard
                key={quest.id}
                quest={quest}
                questIndex={questIndex}
                status={status}
                completedChallenges={state.completedChallenges}
                currentQuestId={state.currentQuestId}
                currentChallengeIndex={state.currentChallengeIndex}
                isActive={state.isActive}
                onStartQuest={handleStartQuest}
                onContinueChallenge={handleContinueChallenge}
                onRestartChallenge={handleRestartRequest}
                onStartLockedChallenge={handleStartLockedChallenge}
                onShowDemo={handleShowDemo}
              />
            );
          })}
        </div>

        {QUESTS.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Target className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-400 mb-2">No Quests Available</h2>
            <p className="text-gray-500">Check back soon for new challenges!</p>
          </motion.div>
        )}

        <CertificateShowcase
          recipientName="Your Name"
          isUnlocked={completedQuestsCount === totalQuests && totalQuests > 0}
          questsCompleted={completedQuestsCount}
          totalQuests={totalQuests}
          userId="15"
        />

        <AlertDialog open={!!restartConfirm} onOpenChange={() => setRestartConfirm(null)}>
          <AlertDialogContent className="bg-gray-900 border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Restart Challenge?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Do you want to restart "{restartConfirm?.challengeName}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmRestart} className="bg-amber-500 hover:bg-amber-600">
                Restart
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

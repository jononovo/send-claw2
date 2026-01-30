import type { Quest } from "../types";
import { quest1 } from "./quest-1";
import { quest2 } from "./quest-2";
import { quest3 } from "./quest-3";
import { quest4 } from "./quest-4";
import { quest5 } from "./quest-5";
import { quest6 } from "./quest-6";
import { quest7 } from "./quest-7";
import { quest8 } from "./quest-8";
import { quest9 } from "./quest-9";
import { quest10 } from "./quest-10";
import { quest11 } from "./quest-11";
import { quest12 } from "./quest-12";
import { quest13 } from "./quest-13";
import { quest14 } from "./quest-14";

export const QUESTS: Quest[] = [
  quest1,
  quest2,
  quest3,
  quest4,
  quest5,
  quest6,
  quest7,
  quest8,
  quest9,
  quest10,
  quest11,
  quest12,
  quest13,
  quest14,
];

export function getQuestById(questId: string): Quest | undefined {
  return QUESTS.find((q) => q.id === questId);
}

export function getNextQuest(currentQuestId: string): Quest | undefined {
  const currentIndex = QUESTS.findIndex((q) => q.id === currentQuestId);
  if (currentIndex >= 0 && currentIndex < QUESTS.length - 1) {
    return QUESTS[currentIndex + 1];
  }
  return undefined;
}

export function getFirstIncompleteQuest(completedQuests: string[]): Quest | undefined {
  return QUESTS.find((q) => 
    !completedQuests.includes(q.id) && 
    q.challenges.some(c => c.steps.length > 0)
  );
}

export { GUIDANCE_DEFAULTS, resolveDelay } from "./defaults";

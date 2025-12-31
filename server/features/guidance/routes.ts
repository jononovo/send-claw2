import express, { type Express } from "express";
import { storage } from "../../storage";
import { getUserId } from "../../utils/auth";
import { CreditRewardService } from "../billing/rewards/service";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

const anthropic = new Anthropic();

const QUEST_FILE_MANIFEST: Record<string, { file: string; exportName: string }> = {
  "finding-customers": { file: "quest-1.ts", exportName: "quest1" },
  "send-an-email": { file: "quest-2.ts", exportName: "quest2" },
  "invite-a-friend": { file: "quest-3.ts", exportName: "quest3" },
  "manage-your-products": { file: "quest-4.ts", exportName: "quest4" },
  "manage-sender-profile": { file: "quest-5.ts", exportName: "quest5" },
  "launch-daily-ducks-assistant": { file: "quest-6.ts", exportName: "quest6" },
  "daily-ducks": { file: "quest-7.ts", exportName: "quest7" },
  "help-your-community": { file: "quest-8.ts", exportName: "quest8" },
  "create-contact-list": { file: "quest-9.ts", exportName: "quest9" },
  "tinkering-contact-lists": { file: "quest-10.ts", exportName: "quest10" },
  "connect-gmail-api": { file: "quest-11.ts", exportName: "quest11" },
  "email-templates-merge-fields": { file: "quest-12.ts", exportName: "quest12" },
  "schedule-campaign": { file: "quest-13.ts", exportName: "quest13" },
  "ai-each-unique-campaign": { file: "quest-14.ts", exportName: "quest14" },
};

const challengeGenerationRateLimit = new Map<number, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// Default credits per challenge (can be overridden per challenge)
const DEFAULT_CHALLENGE_CREDITS = 110;

export function registerGuidanceRoutes(app: Express) {
  app.get("/api/guidance/progress", async (req, res) => {
    try {
      const userId = getUserId(req);
      console.log("[GuidanceRoutes] GET /api/guidance/progress - userId:", userId);
      
      // Demo user (id 1) is the fallback for unauthenticated requests
      // Return empty progress to ensure new users get fresh state
      if (userId === 1) {
        console.log("[GuidanceRoutes] Returning empty progress for demo user (id=1)");
        return res.json({
          completedQuests: [],
          completedChallenges: {},
          currentQuestId: null,
          settings: {}
        });
      }
      
      const progress = await storage.getUserGuidanceProgress(userId);
      console.log("[GuidanceRoutes] Database progress for user", userId, ":", progress);
      
      if (!progress) {
        console.log("[GuidanceRoutes] No progress found, returning defaults");
        return res.json({
          completedQuests: [],
          completedChallenges: {},
          currentQuestId: null,
          settings: {}
        });
      }
      
      res.json({
        completedQuests: progress.completedQuests || [],
        completedChallenges: progress.completedChallenges || {},
        currentQuestId: progress.currentQuestId,
        settings: progress.settings || {}
      });
    } catch (error) {
      console.error("[GuidanceRoutes] Error fetching guidance progress:", error);
      res.status(500).json({ message: "Failed to fetch guidance progress" });
    }
  });

  app.patch("/api/guidance/progress", async (req, res) => {
    try {
      const userId = getUserId(req);
      console.log("[GuidanceRoutes] PATCH /api/guidance/progress - userId:", userId);
      console.log("[GuidanceRoutes] Request body:", req.body);
      
      // Don't save progress for demo user (unauthenticated fallback)
      if (userId === 1) {
        console.log("[GuidanceRoutes] SKIPPING SAVE - demo user (id=1), not persisting to database");
        return res.json({ success: true });
      }
      
      const { completedQuests, completedChallenges, currentQuestId, settings } = req.body;
      
      // Get existing progress to detect newly completed challenges
      const existingProgress = await storage.getUserGuidanceProgress(userId);
      const existingCompletedChallenges: Record<string, string[]> = existingProgress?.completedChallenges || {};
      const incomingCompletedChallenges: Record<string, string[]> = completedChallenges || {};
      
      // Find newly completed challenges (in incoming but not in existing)
      const newlyCompleted: { questId: string; challengeId: string }[] = [];
      for (const [questId, challengeIds] of Object.entries(incomingCompletedChallenges)) {
        const existingForQuest = existingCompletedChallenges[questId] || [];
        for (const challengeId of challengeIds) {
          if (!existingForQuest.includes(challengeId)) {
            newlyCompleted.push({ questId, challengeId });
          }
        }
      }
      
      // Award credits for newly completed challenges
      const creditsAwarded: { challengeId: string; credits: number; credited: boolean }[] = [];
      for (const { questId, challengeId } of newlyCompleted) {
        try {
          const result = await CreditRewardService.awardChallengeCredits(
            userId,
            challengeId,
            DEFAULT_CHALLENGE_CREDITS
          );
          creditsAwarded.push({
            challengeId,
            credits: DEFAULT_CHALLENGE_CREDITS,
            credited: result.credited
          });
          console.log(`[GuidanceRoutes] Challenge credit award for ${challengeId}:`, result);
        } catch (error) {
          console.error(`[GuidanceRoutes] Failed to award credits for challenge ${challengeId}:`, error);
        }
      }
      
      console.log("[GuidanceRoutes] Saving progress for user", userId, ":", {
        completedQuests,
        completedChallenges,
        currentQuestId,
        newlyCompleted,
        creditsAwarded
      });
      
      const updated = await storage.updateUserGuidanceProgress(userId, {
        completedQuests,
        completedChallenges,
        currentQuestId,
        settings
      });
      
      console.log("[GuidanceRoutes] Successfully saved progress for user", userId);
      
      res.json({
        completedQuests: updated.completedQuests || [],
        completedChallenges: updated.completedChallenges || {},
        currentQuestId: updated.currentQuestId,
        settings: updated.settings || {},
        creditsAwarded
      });
    } catch (error) {
      console.error("[GuidanceRoutes] Error updating guidance progress:", error);
      res.status(500).json({ message: "Failed to update guidance progress" });
    }
  });

  app.post("/api/guidance/generate-challenge", async (req, res) => {
    try {
      const userId = getUserId(req);
      const isDevelopment = process.env.NODE_ENV !== 'production';
      
      if (!userId || (!isDevelopment && userId === 1)) {
        return res.status(401).json({ message: "Authentication required to generate challenges" });
      }

      const now = Date.now();
      const userLimit = challengeGenerationRateLimit.get(userId);
      if (userLimit) {
        if (now < userLimit.resetTime) {
          if (userLimit.count >= RATE_LIMIT_MAX) {
            return res.status(429).json({ message: "Rate limit exceeded. Please try again later." });
          }
          userLimit.count++;
        } else {
          challengeGenerationRateLimit.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        }
      } else {
        challengeGenerationRateLimit.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      }

      const { questId, startRoute, steps } = req.body;

      if (!questId || !startRoute || !steps || !Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({ message: "Invalid request: questId, startRoute, and steps are required" });
      }

      if (steps.length > 20) {
        return res.status(400).json({ message: "Too many steps. Maximum 20 steps allowed." });
      }

      const sanitizeText = (str: string | undefined): string => {
        if (!str) return "";
        return str.replace(/[\n\r\t]/g, " ").slice(0, 100).trim();
      };

      const sanitizedStartRoute = sanitizeText(startRoute);

      const stepsData = steps.map((step: any, idx: number) => ({
        index: idx + 1,
        action: ["click", "type", "view", "hover"].includes(step.action) ? step.action : "click",
        selector: String(step.selector || ""),
        description: sanitizeText(step.textContent),
        route: sanitizeText(step.route),
        typedValue: step.typedValue ? sanitizeText(step.typedValue) : undefined,
      }));

      const stepsJson = JSON.stringify(stepsData, null, 2);

      // Note: This is an AI prompt string, not a SQL query. The sanitizedStartRoute is already
      // sanitized via sanitizeText() and is sent to Claude AI, not to a database.
      // nosemgrep: javascript.lang.security.audit.sqli.node-postgres-sqli
      const prompt = `You are helping create a guided tutorial challenge for a web application. Based on the recorded user interactions below, generate a challenge definition.

RECORDED STEPS (JSON format):
Starting Route: ${sanitizedStartRoute}
${stepsJson}

Generate a challenge object with:
1. A unique id (lowercase-kebab-case, descriptive of the action)
2. A friendly name (short, action-oriented)
3. A brief description (what the user will learn)
4. An appropriate emoji
5. For each step, generate a clear, friendly instruction that tells the user what to do
6. Determine the best tooltip position for each step based on typical UI layouts
7. A completion message celebrating what they learned

IMPORTANT: The steps array must preserve the exact selectors from the input.

Respond ONLY with valid JSON in this exact format:
{
  "id": "challenge-id-here",
  "name": "Challenge Name",
  "description": "What the user will learn",
  "emoji": "🎯",
  "steps": [
    {
      "id": "step-id",
      "selector": "[exact-selector-from-input]",
      "action": "click|type|view|hover",
      "instruction": "Friendly instruction for user",
      "tooltipPosition": "top|bottom|left|right|auto",
      "route": "/route"
    }
  ],
  "completionMessage": "Great job! You've learned..."
}`;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          { role: "user", content: prompt }
        ]
      });

      const textContent = response.content.find(block => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error("No text response from AI");
      }

      let jsonStr = textContent.text.trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      let challenge;
      try {
        challenge = JSON.parse(jsonStr);
      } catch {
        throw new Error("AI returned invalid JSON");
      }

      if (!challenge.id || !challenge.name || !challenge.steps || !Array.isArray(challenge.steps)) {
        throw new Error("AI response missing required fields");
      }

      res.json({ challenge, questId });
    } catch (error) {
      console.error("[GuidanceRoutes] Error generating challenge:", error);
      res.status(500).json({ message: "Failed to generate challenge" });
    }
  });

  app.post("/api/guidance/quests/:questId/challenges", async (req, res) => {
    try {
      const isDevelopment = process.env.NODE_ENV !== 'production';
      if (!isDevelopment) {
        return res.status(403).json({ message: "This endpoint is only available in development mode" });
      }

      const { questId } = req.params;
      const { challenge } = req.body;

      if (!challenge || !challenge.id || !challenge.name || !challenge.steps) {
        return res.status(400).json({ message: "Invalid challenge data" });
      }

      const questInfo = QUEST_FILE_MANIFEST[questId];
      if (!questInfo) {
        return res.status(404).json({ message: `Quest not found: ${questId}` });
      }

      const questFilePath = path.join(
        process.cwd(),
        "client/src/features/guidance-engine/quests",
        questInfo.file
      );

      if (!fs.existsSync(questFilePath)) {
        return res.status(404).json({ message: `Quest file not found: ${questInfo.file}` });
      }

      let fileContent = fs.readFileSync(questFilePath, "utf-8");

      const existingIdMatch = fileContent.match(new RegExp(`id:\\s*["']${challenge.id}["']`));
      if (existingIdMatch) {
        return res.status(409).json({ message: `Challenge with id "${challenge.id}" already exists in this quest` });
      }

      const challengesArrayMatch = fileContent.match(/challenges:\s*\[/);
      if (!challengesArrayMatch || challengesArrayMatch.index === undefined) {
        return res.status(400).json({ message: "Could not find challenges array in quest file" });
      }

      const challengesArrayStart = challengesArrayMatch.index + challengesArrayMatch[0].length;
      
      let bracketCount = 1;
      let challengesArrayEnd = -1;
      let inString: string | null = null;
      let inLineComment = false;
      let inBlockComment = false;
      let escaped = false;
      
      for (let i = challengesArrayStart; i < fileContent.length; i++) {
        const char = fileContent[i];
        const nextChar = fileContent[i + 1];
        
        if (inLineComment) {
          if (char === '\n') {
            inLineComment = false;
          }
          continue;
        }
        
        if (inBlockComment) {
          if (char === '*' && nextChar === '/') {
            inBlockComment = false;
            i++;
          }
          continue;
        }
        
        if (escaped) {
          escaped = false;
          continue;
        }
        
        if (char === '\\') {
          escaped = true;
          continue;
        }
        
        if (inString) {
          if (char === inString) {
            inString = null;
          }
          continue;
        }
        
        if (char === '/' && nextChar === '/') {
          inLineComment = true;
          i++;
          continue;
        }
        
        if (char === '/' && nextChar === '*') {
          inBlockComment = true;
          i++;
          continue;
        }
        
        if (char === '"' || char === "'" || char === '`') {
          inString = char;
          continue;
        }
        
        if (char === '[') {
          bracketCount++;
        } else if (char === ']') {
          bracketCount--;
          if (bracketCount === 0) {
            challengesArrayEnd = i;
            break;
          }
        }
      }

      if (challengesArrayEnd === -1) {
        return res.status(400).json({ message: "Could not find closing bracket of challenges array" });
      }

      const beforeBracket = fileContent.slice(0, challengesArrayEnd);
      const afterBracket = fileContent.slice(challengesArrayEnd);

      const hasExistingChallenges = beforeBracket.match(/\}\s*,?\s*$/);
      const needsComma = hasExistingChallenges && !beforeBracket.trim().endsWith(",");

      const challengeJson = JSON.stringify(challenge, null, 2)
        .split("\n")
        .map((line, i) => (i === 0 ? line : "    " + line))
        .join("\n");

      const insertion = `${needsComma ? "," : ""}\n    ${challengeJson}`;
      const newContent = beforeBracket.trimEnd() + insertion + "\n  " + afterBracket;

      fs.writeFileSync(questFilePath, newContent, "utf-8");

      console.log(`[GuidanceRoutes] Inserted challenge "${challenge.id}" into ${questInfo.file}`);

      res.json({ success: true, message: `Challenge inserted into ${questInfo.file}` });
    } catch (error) {
      console.error("[GuidanceRoutes] Error inserting challenge:", error);
      res.status(500).json({ message: "Failed to insert challenge" });
    }
  });
}

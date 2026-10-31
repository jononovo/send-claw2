/**
 * Runs the strategy agent (plans/261026_strategies.md, Phase 2): Claude reads a strategy and the
 * user's brief, creates query groups and runs searches in them through the Phase 1 functions, until
 * each group's list reaches its target or the run's searches are used up. One run per strategy at a
 * time, in the background; the user can stop it, and the page reads its trace from the run record.
 */
import type { BetaMessage } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { claude, claudeMessageText, CLAUDE_REFUSAL_FALLBACK_BETA, CLAUDE_SONNET_MODEL } from "../../lib/claude-request";
import {
  strategyAgentRuns,
  type StrategicProfile,
  type StrategyAgentModelUsage,
  type StrategyAgentRun,
  type StrategyAgentRunStatus,
  type StrategyAgentRunStep,
} from "@shared/schema";
import { CreditService } from "../billing/credits/service";
import { CREDIT_COSTS } from "../billing/credits/types";
import { listStrategyQueryGroups } from "./strategy-query-groups";
import { STRATEGY_AGENT_SYSTEM_PROMPT, buildStrategyAgentOpeningMessage } from "./strategy-agent-prompt";
import { buildStrategyAgentTools, type StrategyAgentToolState } from "./strategy-agent-tools";

/** The model the agent runs on. Thinking is on by default for it; `effort` sets how hard it thinks (high is its default). */
const STRATEGY_AGENT_MODEL = CLAUDE_SONNET_MODEL;
const STRATEGY_AGENT_EFFORT = "high" as const;
const STRATEGY_AGENT_MAX_TOKENS = 16000;
/** Agent searches use the emails search: only contacts with an email address can join a list. */
const CREDITS_PER_AGENT_SEARCH = CREDIT_COSTS.email_search;

export const STRATEGY_AGENT_LIMITS = {
  maxSearchesPerRun: 25,
  defaultSearchesPerRun: 10,
  maxTargetContactsPerGroup: 500,
  defaultTargetContactsPerGroup: 30,
  maxNewGroupsPerRun: 4,
  creditsPerSearch: CREDITS_PER_AGENT_SEARCH,
} as const;

export class StrategyAgentRunError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export interface StartStrategyAgentRunInput {
  brief: string;
  targetContactsPerGroup?: number;
  maxSearches?: number;
}

export type StrategyAgentRunView = StrategyAgentRun & { isRunning: boolean };

interface ActiveRun {
  strategyId: number;
  stopRequested: boolean;
}

export class StrategyAgentRunner {
  private readonly activeRuns = new Map<number, ActiveRun>();

  /** Creates the run record and starts the agent in the background; returns at once. */
  async start(strategy: StrategicProfile, input: StartStrategyAgentRunInput): Promise<StrategyAgentRunView> {
    for (const active of Array.from(this.activeRuns.values())) {
      if (active.strategyId === strategy.id) {
        throw new StrategyAgentRunError(409, "The agent is already building lists for this strategy. Stop that run first.");
      }
    }

    const credits = await CreditService.getUserCredits(strategy.userId);
    if (credits.currentBalance < CREDITS_PER_AGENT_SEARCH) {
      throw new StrategyAgentRunError(402, `The agent needs at least ${CREDITS_PER_AGENT_SEARCH} credits for one search; the balance is ${credits.currentBalance}.`);
    }

    const [run] = await db
      .insert(strategyAgentRuns)
      .values({
        userId: strategy.userId,
        strategyId: strategy.id,
        status: "running",
        brief: input.brief.trim(),
        targetContactsPerGroup: input.targetContactsPerGroup ?? STRATEGY_AGENT_LIMITS.defaultTargetContactsPerGroup,
        maxSearches: input.maxSearches ?? STRATEGY_AGENT_LIMITS.defaultSearchesPerRun,
      })
      .returning();

    const active: ActiveRun = { strategyId: strategy.id, stopRequested: false };
    this.activeRuns.set(run.id, active);
    void this.execute(run, strategy, active, credits.currentBalance)
      .catch((error) => console.error(`[StrategyAgent] Run ${run.id} stopped with an error:`, error))
      .finally(() => this.activeRuns.delete(run.id));

    return { ...run, isRunning: true };
  }

  /** Asks a running agent to stop: it starts no further search and ends after its current step. */
  async requestStop(runId: number, strategyId: number, userId: number): Promise<boolean> {
    const run = await this.getRun(runId, strategyId, userId);
    if (!run) throw new StrategyAgentRunError(404, "Agent run not found");
    const active = this.activeRuns.get(runId);
    if (!active) return false;
    active.stopRequested = true;
    return true;
  }

  async listRuns(strategyId: number, userId: number, limit = 5): Promise<StrategyAgentRunView[]> {
    const runs = await db
      .select()
      .from(strategyAgentRuns)
      .where(and(eq(strategyAgentRuns.strategyId, strategyId), eq(strategyAgentRuns.userId, userId)))
      .orderBy(desc(strategyAgentRuns.id))
      .limit(limit);
    return runs.map((run) => ({ ...run, isRunning: this.activeRuns.has(run.id) }));
  }

  isRunning(runId: number): boolean {
    return this.activeRuns.has(runId);
  }

  /** Called at server start: runs a previous process left running are marked interrupted. */
  async recoverInterruptedRuns(): Promise<number> {
    const recovered = await db
      .update(strategyAgentRuns)
      .set({ status: "interrupted", error: "The server restarted during this run.", finishedAt: new Date() })
      .where(eq(strategyAgentRuns.status, "running"))
      .returning({ id: strategyAgentRuns.id });
    if (recovered.length > 0) console.log(`[StrategyAgent] Marked ${recovered.length} interrupted run(s)`);
    return recovered.length;
  }

  private async getRun(runId: number, strategyId: number, userId: number): Promise<StrategyAgentRun | undefined> {
    const [run] = await db
      .select()
      .from(strategyAgentRuns)
      .where(and(eq(strategyAgentRuns.id, runId), eq(strategyAgentRuns.strategyId, strategyId), eq(strategyAgentRuns.userId, userId)));
    return run;
  }

  private async appendStep(runId: number, step: StrategyAgentRunStep): Promise<void> {
    const countsAsSearch = step.kind === "search" && step.outcome !== "held";
    await db
      .update(strategyAgentRuns)
      .set({
        steps: sql`coalesce(${strategyAgentRuns.steps}, '[]'::jsonb) || ${JSON.stringify([step])}::jsonb`,
        ...(countsAsSearch ? { searchesRun: sql`${strategyAgentRuns.searchesRun} + 1` } : {}),
      })
      .where(eq(strategyAgentRuns.id, runId));
  }

  private async finish(runId: number, status: StrategyAgentRunStatus, fields: { summary?: string | null; error?: string | null; modelUsage: StrategyAgentModelUsage }) {
    await db
      .update(strategyAgentRuns)
      .set({ status, summary: fields.summary ?? null, error: fields.error ?? null, modelUsage: fields.modelUsage, finishedAt: new Date() })
      .where(eq(strategyAgentRuns.id, runId));
  }

  private async execute(run: StrategyAgentRun, strategy: StrategicProfile, active: ActiveRun, creditBalance: number): Promise<void> {
    const usage: StrategyAgentModelUsage = { requests: 0, inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 };
    try {
      const groups = await listStrategyQueryGroups(strategy);

      const toolState: StrategyAgentToolState = {
        runId: run.id,
        strategy,
        targetContactsPerGroup: run.targetContactsPerGroup,
        maxSearches: run.maxSearches,
        maxNewGroups: STRATEGY_AGENT_LIMITS.maxNewGroupsPerRun,
        searchesStarted: 0,
        groupsCreated: 0,
        strategyGroupIds: new Set(groups.map((group) => group.id)),
        haltReason: null,
        isStopRequested: () => active.stopRequested,
        recordStep: (step) => this.appendStep(run.id, step),
      };

      const runner = claude.beta.messages.toolRunner({
        model: STRATEGY_AGENT_MODEL,
        max_tokens: STRATEGY_AGENT_MAX_TOKENS,
        system: STRATEGY_AGENT_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: buildStrategyAgentOpeningMessage({
              strategy,
              brief: run.brief,
              groups,
              targetContactsPerGroup: run.targetContactsPerGroup,
              maxSearches: run.maxSearches,
              maxNewGroups: STRATEGY_AGENT_LIMITS.maxNewGroupsPerRun,
              creditsPerSearch: CREDITS_PER_AGENT_SEARCH,
              creditBalance,
            }),
          },
        ],
        tools: buildStrategyAgentTools(toolState),
        // One request per search and per group, plus room to plan and to summarise
        max_iterations: run.maxSearches + STRATEGY_AGENT_LIMITS.maxNewGroupsPerRun + 4,
        output_config: { effort: STRATEGY_AGENT_EFFORT },
        betas: [CLAUDE_REFUSAL_FALLBACK_BETA],
        // Accepted by the API but missing from this SDK version's types: refusal fallback, and
        // automatic prompt caching of the growing conversation
        ...({ fallbacks: "default", cache_control: { type: "ephemeral" } } as {}),
      });

      let lastMessage: BetaMessage | undefined;
      for await (const message of runner) {
        lastMessage = message;
        usage.requests++;
        usage.inputTokens += message.usage.input_tokens;
        usage.outputTokens += message.usage.output_tokens;
        usage.cacheReadInputTokens += message.usage.cache_read_input_tokens ?? 0;
        usage.cacheCreationInputTokens += message.usage.cache_creation_input_tokens ?? 0;

        if (message.stop_reason === "tool_use") {
          const note = claudeMessageText(message);
          if (note) await this.appendStep(run.id, { kind: "note", at: new Date().toISOString(), text: note });
        }
        if (active.stopRequested) break; // the tools of this turn do not run
      }

      if (active.stopRequested) {
        await this.finish(run.id, "stopped", { summary: lastMessage && lastMessage.stop_reason !== "tool_use" ? claudeMessageText(lastMessage) : null, modelUsage: usage });
        return;
      }
      if (!lastMessage) {
        await this.finish(run.id, "failed", { error: "The model returned no reply.", modelUsage: usage });
        return;
      }
      if (lastMessage.stop_reason === "refusal") {
        const category = (lastMessage as { stop_details?: { category?: string | null } }).stop_details?.category;
        await this.finish(run.id, "failed", { error: `The model declined this brief${category ? ` (${category})` : ""}. Reword it and try again.`, modelUsage: usage });
        return;
      }
      const summary = lastMessage.stop_reason === "tool_use"
        ? "The agent reached its turn limit before writing a summary. The groups and their lists below show what it did."
        : claudeMessageText(lastMessage) || null;
      await this.finish(run.id, "completed", { summary, error: toolState.haltReason, modelUsage: usage });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[StrategyAgent] Run ${run.id} failed: ${message}`);
      await this.finish(run.id, "failed", { error: message, modelUsage: usage });
    }
  }
}

export const strategyAgentRunner = new StrategyAgentRunner();

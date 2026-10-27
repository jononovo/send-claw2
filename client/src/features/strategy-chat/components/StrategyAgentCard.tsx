import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { AlertCircle, Bot, CheckCircle, Clock, Layers, Play, Search, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { searchTypeConfigs } from "@/components/search-type-selector";
import type { StrategyAgentRun, StrategyAgentRunStep } from "@shared/schema";
import { describeApiError } from "../lib/describe-api-error";

/**
 * The strategy agent: the user describes who to find, and the agent creates query groups and runs
 * searches until each group's list reaches the target or the run's searches are used up. The groups
 * it builds appear in the Query Groups card below; this card shows the run's trace and summary.
 */

type AgentRun = StrategyAgentRun & { isRunning: boolean };

interface StrategyAgentCardProps {
  strategyId: number;
}

// The agent searches with the emails search, the only type whose contacts can join a sending list
const CREDITS_PER_AGENT_SEARCH = searchTypeConfigs.find((config) => config.type === "emails")?.creditCost ?? 160;
const DEFAULT_TARGET_CONTACTS = 30;
const DEFAULT_MAX_SEARCHES = 10;
const MAX_SEARCHES = 25;
const MAX_TARGET_CONTACTS = 500;

const STATUS_LABELS: Record<StrategyAgentRun["status"], string> = {
  running: "Running",
  completed: "Done",
  stopped: "Stopped",
  failed: "Failed",
  interrupted: "Interrupted",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function StepLine({ step }: { step: StrategyAgentRunStep }) {
  if (step.kind === "group") {
    return (
      <li className="flex gap-2 text-sm">
        <Layers className="h-3.5 w-3.5 mt-0.5 text-purple-500 flex-shrink-0" />
        <span className="text-slate-700">
          Created the group <span className="font-medium">{step.groupName}</span>: {step.whoToFind}
        </span>
      </li>
    );
  }
  if (step.kind === "note") {
    return (
      <li className="flex gap-2 text-sm">
        <Bot className="h-3.5 w-3.5 mt-0.5 text-slate-400 flex-shrink-0" />
        <span className="text-slate-600">{step.text}</span>
      </li>
    );
  }
  const icon =
    step.outcome === "failed" || step.outcome === "held" ? (
      <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-red-500 flex-shrink-0" />
    ) : (
      <Search className="h-3.5 w-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
    );
  return (
    <li className="flex gap-2 text-sm">
      {icon}
      <div className="min-w-0">
        <p className="text-slate-700">
          <span className="font-medium">"{step.query}"</span> in {step.groupName}
          {step.outcome === "searched" || step.outcome === "reused" ? (
            <span className="text-slate-500">
              {" "}· {step.companies ?? 0} companies, {step.addedToList ?? 0} new to the list, {step.alreadyOnList ?? 0} already on it
              {step.outcome === "reused" ? " (earlier results, no charge)" : ""} · list now {step.groupListSize ?? 0}
            </span>
          ) : null}
        </p>
        <p className="text-xs text-slate-500">Why: {step.reason}</p>
        {step.error && <p className="text-xs text-red-600">{step.error}</p>}
      </div>
    </li>
  );
}

export function StrategyAgentCard({ strategyId }: StrategyAgentCardProps) {
  const { toast } = useToast();
  const runsKey = ["/api/strategies", strategyId, "agent-runs"];
  const groupsKey = ["/api/strategies", strategyId, "query-groups"];

  const { data: runs = [] } = useQuery<AgentRun[]>({
    queryKey: runsKey,
    refetchInterval: (query) => ((query.state.data ?? [])[0]?.isRunning ? 3000 : false),
  });
  const latestRun = runs[0];
  const running = latestRun?.isRunning ?? false;

  // While the agent works, its groups and their lists change too
  const stepCount = latestRun?.steps?.length ?? 0;
  useEffect(() => {
    if (latestRun) queryClient.invalidateQueries({ queryKey: groupsKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestRun?.id, latestRun?.status, stepCount]);

  const [brief, setBrief] = useState("");
  const [targetContacts, setTargetContacts] = useState(DEFAULT_TARGET_CONTACTS);
  const [maxSearches, setMaxSearches] = useState(DEFAULT_MAX_SEARCHES);

  const startRun = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/strategies/${strategyId}/agent-runs`, {
        brief: brief.trim(),
        targetContactsPerGroup: targetContacts,
        maxSearches,
      });
      return (await res.json()) as AgentRun;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: runsKey });
      toast({ title: "Agent started", description: "It creates groups and runs searches; this card shows each step." });
    },
    onError: (error) => toast({ title: "Could not start the agent", description: describeApiError(error), variant: "destructive" }),
  });

  const stopRun = useMutation({
    mutationFn: (runId: number) => apiRequest("POST", `/api/strategies/${strategyId}/agent-runs/${runId}/stop`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: runsKey });
      toast({ title: "Stopping", description: "The agent finishes its current step and starts no new search." });
    },
    onError: (error) => toast({ title: "Could not stop the agent", description: describeApiError(error), variant: "destructive" }),
  });

  const canStart = brief.trim().length >= 10 && !startRun.isPending && !running;

  return (
    <Card>
      <CardHeader className="px-3 py-6 sm:px-6">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Agent
        </CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          Describe who to find. The agent creates query groups, runs searches and stops when each group's list reaches the target or its searches are used up.
        </p>
      </CardHeader>
      <CardContent className="px-3 py-6 pt-0 sm:px-6 space-y-4">
        {!running && (
          <div className="space-y-3" data-testid="form-strategy-agent">
            <Textarea
              placeholder={"Who should the agent look for? For example:\nCompare midsize law firms in Miami with business brokerages in Florida, one list each."}
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              rows={4}
              className="text-sm"
            />
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-slate-600 space-y-1">
                <span className="block">Contacts per list</span>
                <Input
                  type="number"
                  min={1}
                  max={MAX_TARGET_CONTACTS}
                  value={targetContacts}
                  onChange={(event) => setTargetContacts(clamp(Number(event.target.value) || 1, 1, MAX_TARGET_CONTACTS))}
                  className="h-8 w-28 text-sm"
                />
              </label>
              <label className="text-xs text-slate-600 space-y-1">
                <span className="block">Most searches</span>
                <Input
                  type="number"
                  min={1}
                  max={MAX_SEARCHES}
                  value={maxSearches}
                  onChange={(event) => setMaxSearches(clamp(Number(event.target.value) || 1, 1, MAX_SEARCHES))}
                  className="h-8 w-24 text-sm"
                />
              </label>
              <p className="text-xs text-slate-500 pb-2">
                Up to {(maxSearches * CREDITS_PER_AGENT_SEARCH).toLocaleString()} credits ({CREDITS_PER_AGENT_SEARCH} per search)
              </p>
              <Button size="sm" onClick={() => startRun.mutate()} disabled={!canStart} data-testid="button-start-agent">
                <Play className="h-4 w-4 mr-2" />
                {startRun.isPending ? "Starting…" : "Start the agent"}
              </Button>
            </div>
          </div>
        )}

        {latestRun && (
          <div className="p-4 bg-slate-50 rounded-lg space-y-3" data-testid={`agent-run-${latestRun.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-800">{running ? "Working on" : "Last run"}</span>
                <Badge variant={running ? "default" : latestRun.status === "completed" ? "outline" : "secondary"} className="text-[10px] px-1.5 py-0">
                  {running ? "Running" : STATUS_LABELS[latestRun.status]}
                </Badge>
                <span className="text-xs text-slate-500">
                  {latestRun.searchesRun} of {latestRun.maxSearches} searches · target {latestRun.targetContactsPerGroup} per list
                </span>
              </div>
              {running && (
                <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => stopRun.mutate(latestRun.id)} disabled={stopRun.isPending}>
                  <Square className="h-3 w-3 mr-1" />
                  Stop
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-500 whitespace-pre-line">{latestRun.brief}</p>

            {latestRun.steps.length > 0 ? (
              <ul className="space-y-2">
                {latestRun.steps.map((step, index) => (
                  <StepLine key={`${step.at}-${index}`} step={step} />
                ))}
              </ul>
            ) : (
              running && (
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Reading the strategy and planning…
                </p>
              )
            )}

            {latestRun.summary && (
              <div className="flex gap-2 text-sm border-t pt-3">
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                <div className="prose prose-sm max-w-none text-slate-700">
                  <ReactMarkdown>{latestRun.summary}</ReactMarkdown>
                </div>
              </div>
            )}
            {latestRun.error && <p className="text-xs text-red-600">{latestRun.error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

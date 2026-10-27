import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Layers,
  Pause,
  Play,
  PlayCircle,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { generateSearchUrl } from "@/lib/url-utils";
import { searchTypeConfigs } from "@/components/search-type-selector";
import type { SearchQueue, SearchQueueItem } from "@shared/schema";
import { describeApiError } from "../lib/describe-api-error";

/**
 * A strategy's query groups: each group is a list of search queries that run in order and fill
 * one sending list, so two groups of one strategy can be compared as two campaigns.
 * The server keeps a group as a search queue tagged with the strategy.
 */

type GroupSearchType = SearchQueue["searchType"];

interface QueryGroupItem extends SearchQueueItem {
  savedSearchNumber: number | null;
}

interface QueryGroup extends SearchQueue {
  items: QueryGroupItem[];
  contactList: { id: number; name: string; contactCount: number } | null;
  isRunning: boolean;
}

interface StrategyQueryGroupsCardProps {
  strategyId: number;
  dailyQueries: string[];
}

const DAILY_QUERIES_GROUP_NAME = "Daily queries";
const GROUP_SEARCH_TYPES: GroupSearchType[] = ["emails", "contacts", "companies"];

function splitQueries(text: string): string[] {
  return text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
}

function searchTypeLabel(type: GroupSearchType): string {
  const config = searchTypeConfigs.find((candidate) => candidate.type === type);
  return config ? `${config.label} · ${config.creditCost} credits per query` : type;
}

export function StrategyQueryGroupsCard({ strategyId, dailyQueries }: StrategyQueryGroupsCardProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const groupsKey = ["/api/strategies", strategyId, "query-groups"];

  const { data: groups = [], isLoading } = useQuery<QueryGroup[]>({
    queryKey: groupsKey,
    refetchInterval: (query) =>
      (query.state.data ?? []).some((group) => group.status === "active" || group.isRunning) ? 3000 : false,
  });

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newQueries, setNewQueries] = useState("");
  const [newSearchType, setNewSearchType] = useState<GroupSearchType>("emails");
  const [addingToGroupId, setAddingToGroupId] = useState<number | null>(null);
  const [extraQueries, setExtraQueries] = useState("");

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: groupsKey });
    queryClient.invalidateQueries({ queryKey: ["/api/contact-lists"] });
    queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
  };
  const reportError = (title: string) => (error: unknown) =>
    toast({ title, description: describeApiError(error), variant: "destructive" });

  const createGroup = useMutation({
    mutationFn: async (input: { name: string; queries: string[]; searchType: GroupSearchType; start: boolean }) => {
      const res = await apiRequest("POST", `/api/strategies/${strategyId}/query-groups`, input);
      return (await res.json()) as QueryGroup;
    },
    onSuccess: (group, input) => {
      refresh();
      setShowNewGroup(false);
      setNewName("");
      setNewDescription("");
      setNewQueries("");
      toast({
        title: input.start ? "Group started" : "Group created",
        description: group.contactList ? `"${group.name}" fills the list "${group.contactList.name}".` : `"${group.name}" is ready.`,
      });
    },
    onError: reportError("Could not create the group"),
  });

  const startGroup = useMutation({
    mutationFn: (groupId: number) => apiRequest("POST", `/api/search-queues/${groupId}/execute`),
    onSuccess: refresh,
    onError: reportError("Could not start the group"),
  });

  const pauseGroup = useMutation({
    mutationFn: (groupId: number) => apiRequest("POST", `/api/search-queues/${groupId}/pause`),
    onSuccess: refresh,
    onError: reportError("Could not pause the group"),
  });

  const addQueries = useMutation({
    mutationFn: ({ groupId, queries }: { groupId: number; queries: string[] }) =>
      apiRequest("POST", `/api/strategies/${strategyId}/query-groups/${groupId}/queries`, { queries }),
    onSuccess: () => {
      refresh();
      setAddingToGroupId(null);
      setExtraQueries("");
    },
    onError: reportError("Could not add the queries"),
  });

  const suggestQueries = useMutation({
    mutationFn: async (description: string) => {
      const res = await apiRequest("POST", `/api/strategies/${strategyId}/query-groups/suggest`, { description });
      return (await res.json()) as { queries: string[] };
    },
    onSuccess: ({ queries }) => setNewQueries((current) => [...splitQueries(current), ...queries].join("\n")),
    onError: reportError("Could not suggest queries"),
  });

  const dailyGroupExists = groups.some((group) => group.name === DAILY_QUERIES_GROUP_NAME);
  const newGroupQueries = splitQueries(newQueries);
  const canCreate = newName.trim().length > 0 && newGroupQueries.length > 0 && !createGroup.isPending;

  const statusBadge = (group: QueryGroup) => {
    if (group.status === "active" || group.isRunning) return <Badge className="text-[10px] px-1.5 py-0">Running</Badge>;
    if (group.status === "completed") return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Done</Badge>;
    return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Paused</Badge>;
  };

  const itemIcon = (status: string) => {
    switch (status) {
      case "running":
        return <PlayCircle className="h-3.5 w-3.5 text-blue-500 animate-pulse flex-shrink-0" />;
      case "completed":
        return <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />;
      case "failed":
        return <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />;
    }
  };

  return (
    <Card>
      <CardHeader className="px-3 py-6 sm:px-6">
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Query Groups
        </CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          A group runs its queries in order and fills its own sending list. Each query is charged like a normal search of that type.
        </p>
      </CardHeader>
      <CardContent className="px-3 py-6 pt-0 sm:px-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => createGroup.mutate({ name: DAILY_QUERIES_GROUP_NAME, queries: dailyQueries, searchType: "emails", start: true })}
            disabled={dailyQueries.length === 0 || dailyGroupExists || createGroup.isPending}
            data-testid="button-run-daily-queries"
          >
            <Play className="h-4 w-4 mr-2" />
            {dailyGroupExists ? "Daily queries group exists" : `Run the ${dailyQueries.length} daily queries`}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowNewGroup((open) => !open)} data-testid="button-new-query-group">
            <Plus className="h-4 w-4 mr-2" />
            New group
          </Button>
        </div>

        {showNewGroup && (
          <div className="p-4 bg-slate-50 rounded-lg space-y-3" data-testid="form-new-query-group">
            <Input
              placeholder="Group name, e.g. Midsize law firms"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="Who should this group find? Used for query suggestions, e.g. midsize law firms in Miami"
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              className="text-sm"
            />
            <Textarea
              placeholder={"One search query per line, e.g.\nreal estate lawyers in Miami\nfamily law firms in Fort Lauderdale"}
              value={newQueries}
              onChange={(event) => setNewQueries(event.target.value)}
              rows={5}
              className="text-sm"
            />
            <Select value={newSearchType} onValueChange={(value) => setNewSearchType(value as GroupSearchType)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUP_SEARCH_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {searchTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => suggestQueries.mutate(newDescription.trim() || newName.trim())}
                disabled={suggestQueries.isPending || (newDescription.trim().length === 0 && newName.trim().length === 0)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {suggestQueries.isPending ? "Suggesting…" : "Suggest queries"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canCreate}
                onClick={() => createGroup.mutate({ name: newName.trim(), queries: newGroupQueries, searchType: newSearchType, start: false })}
              >
                Create
              </Button>
              <Button
                size="sm"
                disabled={!canCreate}
                onClick={() => createGroup.mutate({ name: newName.trim(), queries: newGroupQueries, searchType: newSearchType, start: true })}
              >
                <Play className="h-4 w-4 mr-2" />
                Create and run
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading groups…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-slate-500">No query groups yet. Run the daily queries or create a group.</p>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => {
              const pending = group.items.filter((item) => item.status === "pending").length;
              const done = group.items.filter((item) => item.status === "completed").length;
              const failed = group.items.filter((item) => item.status === "failed").length;
              const running = group.status === "active" || group.isRunning;
              return (
                <div key={group.id} className="p-4 bg-slate-50 rounded-lg space-y-3" data-testid={`query-group-${group.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{group.name}</span>
                        {statusBadge(group)}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {searchTypeConfigs.find((config) => config.type === group.searchType)?.label ?? group.searchType}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>
                          {done} done · {pending} pending{failed > 0 ? ` · ${failed} failed` : ""}
                        </span>
                        {group.contactList && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                            onClick={() => navigate(`/contact-lists/${group.contactList!.id}`)}
                          >
                            <Users className="h-3 w-3" />
                            {group.contactList.name} · {group.contactList.contactCount}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {running ? (
                        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => pauseGroup.mutate(group.id)} disabled={pauseGroup.isPending}>
                          <Pause className="h-3 w-3 mr-1" />
                          Pause
                        </Button>
                      ) : (
                        <Button size="sm" className="h-7 text-xs" onClick={() => startGroup.mutate(group.id)} disabled={pending === 0 || startGroup.isPending}>
                          <Play className="h-3 w-3 mr-1" />
                          {done + failed > 0 ? "Resume" : "Start"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => {
                          setAddingToGroupId(addingToGroupId === group.id ? null : group.id);
                          setExtraQueries("");
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Queries
                      </Button>
                    </div>
                  </div>

                  {addingToGroupId === group.id && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="More queries, one per line"
                        value={extraQueries}
                        onChange={(event) => setExtraQueries(event.target.value)}
                        rows={3}
                        className="text-sm bg-white"
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={splitQueries(extraQueries).length === 0 || addQueries.isPending}
                        onClick={() => addQueries.mutate({ groupId: group.id, queries: splitQueries(extraQueries) })}
                      >
                        Add to group
                      </Button>
                    </div>
                  )}

                  <ul className="space-y-1.5">
                    {group.items.map((item) => (
                      <li key={item.id} className="text-sm">
                        <div className="flex items-center gap-2">
                          {itemIcon(item.status)}
                          <span className="flex-1 min-w-0 truncate text-slate-700">{item.prompt}</span>
                          {item.status === "completed" && (
                            <span className="text-xs text-slate-500 whitespace-nowrap">{item.resultCount ?? 0} companies</span>
                          )}
                          {item.savedSearchNumber && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              title="Open the saved search"
                              onClick={() => navigate(generateSearchUrl(item.prompt, item.savedSearchNumber!))}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        {typeof (item.metadata as { reason?: unknown } | null)?.reason === "string" && (
                          <p className="ml-5 text-xs text-slate-500">Why: {(item.metadata as { reason: string }).reason}</p>
                        )}
                        {item.errorMessage && (
                          <p className={`ml-5 text-xs ${item.status === "failed" ? "text-red-600" : "text-amber-700"}`}>{item.errorMessage}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

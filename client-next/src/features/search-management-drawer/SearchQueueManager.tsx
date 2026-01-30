import { useState } from "react";
import { Plus, Play, Pause, Trash2, Clock, CheckCircle, AlertCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SearchQueue, SearchQueueItem } from "@shared/schema";

export function SearchQueueManager() {
  const [newSearchPrompt, setNewSearchPrompt] = useState("");
  const { toast } = useToast();

  // Fetch search queues
  const { data: searchQueues = [], isLoading } = useQuery<SearchQueue[]>({
    queryKey: ["/api/search-queues"],
  });

  // Get the active queue (for now, just the first one)
  const activeQueue = searchQueues[0] || null;
  const queueItems = activeQueue?.items || [];
  
  const runningCount = queueItems.filter((item: SearchQueueItem) => item.status === 'running').length;
  const pendingCount = queueItems.filter((item: SearchQueueItem) => item.status === 'pending').length;
  const completedCount = queueItems.filter((item: SearchQueueItem) => item.status === 'completed').length;

  // Create search queue mutation
  const createQueueMutation = useMutation({
    mutationFn: async ({ name, campaignId }: { name: string; campaignId: number | null }) => {
      return apiRequest("POST", "/api/search-queues", { name, campaignId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-queues"] });
    }
  });

  // Add to queue mutation
  const addToQueueMutation = useMutation({
    mutationFn: async ({ queueId, prompt }: { queueId: number; prompt: string }) => {
      return apiRequest("POST", `/api/search-queues/${queueId}/items`, { prompt });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-queues"] });
      setNewSearchPrompt("");
      toast({
        title: "Search added to queue",
        description: "Your search has been added to the queue."
      });
    },
    onError: () => {
      toast({
        title: "Failed to add search",
        description: "There was an error adding your search to the queue.",
        variant: "destructive"
      });
    }
  });

  // Delete from queue mutation
  const deleteFromQueueMutation = useMutation({
    mutationFn: async ({ queueId, itemId }: { queueId: number; itemId: string }) => {
      return apiRequest("DELETE", `/api/search-queues/${queueId}/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-queues"] });
      toast({
        title: "Search removed",
        description: "The search has been removed from the queue."
      });
    }
  });

  // Execute queue mutation
  const executeQueueMutation = useMutation({
    mutationFn: async (queueId: number) => {
      return apiRequest("POST", `/api/search-queues/${queueId}/execute`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-queues"] });
      toast({
        title: "Queue execution started",
        description: "Your search queue is now being processed."
      });
    }
  });

  // Pause queue mutation
  const pauseQueueMutation = useMutation({
    mutationFn: async (queueId: number) => {
      return apiRequest("POST", `/api/search-queues/${queueId}/pause`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-queues"] });
      toast({
        title: "Queue paused",
        description: "The search queue has been paused."
      });
    }
  });

  const handleAddSearch = () => {
    if (!newSearchPrompt.trim()) return;
    
    if (activeQueue) {
      addToQueueMutation.mutate({ 
        queueId: activeQueue.id, 
        prompt: newSearchPrompt 
      });
    } else {
      // Create a default queue first
      createQueueMutation.mutate({ 
        name: "Default Search Queue", 
        campaignId: null 
      });
    }
  };

  const handleDeleteSearch = (itemId: string | number) => {
    if (!activeQueue) return;
    deleteFromQueueMutation.mutate({ 
      queueId: activeQueue.id, 
      itemId: String(itemId)
    });
  };

  const handleExecuteQueue = () => {
    if (!activeQueue) return;
    executeQueueMutation.mutate(activeQueue.id);
  };

  const handlePauseQueue = () => {
    if (!activeQueue) return;
    pauseQueueMutation.mutate(activeQueue.id);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <PlayCircle className="h-3 w-3 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'pending':
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      default:
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="default" className="text-[10px] px-1.5 py-0">Running</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Pending</Badge>;
      default:
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Failed</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Queue Status Bar */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <PlayCircle className="h-3 w-3 text-blue-500" />
            <span className="text-muted-foreground">Running:</span>
            <span className="font-medium">{runningCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-yellow-500" />
            <span className="text-muted-foreground">Pending:</span>
            <span className="font-medium">{pendingCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span className="text-muted-foreground">Completed:</span>
            <span className="font-medium">{completedCount}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {activeQueue?.status === 'active' ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={handlePauseQueue}
              disabled={pauseQueueMutation.isPending}
              className="h-7 text-xs"
            >
              <Pause className="h-3 w-3 mr-1" />
              Pause
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleExecuteQueue}
              disabled={executeQueueMutation.isPending || queueItems.length === 0}
              className="h-7 text-xs"
            >
              <Play className="h-3 w-3 mr-1" />
              Start
            </Button>
          )}
        </div>
      </div>

      {/* Add Search Input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Add Search to Queue</label>
        <div className="flex gap-2">
          <Input
            placeholder="Enter search prompt (e.g., 'B2B SaaS CTOs in San Francisco')"
            value={newSearchPrompt}
            onChange={(e) => setNewSearchPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddSearch();
              }
            }}
            className="mobile-input text-sm"
          />
          <Button
            size="sm"
            onClick={handleAddSearch}
            disabled={!newSearchPrompt.trim() || addToQueueMutation.isPending}
            className="h-9"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Queue List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Search Queue</label>
          <span className="text-xs text-muted-foreground">Drag to reorder, click to edit</span>
        </div>
        
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Loading queue...
            </div>
          ) : queueItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No searches in queue
            </div>
          ) : (
            queueItems.map((item: SearchQueueItem) => (
              <div
                key={item.id}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-background border hover:bg-muted/30 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(item.status)}
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-sm truncate">{item.prompt}</p>
                  {item.resultCount !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.resultCount} results found
                    </p>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteSearch(item.id)}
                  disabled={item.status === 'running'}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
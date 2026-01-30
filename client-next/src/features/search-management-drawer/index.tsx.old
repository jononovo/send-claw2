import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Settings,
  Clock,
  Target,
  Users,
  AlertCircle,
  Loader2
} from "lucide-react";

interface SearchQueueItem {
  id: string;
  prompt: string;
  order: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt?: string;
  completedAt?: string;
  resultCount?: number;
}

interface SearchQueue {
  id: number;
  name: string;
  campaignId: number | null;
  campaignName?: string;
  status: 'active' | 'paused';
  items: SearchQueueItem[];
  createdAt: string;
  updatedAt: string;
}

interface SearchManagementDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchManagementDrawer({ isOpen, onOpenChange }: SearchManagementDrawerProps) {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("queue");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [newSearchPrompt, setNewSearchPrompt] = useState("");
  const [editingQueue, setEditingQueue] = useState<SearchQueue | null>(null);

  // Fetch campaigns for the dropdown
  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ["/api/campaigns"],
    enabled: isOpen
  });

  // Fetch search queues
  const { data: searchQueues = [], isLoading: queuesLoading } = useQuery<SearchQueue[]>({
    queryKey: ["/api/search-queues"],
    enabled: isOpen
  });

  // Create new search queue
  const createQueueMutation = useMutation({
    mutationFn: async (data: { name: string; campaignId: number | null }) => {
      return apiRequest("POST", "/api/search-queues", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-queues"] });
      toast({
        title: "Search queue created",
        description: "Your new search queue has been created successfully."
      });
    },
    onError: () => {
      toast({
        title: "Failed to create queue",
        description: "There was an error creating the search queue.",
        variant: "destructive"
      });
    }
  });

  // Add search to queue
  const addToQueueMutation = useMutation({
    mutationFn: async ({ queueId, prompt }: { queueId: number; prompt: string }) => {
      return apiRequest("POST", `/api/search-queues/${queueId}/items`, { prompt });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-queues"] });
      setNewSearchPrompt("");
      toast({
        title: "Search added to queue",
        description: "The search has been added to your queue."
      });
    },
    onError: () => {
      toast({
        title: "Failed to add search",
        description: "There was an error adding the search to the queue.",
        variant: "destructive"
      });
    }
  });

  // Delete search from queue
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

  // Execute search queue
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
    },
    onError: () => {
      toast({
        title: "Failed to execute queue",
        description: "There was an error starting the queue execution.",
        variant: "destructive"
      });
    }
  });

  // Pause search queue
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

  // Get the active queue (for now, just the first one or create a new one)
  const activeQueue = searchQueues?.[0] || null;

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
        campaignId: selectedCampaignId ? parseInt(selectedCampaignId) : null 
      });
    }
  };

  const handleDeleteSearch = (itemId: string) => {
    if (!activeQueue) return;
    deleteFromQueueMutation.mutate({ 
      queueId: activeQueue.id, 
      itemId 
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

  // Mock data for development (will be replaced with real data from API)
  const mockQueueItems: SearchQueueItem[] = [
    { id: "1", prompt: "B2B SaaS CTOs in San Francisco", order: 1, status: 'completed', resultCount: 145 },
    { id: "2", prompt: "VP Engineering at Series A startups", order: 2, status: 'running' },
    { id: "3", prompt: "Technical founders in New York", order: 3, status: 'pending' },
    { id: "4", prompt: "DevOps managers at enterprise companies", order: 4, status: 'pending' },
  ];

  const queueItems = activeQueue?.items || mockQueueItems;
  const runningCount = queueItems.filter(item => item.status === 'running').length;
  const pendingCount = queueItems.filter(item => item.status === 'pending').length;
  const completedCount = queueItems.filter(item => item.status === 'completed').length;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:w-[600px] sm:max-w-[600px] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Search Management
          </SheetTitle>
          <SheetDescription>
            Manage your search queue and campaign integration
          </SheetDescription>
        </SheetHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1">
          <TabsList className="w-full rounded-none border-b px-6">
            <TabsTrigger value="queue" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Queue
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="campaign" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Campaign
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-180px)]">
            <TabsContent value="queue" className="p-6 space-y-4">
              {/* Queue Status */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Queue Status</CardTitle>
                    <div className="flex gap-2">
                      {activeQueue?.status === 'active' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePauseQueue}
                          disabled={pauseQueueMutation.isPending}
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExecuteQueue}
                          disabled={executeQueueMutation.isPending || pendingCount === 0}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-muted-foreground">Running:</span>
                      <span className="font-medium">{runningCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      <span className="text-muted-foreground">Pending:</span>
                      <span className="font-medium">{pendingCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span className="text-muted-foreground">Completed:</span>
                      <span className="font-medium">{completedCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Add New Search */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Add Search to Queue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Enter search prompt (e.g., 'B2B SaaS CTOs in San Francisco')"
                      value={newSearchPrompt}
                      onChange={(e) => setNewSearchPrompt(e.target.value)}
                      className="min-h-[60px]"
                    />
                    <Button
                      onClick={handleAddSearch}
                      disabled={!newSearchPrompt.trim() || addToQueueMutation.isPending}
                    >
                      {addToQueueMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Queue Items */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Search Queue</CardTitle>
                  <CardDescription>
                    Drag to reorder, click to edit
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {queueItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No searches in queue. Add one above to get started.
                    </div>
                  ) : (
                    queueItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            disabled={index === queueItems.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {item.status === 'running' && (
                              <Badge variant="default" className="text-xs">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Running
                              </Badge>
                            )}
                            {item.status === 'completed' && (
                              <Badge variant="secondary" className="text-xs">
                                Completed
                              </Badge>
                            )}
                            {item.status === 'failed' && (
                              <Badge variant="destructive" className="text-xs">
                                Failed
                              </Badge>
                            )}
                            {item.status === 'pending' && (
                              <Badge variant="outline" className="text-xs">
                                Pending
                              </Badge>
                            )}
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
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="campaign" className="p-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Campaign Integration</CardTitle>
                  <CardDescription>
                    Link searches to a campaign for automatic contact management
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Target Campaign</Label>
                    <Select
                      value={selectedCampaignId || "none"}
                      onValueChange={(value) => setSelectedCampaignId(value === "none" ? null : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No campaign (manual)</SelectItem>
                        {campaigns.map((campaign: any) => (
                          <SelectItem key={campaign.id} value={campaign.id.toString()}>
                            {campaign.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      New search results will automatically be added to this campaign
                    </p>
                  </div>

                  {selectedCampaignId && selectedCampaignId !== "none" && (
                    <div className="rounded-lg border p-3 bg-accent/50">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium mb-1">Automatic Processing Enabled</p>
                          <p className="text-muted-foreground">
                            Search results will be automatically added to the selected campaign
                            and become available for email sequences.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <Label>Trigger Settings</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Auto-run when low on contacts</p>
                          <p className="text-xs text-muted-foreground">
                            Run next search when campaign has fewer than 50 unused contacts
                          </p>
                        </div>
                        <Input
                          type="number"
                          className="w-20"
                          defaultValue="50"
                          min="10"
                          max="500"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="p-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Search Preferences</CardTitle>
                  <CardDescription>
                    Configure default settings for search operations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Results per Search</Label>
                    <Select defaultValue="100">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50 results</SelectItem>
                        <SelectItem value="100">100 results</SelectItem>
                        <SelectItem value="200">200 results</SelectItem>
                        <SelectItem value="500">500 results</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Delay Between Searches</Label>
                    <Select defaultValue="30">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="120">2 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Time to wait between executing searches in the queue
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Queue Behavior</Label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm">Continue on search failure</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm">Remove completed searches from queue</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Notify when queue completes</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
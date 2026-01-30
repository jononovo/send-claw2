import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronUp,
  Menu,
  Target,
  Plus,
  User,
  Package,
  Users as UsersIcon,
  Calendar,
  TrendingUp,
  Play,
  Pause,
  Edit,
  Trash2,
  Sparkles,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Campaign } from "@shared/schema";

const createCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  durationDays: z.number().min(1).default(14),
  dailyLeadTarget: z.number().min(1).default(5),
});

export default function CampaignsPage() {
  const { toast } = useToast();
  const { user, authReady } = useAuth();
  const [, setLocation] = useLocation();
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<number>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof createCampaignSchema>>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      name: "",
      durationDays: 14,
      dailyLeadTarget: 5,
    },
  });

  // Wait for auth to be ready before fetching campaigns to prevent 401s on idle tab return
  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
    enabled: authReady && !!user,
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createCampaignSchema>) => {
      return await apiRequest('POST', '/api/campaigns', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      toast({
        title: "Campaign created",
        description: "Your campaign has been successfully created",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      await apiRequest('DELETE', `/api/campaigns/${campaignId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      toast({
        title: "Campaign deleted",
        description: "Campaign has been successfully deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest('PUT', `/api/campaigns/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      toast({
        title: "Campaign updated",
        description: "Campaign status has been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update campaign",
        variant: "destructive",
      });
    },
  });

  const toggleExpand = (campaignId: number) => {
    setExpandedCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  };

  const handleDeleteCampaign = (campaignId: number) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      deleteCampaignMutation.mutate(campaignId);
    }
  };

  const handleToggleStatus = (campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    updateCampaignMutation.mutate({ id: campaign.id, status: newStatus });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { variant: "outline" as const, className: "text-gray-600" },
      active: { variant: "default" as const, className: "bg-green-600" },
      paused: { variant: "secondary" as const, className: "text-yellow-600" },
      stopped: { variant: "destructive" as const, className: "" },
      completed: { variant: "outline" as const, className: "text-blue-600" },
    };
    return variants[status as keyof typeof variants] || variants.draft;
  };

  const onSubmit = (data: z.infer<typeof createCampaignSchema>) => {
    createCampaignMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage your outreach campaigns
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          data-testid="button-create-campaign"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first campaign to start generating leads
          </p>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            data-testid="button-create-first-campaign"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const isExpanded = expandedCampaigns.has(campaign.id);
            const statusBadge = getStatusBadge(campaign.status);

            return (
              <Card
                key={campaign.id}
                className={cn(
                  "rounded-lg transition-all duration-200 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800"
                )}
                data-testid={`campaign-card-${campaign.id}`}
              >
                <div 
                  onClick={() => setLocation(`/campaigns/${campaign.id}`)} 
                  className="p-3 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-t-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-base leading-tight flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                              <Target className="h-4 w-4 text-muted-foreground" />
                              {campaign.name}
                            </h3>
                            <Badge
                              {...statusBadge}
                              className={statusBadge.className}
                              data-testid={`badge-status-${campaign.id}`}
                            >
                              {campaign.status}
                            </Badge>
                            {campaign.generationType && (
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1"
                                data-testid={`badge-generation-type-${campaign.id}`}
                              >
                                {campaign.generationType === 'ai_unique' ? (
                                  <>
                                    <Sparkles className="h-3 w-3" />
                                    AI Unique
                                  </>
                                ) : (
                                  <>
                                    <FileText className="h-3 w-3" />
                                    Template
                                  </>
                                )}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {campaign.totalLeadsGenerated > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <UsersIcon className="h-3 w-3" />
                                <span>{campaign.totalLeadsGenerated} leads</span>
                              </div>
                            )}
                            {campaign.responseRate !== null && campaign.responseRate > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <TrendingUp className="h-3 w-3" />
                                <span>{(campaign.responseRate * 100).toFixed(1)}% response</span>
                              </div>
                            )}
                            {campaign.durationDays && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{campaign.durationDays} days</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-accent-hover"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(campaign.id);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Badge>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`button-menu-${campaign.id}`}
                              >
                                <Menu className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStatus(campaign);
                                }}
                                data-testid={`menu-toggle-status-${campaign.id}`}
                              >
                                {campaign.status === 'active' ? (
                                  <>
                                    <Pause className="mr-2 h-4 w-4" />
                                    Pause Campaign
                                  </>
                                ) : (
                                  <>
                                    <Play className="mr-2 h-4 w-4" />
                                    Activate Campaign
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/campaigns/${campaign.id}`);
                                }}
                                data-testid={`menu-edit-${campaign.id}`}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Campaign
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCampaign(campaign.id);
                                }}
                                className="text-red-600"
                                data-testid={`menu-delete-${campaign.id}`}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Campaign
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Sender Profile:</span>
                          <span className="text-muted-foreground">
                            {campaign.senderProfileId || 'Not set'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Product:</span>
                          <span className="text-muted-foreground">
                            {campaign.strategicProfileId || 'Not set'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <UsersIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Target Customer:</span>
                          <span className="text-muted-foreground">
                            {campaign.targetCustomerProfileId || 'Not set'}
                          </span>
                        </div>
                        {campaign.generationType && (
                          <div className="flex items-center gap-2 text-sm">
                            {campaign.generationType === 'ai_unique' ? (
                              <Sparkles className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium">Generation Type:</span>
                            <span className="text-muted-foreground">
                              {campaign.generationType === 'ai_unique' 
                                ? 'AI Unique Emails' 
                                : 'Merge-field Template'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Daily Target:</span>
                          <span className="text-muted-foreground ml-2">
                            {campaign.dailyLeadTarget} leads
                          </span>
                        </div>
                        {campaign.startDate && (
                          <div className="text-sm">
                            <span className="font-medium">Start Date:</span>
                            <span className="text-muted-foreground ml-2">
                              {new Date(campaign.startDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {campaign.endDate && (
                          <div className="text-sm">
                            <span className="font-medium">End Date:</span>
                            <span className="text-muted-foreground ml-2">
                              {new Date(campaign.endDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Created:</span>
                          <span className="text-muted-foreground ml-2">
                            {new Date(campaign.createdAt!).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Last Updated:</span>
                          <span className="text-muted-foreground ml-2">
                            {new Date(campaign.updatedAt!).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription>
              Set up a new outreach campaign to generate leads
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Q1 2024 Outreach" 
                        {...field} 
                        data-testid="input-campaign-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="durationDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (days)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        data-testid="input-duration-days"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dailyLeadTarget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Lead Target</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        data-testid="input-daily-lead-target"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createCampaignMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

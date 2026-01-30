import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Mail, 
  MousePointer, 
  Reply, 
  AlertCircle, 
  UserX,
  Play,
  Pause,
  Settings,
  Calendar,
  Users,
  Target,
  Eye,
  ChevronDown,
  MoreVertical,
  Trash2,
  Zap,
  StopCircle,
  RefreshCw,
  Check,
  X
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Campaign } from "@shared/schema";
import { CampaignProgressSection } from "@/components/campaign/CampaignProgressSection";
import { AutopilotModal, type AutopilotSettings } from "@/components/autopilot-modal";

interface RecipientInfo {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  status: string;
  sentAt: Date | null;
  openedAt: Date | null;
  clickedAt: Date | null;
  repliedAt: Date | null;
  bouncedAt: Date | null;
  unsubscribedAt: Date | null;
  lastActivity: Date | null;
  emailSubject?: string;
  emailContent?: string;
}

interface CampaignWithMetrics extends Campaign {
  totalRecipients: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsReplied: number;
  emailsBounced: number;
  emailsUnsubscribed: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  emailSubject?: string;
  emailBody?: string;
  contactListName?: string;
  recipients: RecipientInfo[];
  recipientsInReview?: RecipientInfo[];
  reviewCount?: number;
}

interface RecipientTableProps {
  recipients: RecipientInfo[];
  showError?: boolean;
  errorMessage?: string;
}

// RecipientTable component - displays recipients in a table format
const RecipientTable = ({ recipients, showError = false, errorMessage }: RecipientTableProps) => {
  const getStatusBadge = (recipient: RecipientInfo) => {
    if (recipient.repliedAt) {
      return <Badge className="bg-blue-500 text-white">Replied</Badge>;
    }
    if (recipient.clickedAt) {
      return <Badge className="bg-green-500 text-white">Clicked</Badge>;
    }
    if (recipient.openedAt) {
      return <Badge className="bg-yellow-500 text-white">Opened</Badge>;
    }
    if (recipient.bouncedAt) {
      return <Badge variant="destructive">Bounced</Badge>;
    }
    if (recipient.unsubscribedAt) {
      return <Badge variant="secondary">Unsubscribed</Badge>;
    }
    if (recipient.sentAt) {
      return <Badge variant="outline">Sent</Badge>;
    }
    
    // Status-based badges
    switch (recipient.status) {
      case 'queued':
      case 'scheduled':
        return <Badge variant="secondary">Queued</Badge>;
      case 'sent':
        return <Badge variant="outline">Sent</Badge>;
      case 'manual_send_required':
        return <Badge className="bg-yellow-500 text-white">Manual Send Required</Badge>;
      case 'failed_generation':
        return <Badge variant="destructive">Failed Generation</Badge>;
      case 'failed_send':
        return <Badge variant="destructive">Failed Send</Badge>;
      case 'in_review':
        return <Badge>In Review</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return format(new Date(date), 'MMM d, h:mm a');
  };

  if (recipients.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Mail className="h-8 w-8 mx-auto mb-3 opacity-50" />
        <p>No recipients found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 font-medium">Recipient</th>
            <th className="text-left p-3 font-medium">Company</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-left p-3 font-medium">Events</th>
            {showError && <th className="text-left p-3 font-medium">Error</th>}
          </tr>
        </thead>
        <tbody>
          {recipients.map((recipient) => (
            <tr key={recipient.id} className="border-b hover:bg-muted/30 transition-colors">
              <td className="p-3">
                <div>
                  <div className="font-medium">
                    {recipient.firstName} {recipient.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {recipient.email}
                  </div>
                </div>
              </td>
              <td className="p-3">
                <span className="text-sm">{recipient.companyName}</span>
              </td>
              <td className="p-3">
                {getStatusBadge(recipient)}
              </td>
              <td className="p-3">
                <div className="text-sm space-y-1">
                  {recipient.sentAt && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span>Sent: {formatDate(recipient.sentAt)}</span>
                    </div>
                  )}
                  {recipient.openedAt && (
                    <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                      <Eye className="h-3 w-3" />
                      <span>Opened: {formatDate(recipient.openedAt)}</span>
                    </div>
                  )}
                  {recipient.clickedAt && (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <MousePointer className="h-3 w-3" />
                      <span>Clicked: {formatDate(recipient.clickedAt)}</span>
                    </div>
                  )}
                  {recipient.repliedAt && (
                    <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <Reply className="h-3 w-3" />
                      <span>Replied: {formatDate(recipient.repliedAt)}</span>
                    </div>
                  )}
                  {recipient.bouncedAt && (
                    <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <AlertCircle className="h-3 w-3" />
                      <span>Bounced: {formatDate(recipient.bouncedAt)}</span>
                    </div>
                  )}
                  {recipient.unsubscribedAt && (
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <UserX className="h-3 w-3" />
                      <span>Unsubscribed: {formatDate(recipient.unsubscribedAt)}</span>
                    </div>
                  )}
                  {!recipient.sentAt && !recipient.openedAt && !recipient.clickedAt && 
                   !recipient.repliedAt && !recipient.bouncedAt && !recipient.unsubscribedAt && (
                    <span className="text-muted-foreground">No activity yet</span>
                  )}
                </div>
              </td>
              {showError && (
                <td className="p-3">
                  {(recipient.status === 'failed_generation' || recipient.status === 'failed_send') ? (
                    <span className="text-sm text-red-600 dark:text-red-400">
                      {recipient.status === 'failed_generation' ? 'Generation failed' : 'Send failed'}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function CampaignDetail() {
  const params = useParams();
  const campaignId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [autopilotModalOpen, setAutopilotModalOpen] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [restartMode, setRestartMode] = useState<'all' | 'failed'>('failed');
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());

  const { data: campaign, isLoading, error, refetch } = useQuery<CampaignWithMetrics>({
    queryKey: ['/api/campaigns', campaignId],
    enabled: !!campaignId,
    // Keep data fresh but don't refetch on window focus since we have auto-refresh
    refetchOnWindowFocus: false
  });
  
  // Auto-refresh campaign data every 20 seconds when page is visible
  useEffect(() => {
    // Only set up auto-refresh if we have a campaign
    if (!campaignId) return;
    
    let intervalId: NodeJS.Timeout | null = null;
    
    const startAutoRefresh = () => {
      // Clear any existing interval
      if (intervalId) {
        clearInterval(intervalId);
      }
      
      // Set up new interval for 20 seconds
      intervalId = setInterval(() => {
        // Only refetch if the document is visible
        if (document.visibilityState === 'visible') {
          console.log('Auto-refreshing campaign data...');
          refetch();
          setLastRefreshTime(new Date());
        }
      }, 20000); // 20 seconds
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible - start auto-refresh and do immediate refresh
        console.log('Page became visible, refreshing campaign data');
        refetch();
        setLastRefreshTime(new Date());
        startAutoRefresh();
      } else {
        // Page became hidden - stop auto-refresh to save resources
        console.log('Page became hidden, pausing auto-refresh');
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };
    
    // Start auto-refresh if page is currently visible
    if (document.visibilityState === 'visible') {
      startAutoRefresh();
    }
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [campaignId, refetch, setLastRefreshTime]);

  const updateCampaignMutation = useMutation({
    mutationFn: async (updates: Partial<Campaign>) => {
      return apiRequest('PUT', `/api/campaigns/${campaignId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      toast({
        title: "Campaign updated",
        description: "Your campaign has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update campaign",
        variant: "destructive",
      });
    }
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/campaigns/${campaignId}`);
    },
    onSuccess: () => {
      toast({
        title: "Campaign deleted",
        description: "Your campaign has been deleted successfully.",
      });
      setLocation('/campaigns');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete campaign",
        variant: "destructive",
      });
    }
  });

  const restartCampaignMutation = useMutation({
    mutationFn: async (mode: 'all' | 'failed') => {
      return apiRequest('POST', `/api/campaigns/${campaignId}/restart`, { mode });
    },
    onSuccess: (_, mode) => {
      // Invalidate both the campaigns list and the specific campaign detail
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId] });
      setRestartDialogOpen(false);
      toast({
        title: "Campaign restarted",
        description: mode === 'all' 
          ? "The campaign will re-send to all recipients."
          : "The campaign will queue failed recipients for retry.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restart campaign",
        variant: "destructive",
      });
    }
  });

  // Handler functions for review queue
  const handleApproveBatch = async (campaignId: number, recipientIds: number[]) => {
    try {
      await apiRequest('POST', `/api/campaigns/${campaignId}/review/approve`, { recipientIds });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId] });
      toast({
        title: "Emails approved",
        description: `${recipientIds.length} emails approved for sending`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve emails",
        variant: "destructive",
      });
    }
  };

  const handleRejectBatch = async (campaignId: number, recipientIds: number[]) => {
    try {
      await apiRequest('POST', `/api/campaigns/${campaignId}/review/reject`, { recipientIds });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId] });
      toast({
        title: "Emails rejected",
        description: `${recipientIds.length} emails will be regenerated`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject emails",
        variant: "destructive",
      });
    }
  };

  const handleApproveEmail = async (campaignId: number, recipientId: number) => {
    await handleApproveBatch(campaignId, [recipientId]);
  };

  const handleRejectEmail = async (campaignId: number, recipientId: number) => {
    await handleRejectBatch(campaignId, [recipientId]);
  };

  const handleRetryFailed = async (campaignId: number) => {
    try {
      await apiRequest(`/api/campaigns/${campaignId}/retry-failed`, 'POST');
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId] });
      toast({
        title: "Retrying failed emails",
        description: "Failed emails are being retried",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to retry emails",
        variant: "destructive",
      });
    }
  };

  const handleCampaignAction = async (action: string) => {
    switch (action) {
      case 'pause':
        updateCampaignMutation.mutate({ status: 'paused' });
        break;
      case 'resume':
        updateCampaignMutation.mutate({ status: 'active' });
        break;
      case 'activate':
        updateCampaignMutation.mutate({ status: 'active' });
        break;
      case 'stop':
        if (confirm('Are you sure you want to stop this campaign? This will permanently halt all sending.')) {
          updateCampaignMutation.mutate({ status: 'completed' });
        }
        break;
      case 'restart':
        setRestartDialogOpen(true);
        break;
      case 'edit':
        setIsEditMode(true);
        toast({
          title: "Edit mode",
          description: "You can now edit the campaign settings.",
        });
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
          deleteCampaignMutation.mutate();
        }
        break;
    }
  };

  const handleRestartConfirm = () => {
    restartCampaignMutation.mutate(restartMode);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading campaign details...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-2 text-sm font-semibold">Campaign not found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The campaign you're looking for doesn't exist or has been deleted.
          </p>
          <div className="mt-6">
            <Link href="/campaigns">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to campaigns
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const, className: '' },
      scheduled: { label: 'Scheduled', variant: 'default' as const, className: '' },
      active: { label: 'Active', variant: 'default' as const, className: 'bg-green-500 hover:bg-green-600' },
      paused: { label: 'Paused', variant: 'secondary' as const, className: 'bg-yellow-500 hover:bg-yellow-600' },
      stopped: { label: 'Stopped', variant: 'destructive' as const, className: '' },
      completed: { label: 'Completed', variant: 'secondary' as const, className: '' },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const, className: '' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge variant={config.variant} className={cn(config.className)}>
        {config.label}
      </Badge>
    );
  };

  const MetricCard = ({ 
    icon: Icon, 
    label, 
    value, 
    percentage, 
    color = "text-foreground" 
  }: { 
    icon: any; 
    label: string; 
    value: number; 
    percentage?: number; 
    color?: string;
  }) => (
    <div className="flex flex-col items-center p-4 rounded-lg bg-muted/30">
      <Icon className={cn("h-8 w-8 mb-2", color)} />
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {percentage !== undefined && (
        <div className="text-xs text-muted-foreground mt-1">
          {percentage.toFixed(1)}%
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {campaign.createdAt && (
                <span className="text-sm text-muted-foreground">
                  Created {format(new Date(campaign.createdAt), 'MMM d, yyyy')}
                </span>
              )}
              {campaign.startDate && (
                <>
                  {campaign.createdAt && <span className="text-muted-foreground">•</span>}
                  <span className="text-sm text-muted-foreground">
                    {campaign.status === 'completed' ? 'Ended' : 'Started'} {format(new Date(campaign.startDate), 'MMM d, yyyy')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(campaign.status)}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                data-testid="button-campaign-actions"
              >
                Actions
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {campaign.status === 'active' ? (
                <>
                  <DropdownMenuItem 
                    onClick={() => handleCampaignAction('pause')}
                    className="text-orange-600 dark:text-orange-400"
                    data-testid="menu-pause-campaign"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause Campaign
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleCampaignAction('stop')}
                    className="text-red-600 dark:text-red-400"
                    data-testid="menu-stop-campaign"
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    Stop Campaign
                  </DropdownMenuItem>
                </>
              ) : campaign.status === 'paused' ? (
                <>
                  <DropdownMenuItem 
                    onClick={() => handleCampaignAction('resume')}
                    className="text-green-600 dark:text-green-400"
                    data-testid="menu-resume-campaign"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume Campaign
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleCampaignAction('stop')}
                    className="text-red-600 dark:text-red-400"
                    data-testid="menu-stop-campaign"
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    Stop Campaign
                  </DropdownMenuItem>
                </>
              ) : campaign.status === 'stopped' || campaign.status === 'completed' ? (
                <DropdownMenuItem 
                  onClick={() => handleCampaignAction('restart')}
                  className="text-blue-600 dark:text-blue-400"
                  data-testid="menu-restart-campaign"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restart Campaign
                </DropdownMenuItem>
              ) : null}
              
              <DropdownMenuItem 
                onClick={() => handleCampaignAction('edit')}
                data-testid="menu-edit-campaign"
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Settings
              </DropdownMenuItem>
              
              {campaign.status === 'draft' && (
                <DropdownMenuItem 
                  onClick={() => handleCampaignAction('activate')}
                  className="text-blue-600 dark:text-blue-400"
                  data-testid="menu-activate-campaign"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Activate Campaign
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => handleCampaignAction('delete')}
                className="text-red-600 dark:text-red-400"
                data-testid="menu-delete-campaign"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Campaign Progress Section */}
      {campaign.status !== 'draft' && (
        <CampaignProgressSection
          steps={[
            {
              stepNumber: 1,
              name: "Initial Email",
              description: "Sent at campaign creation",
              sent: campaign.emailsSent,
              opens: campaign.emailsOpened,
              openRate: campaign.openRate || 0,
              clicks: campaign.emailsClicked,
              clickRate: campaign.clickRate || 0,
              replies: campaign.emailsReplied,
              replyRate: campaign.replyRate || 0,
              unsubscribes: campaign.emailsUnsubscribed,
              unsubscribeRate: campaign.unsubscribeRate || 0,
              triggeredAt: campaign.startDate ? new Date(campaign.startDate) : undefined,
              status: campaign.emailsSent === campaign.totalRecipients ? 'completed' : 
                      campaign.status === 'active' ? 'in_progress' : 'pending'
            }
          ]}
          totalRecipients={campaign.totalRecipients}
        />
      )}

      {/* Overview Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Overview
          </CardTitle>
          <CardDescription>Campaign performance at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard 
              icon={Mail} 
              label="Emails sent" 
              value={campaign.emailsSent} 
              color="text-pink-500"
            />
            <MetricCard 
              icon={Eye} 
              label="Opens" 
              value={campaign.emailsOpened}
              percentage={campaign.openRate}
              color="text-yellow-500"
            />
            <MetricCard 
              icon={MousePointer} 
              label="Clicks" 
              value={campaign.emailsClicked}
              percentage={campaign.clickRate}
              color="text-green-500"
            />
            <MetricCard 
              icon={Reply} 
              label="Replied" 
              value={campaign.emailsReplied}
              percentage={campaign.replyRate}
              color="text-blue-500"
            />
            <MetricCard 
              icon={AlertCircle} 
              label="Bounces" 
              value={campaign.emailsBounced}
              percentage={campaign.bounceRate}
              color="text-red-500"
            />
            <MetricCard 
              icon={UserX} 
              label="Unsubscribes" 
              value={campaign.emailsUnsubscribed}
              percentage={campaign.unsubscribeRate}
              color="text-gray-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Details */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Campaign Details</TabsTrigger>
          <TabsTrigger value="recipients">Recipients ({campaign.totalRecipients})</TabsTrigger>
          <TabsTrigger value="review">
            Review Queue {campaign.reviewCount && campaign.reviewCount > 0 && `(${campaign.reviewCount})`}
          </TabsTrigger>
          <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campaign Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Campaign Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Contact List</span>
                  <span className="text-sm font-medium">{campaign.contactListName || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total recipients</span>
                  <span className="text-sm font-medium">{campaign.totalRecipients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sending progress</span>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(campaign.emailsSent / campaign.totalRecipients) * 100} 
                      className="w-24 h-2"
                    />
                    <span className="text-sm font-medium">
                      {((campaign.emailsSent / campaign.totalRecipients) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Generation type</span>
                  <Badge variant="outline">
                    {campaign.generationType === 'ai_unique' ? 'AI Unique' : 'Template'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Human review</span>
                  <span className="text-sm font-medium">
                    {campaign.requiresHumanReview ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tracking</span>
                  <span className="text-sm font-medium">
                    {campaign.trackEmails ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Unsubscribe link</span>
                  <span className="text-sm font-medium">
                    {campaign.unsubscribeLink ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                {/* Start Date and Time */}
                {campaign.startDate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Start date/time</span>
                    <span className="text-sm font-medium">
                      {format(new Date(campaign.startDate), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                )}
                
                {/* Autopilot Status */}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Autopilot</span>
                  <span className="text-sm font-medium">
                    {campaign.autopilotEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                {/* Sending Schedule - only show if autopilot is enabled */}
                {campaign.autopilotEnabled && campaign.autopilotSettings && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Sending schedule</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-sm font-medium"
                      onClick={() => setAutopilotModalOpen(true)}
                    >
                      View Schedule
                    </Button>
                  </div>
                )}
                
                {/* Timezone - only show if autopilot is enabled */}
                {campaign.autopilotEnabled && campaign.timezone && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Timezone</span>
                    <span className="text-sm font-medium">{campaign.timezone}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Daily cap</span>
                  <span className="text-sm font-medium">
                    Max {campaign.maxEmailsPerDay || 20} emails/day
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email delay</span>
                  <span className="text-sm font-medium">
                    {campaign.delayBetweenEmails || 0} {campaign.delayBetweenEmails === 1 ? 'minute' : 'minutes'} between emails
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Email Template Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Email Template</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Subject</div>
                    <div className="text-sm font-medium p-2 bg-muted rounded">
                      {campaign.emailSubject || 'No subject set'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Body Preview</div>
                    <div className="text-sm p-2 bg-muted rounded max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {campaign.emailBody ? 
                        campaign.emailBody.substring(0, 300) + (campaign.emailBody.length > 300 ? '...' : '') 
                        : 'No email body set'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recipients">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Recipients</CardTitle>
              <CardDescription>Track engagement for each recipient</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Status filter tabs */}
              <Tabs defaultValue="all" className="mb-4">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="all">
                    All ({campaign.recipients?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="queued">
                    Queued ({campaign.recipients?.filter(r => r.status === 'queued' || r.status === 'scheduled').length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="sent">
                    Sent ({campaign.recipients?.filter(r => r.status === 'sent').length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="manual">
                    Manual ({campaign.recipients?.filter(r => r.status === 'manual_send_required').length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="engaged">
                    Engaged ({campaign.recipients?.filter(r => r.openedAt || r.clickedAt || r.repliedAt).length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="failed">
                    Failed ({campaign.recipients?.filter(r => r.status === 'failed_generation' || r.status === 'failed_send').length || 0})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-4">
                  <RecipientTable recipients={campaign.recipients || []} />
                </TabsContent>
                
                <TabsContent value="queued" className="mt-4">
                  <RecipientTable recipients={campaign.recipients?.filter(r => r.status === 'queued' || r.status === 'scheduled') || []} />
                </TabsContent>
                
                <TabsContent value="sent" className="mt-4">
                  <RecipientTable recipients={campaign.recipients?.filter(r => r.status === 'sent') || []} />
                </TabsContent>
                
                <TabsContent value="engaged" className="mt-4">
                  <RecipientTable recipients={campaign.recipients?.filter(r => r.openedAt || r.clickedAt || r.repliedAt) || []} />
                </TabsContent>

                <TabsContent value="manual" className="mt-4">
                  <div className="space-y-4">
                    {campaign.recipients?.filter(r => r.status === 'manual_send_required').length > 0 ? (
                      <>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-medium text-yellow-800 dark:text-yellow-300">Manual Send Required</h4>
                              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                                Gmail is not connected for automatic sending. You'll need to send these emails manually.
                              </p>
                              <div className="flex gap-2 mt-3">
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open('/api/gmail/auth?userId=1', '_blank')}
                                >
                                  Connect Gmail
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const manualRecipients = campaign.recipients?.filter(r => r.status === 'manual_send_required') || [];
                                    if (manualRecipients.length > 0) {
                                      // Open first email in Gmail compose
                                      const recipient = manualRecipients[0];
                                      const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(recipient.email)}&su=${encodeURIComponent(recipient.emailSubject || '')}&body=${encodeURIComponent(recipient.emailContent || '')}`;
                                      window.open(gmailUrl, '_blank');
                                    }
                                  }}
                                >
                                  Open in Gmail
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <RecipientTable recipients={campaign.recipients?.filter(r => r.status === 'manual_send_required') || []} />
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Check className="h-8 w-8 mx-auto mb-3 opacity-50" />
                        <p>No manual sends required</p>
                        <p className="text-sm mt-1">All emails are being sent automatically</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="failed" className="mt-4">
                  <div className="space-y-4">
                    {campaign.recipients?.filter(r => r.status === 'failed_generation' || r.status === 'failed_send').length > 0 ? (
                      <>
                        <div className="flex justify-end">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRetryFailed(campaign.id)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Retry Failed
                          </Button>
                        </div>
                        <RecipientTable recipients={campaign.recipients?.filter(r => r.status === 'failed_generation' || r.status === 'failed_send') || []} showError={true} />
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Check className="h-8 w-8 mx-auto mb-3 opacity-50" />
                        <p>No failed recipients</p>
                        <p className="text-sm mt-1">All emails processed successfully</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>Email Review Queue</CardTitle>
              <CardDescription>Review and approve generated emails before sending</CardDescription>
            </CardHeader>
            <CardContent>
              {campaign.recipientsInReview && campaign.recipientsInReview.length > 0 ? (
                <div className="space-y-4">
                  {/* Review Actions */}
                  <div className="flex gap-2 justify-end pb-4 border-b">
                    <Button 
                      variant="outline" 
                      onClick={() => handleRejectBatch(campaign.id, campaign.recipientsInReview!.map(r => r.id))}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject All
                    </Button>
                    <Button 
                      onClick={() => handleApproveBatch(campaign.id, campaign.recipientsInReview!.map(r => r.id))}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve All
                    </Button>
                  </div>
                  
                  {/* Email Previews */}
                  <div className="space-y-4">
                    {campaign.recipientsInReview!.slice(0, 3).map((recipient) => (
                      <div key={recipient.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">
                              To: {recipient.firstName} {recipient.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {recipient.email} • {recipient.companyName}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleRejectEmail(campaign.id, recipient.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleApproveEmail(campaign.id, recipient.id)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Subject</div>
                            <div className="text-sm font-medium p-2 bg-muted rounded">
                              {recipient.emailSubject}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Body</div>
                            <div 
                              className="text-sm p-3 bg-muted rounded max-h-48 overflow-y-auto"
                              dangerouslySetInnerHTML={{ __html: recipient.emailContent || '' }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {campaign.recipientsInReview!.length > 3 && (
                    <div className="text-center text-sm text-muted-foreground pt-2">
                      Showing 3 of {campaign.recipientsInReview!.length} emails for review
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>No emails pending review</p>
                  <p className="text-sm mt-1">Emails will appear here after generation</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Recent campaign events and batch history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mock activity timeline for now - will be populated from actual events */}
                <div className="flex gap-4 items-start">
                  <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Campaign started</span>
                      <span className="text-xs text-muted-foreground">
                        {campaign.startDate ? format(new Date(campaign.startDate), 'MMM d, h:mm a') : 'Not started'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Campaign activated and ready to send emails
                    </p>
                  </div>
                </div>

                {campaign.emailsSent > 0 && (
                  <div className="flex gap-4 items-start">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Batch sent</span>
                        <span className="text-xs text-muted-foreground">Today</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Sent {campaign.emailsSent} emails to recipients
                      </p>
                    </div>
                  </div>
                )}

                {campaign.emailsOpened > 0 && (
                  <div className="flex gap-4 items-start">
                    <div className="h-2 w-2 rounded-full bg-purple-500 mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Recipients engaged</span>
                        <span className="text-xs text-muted-foreground">Ongoing</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {campaign.emailsOpened} opens, {campaign.emailsClicked} clicks recorded
                      </p>
                    </div>
                  </div>
                )}

                {campaign.status === 'paused' && (
                  <div className="flex gap-4 items-start">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Campaign paused</span>
                        <span className="text-xs text-muted-foreground">
                          {campaign.updatedAt ? format(new Date(campaign.updatedAt), 'MMM d, h:mm a') : 'Recently'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Campaign temporarily paused
                      </p>
                    </div>
                  </div>
                )}

                {campaign.status === 'completed' && (
                  <div className="flex gap-4 items-start">
                    <div className="h-2 w-2 rounded-full bg-gray-500 mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Campaign completed</span>
                        <span className="text-xs text-muted-foreground">
                          {campaign.endDate ? format(new Date(campaign.endDate), 'MMM d, h:mm a') : 'Recently'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        All scheduled emails have been sent
                      </p>
                    </div>
                  </div>
                )}

                {(!campaign.emailsSent || campaign.emailsSent === 0) && campaign.status !== 'completed' && (
                  <div className="text-center py-8 text-muted-foreground">
                    No activity yet. Campaign will start sending emails based on schedule.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Autopilot Modal for viewing/editing schedule */}
      {campaign && campaign.autopilotSettings && (
        <AutopilotModal
          open={autopilotModalOpen}
          onOpenChange={setAutopilotModalOpen}
          settings={typeof campaign.autopilotSettings === 'string' 
            ? JSON.parse(campaign.autopilotSettings) 
            : campaign.autopilotSettings}
          onApply={async (newSettings: AutopilotSettings) => {
            // Update the campaign with new autopilot settings
            await updateCampaignMutation.mutateAsync({
              autopilotSettings: newSettings
            });
            setAutopilotModalOpen(false);
            toast({
              title: "Schedule Updated",
              description: "Campaign autopilot schedule has been updated successfully.",
            });
          }}
          totalEmails={campaign.totalRecipients || 100}
        />
      )}

      {/* Restart Campaign Dialog */}
      <Dialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restart Campaign</DialogTitle>
            <DialogDescription>
              Choose how you want to restart this campaign
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <RadioGroup value={restartMode} onValueChange={(value: 'all' | 'failed') => setRestartMode(value)}>
              <div className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value="failed" id="failed" className="mt-1" />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="failed" className="cursor-pointer">
                    Only queue failed recipients
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Re-queue recipients whose emails failed to send or generate
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 space-y-0 mt-4">
                <RadioGroupItem value="all" id="all" className="mt-1" />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="all" className="cursor-pointer">
                    Resend to all campaign recipients
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Start over and re-send emails to everyone in the campaign
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestartDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestartConfirm} disabled={restartCampaignMutation.isPending}>
              {restartCampaignMutation.isPending ? "Restarting..." : "Restart Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
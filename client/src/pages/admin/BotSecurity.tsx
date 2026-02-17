import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Shield, RefreshCw, ChevronLeft, ChevronRight, RotateCcw, Play, ChevronDown, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface FlagItem {
  id: string;
  messageId: string | null;
  botId: string;
  botName: string | null;
  botAddress: string | null;
  currentBotStatus: string | null;
  totalBotFlags: number | null;
  suggestedStatus: string;
  reason: string | null;
  reviewStatus: string;
  appliedStatus: string | null;
  appliedAt: string | null;
  flaggedAt: string;
  emailSubject: string | null;
}

interface FlagsResponse {
  items: FlagItem[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  normal: { label: 'Normal', variant: 'secondary' },
  flagged: { label: 'Flagged', variant: 'default' },
  under_review: { label: 'Under Review', variant: 'destructive' },
  suspended: { label: 'Suspended', variant: 'destructive' }
};

const REVIEW_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  applied: { label: 'Applied', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'secondary' }
};

const APPLICABLE_STATUSES = [
  { value: 'flagged', label: 'Flagged' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'suspended', label: 'Suspended' }
];

function invalidateFlags() {
  queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0]?.toString().startsWith('/api/bot-security/flags') ?? false });
}

export default function BotSecurity() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [reviewDateOpen, setReviewDateOpen] = useState(false);
  const [selectedReviewDate, setSelectedReviewDate] = useState<Date | undefined>(undefined);
  const [applyStatusSelections, setApplyStatusSelections] = useState<Record<string, string>>({});

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (dateFilter !== 'all') params.set('date', dateFilter);
    params.set('page', page.toString());
    params.set('pageSize', pageSize.toString());
    return params.toString();
  };

  const { data, isLoading, refetch } = useQuery<FlagsResponse>({
    queryKey: [`/api/bot-security/flags?${buildQueryString()}`]
  });

  const reinstateMutation = useMutation({
    mutationFn: async (botId: string) => {
      return apiRequest('POST', `/api/bot-security/bots/${botId}/reinstate`);
    },
    onSuccess: (data: any) => {
      toast({ title: 'Bot Reinstated', description: data.message });
      invalidateFlags();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to reinstate bot', variant: 'destructive' });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (flagId: string) => {
      return apiRequest('POST', `/api/bot-security/flags/${flagId}/reject`);
    },
    onSuccess: () => {
      toast({ title: 'Flag Rejected', description: 'The flag has been dismissed' });
      invalidateFlags();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to reject flag', variant: 'destructive' });
    }
  });

  const applyMutation = useMutation({
    mutationFn: async ({ flagId, status }: { flagId: string; status: string }) => {
      return apiRequest('POST', `/api/bot-security/flags/${flagId}/apply`, { status });
    },
    onSuccess: (data: any) => {
      toast({ title: 'Status Applied', description: data.message });
      invalidateFlags();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to apply status', variant: 'destructive' });
    }
  });

  const triggerReviewMutation = useMutation({
    mutationFn: async (date?: string) => {
      return apiRequest('POST', '/api/bot-security/force-review', date ? { date } : {});
    },
    onSuccess: (data: any) => {
      toast({ title: 'Review Complete', description: data.message });
      invalidateFlags();
      setReviewDateOpen(false);
      setSelectedReviewDate(undefined);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to trigger review', variant: 'destructive' });
    }
  });

  const triggerReview = (date?: Date) => {
    const dateStr = date ? date.toISOString().split('T')[0] : undefined;
    triggerReviewMutation.mutate(dateStr);
  };

  const getApplyStatus = (flagId: string, suggestedStatus: string) => {
    return applyStatusSelections[flagId] || suggestedStatus;
  };

  const setApplyStatus = (flagId: string, status: string) => {
    setApplyStatusSelections(prev => ({ ...prev, [flagId]: status }));
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Bot Security</h1>
            <p className="text-muted-foreground">Review flagged emails and manage bot statuses</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex">
            <Button 
              size="sm" 
              onClick={() => triggerReview()}
              disabled={triggerReviewMutation.isPending}
              className="rounded-r-none"
            >
              {triggerReviewMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Trigger Review
            </Button>
            <Popover open={reviewDateOpen} onOpenChange={setReviewDateOpen}>
              <PopoverTrigger asChild>
                <Button 
                  size="sm" 
                  variant="default"
                  className="rounded-l-none border-l border-primary-foreground/20 px-2"
                  disabled={triggerReviewMutation.isPending}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-2 border-b">
                  <p className="text-sm font-medium">Select date to review</p>
                  <p className="text-xs text-muted-foreground">Default reviews last 24 hours</p>
                </div>
                <Calendar
                  mode="single"
                  selected={selectedReviewDate}
                  onSelect={(date) => {
                    setSelectedReviewDate(date);
                    if (date) triggerReview(date);
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle className="text-lg">Email Flags</CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last7">Last 7 Days</SelectItem>
                  <SelectItem value="last30">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.items?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              No flags found matching your filters
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bot</TableHead>
                      <TableHead>Email Subject</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Suggested</TableHead>
                      <TableHead>Current Status</TableHead>
                      <TableHead>Flags</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((flag) => {
                      const statusInfo = STATUS_BADGES[flag.currentBotStatus || 'normal'];
                      const suggestedInfo = STATUS_BADGES[flag.suggestedStatus];
                      const reviewInfo = REVIEW_BADGES[flag.reviewStatus || 'pending'];
                      const isPending = flag.reviewStatus === 'pending' || !flag.reviewStatus;
                      const canReinstate = flag.currentBotStatus && flag.currentBotStatus !== 'normal';
                      const selectedApplyStatus = getApplyStatus(flag.id, flag.suggestedStatus);
                      
                      return (
                        <TableRow key={flag.id} className={flag.reviewStatus === 'rejected' ? 'opacity-50' : ''}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{flag.botName || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">{flag.botAddress}</div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {flag.emailSubject || '(no subject)'}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <span className="text-sm text-muted-foreground line-clamp-2">
                              {flag.reason || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={suggestedInfo?.variant || 'outline'}>
                              {suggestedInfo?.label || flag.suggestedStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusInfo?.variant || 'outline'}>
                              {statusInfo?.label || flag.currentBotStatus || 'Normal'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{flag.totalBotFlags || 0}</span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(flag.flaggedAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={reviewInfo?.variant || 'outline'}>
                              {flag.reviewStatus === 'applied' && flag.appliedStatus
                                ? `Applied: ${STATUS_BADGES[flag.appliedStatus]?.label || flag.appliedStatus}`
                                : reviewInfo?.label || 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isPending ? (
                                <>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="text-muted-foreground hover:text-destructive"
                                        disabled={rejectMutation.isPending}
                                      >
                                        <X className="h-4 w-4 mr-1" />
                                        Reject
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Reject Flag?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will dismiss the flag for <strong>{flag.botName}</strong> without changing their status. The bot will keep its current status.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => rejectMutation.mutate(flag.id)}>
                                          Reject
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>

                                  <div className="flex items-center gap-1">
                                    <Select
                                      value={selectedApplyStatus}
                                      onValueChange={(v) => setApplyStatus(flag.id, v)}
                                    >
                                      <SelectTrigger className="w-[130px] h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {APPLICABLE_STATUSES.map(s => (
                                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button 
                                          size="sm"
                                          disabled={applyMutation.isPending}
                                        >
                                          <Check className="h-4 w-4 mr-1" />
                                          Apply
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Apply Status Change?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will change <strong>{flag.botName}</strong>'s status to <strong>{STATUS_BADGES[selectedApplyStatus]?.label || selectedApplyStatus}</strong>. The bot owner will be notified of this change.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => applyMutation.mutate({ flagId: flag.id, status: selectedApplyStatus })}>
                                            Apply
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {canReinstate && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          disabled={reinstateMutation.isPending}
                                        >
                                          <RotateCcw className="h-3 w-3 mr-1" />
                                          Reinstate
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Reinstate Bot?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will reset <strong>{flag.botName}</strong> to normal status and clear its flag count. The bot will be able to send emails again.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={() => reinstateMutation.mutate(flag.botId)}
                                          >
                                            Reinstate
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, data.total)} of {data.total} flags
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  <span className="text-sm px-2">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

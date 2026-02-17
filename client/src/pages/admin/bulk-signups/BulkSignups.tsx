import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, RefreshCw, ChevronLeft, ChevronRight, Check, X, Play, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface BulkSignupAlert {
  id: string;
  signature: string;
  status: 'pending' | 'approved' | 'ignored';
  namePrefix: string | null;
  senderPrefix: string | null;
  botIds: string[];
  ipList: string[];
  botCount: number;
  claimedCount: number;
  windowStart: string;
  windowEnd: string;
  resolvedAt: string | null;
  createdAt: string;
}

interface AlertsResponse {
  items: BulkSignupAlert[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'destructive' },
  approved: { label: 'Approved', variant: 'default' },
  ignored: { label: 'Ignored', variant: 'secondary' }
};

function invalidateAlerts() {
  queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0]?.toString().includes('/api/bot-security/bulk-signups') ?? false });
}

export default function BulkSignups() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    params.set('page', page.toString());
    params.set('pageSize', pageSize.toString());
    return params.toString();
  };

  const { data, isLoading, refetch } = useQuery<AlertsResponse>({
    queryKey: [`/api/bot-security/bulk-signups?${buildQueryString()}`]
  });

  const approveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest('POST', `/api/bot-security/bulk-signups/${alertId}/approve`);
    },
    onSuccess: (data: any) => {
      toast({ title: 'Alert Approved', description: data.message });
      invalidateAlerts();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to approve alert', variant: 'destructive' });
    }
  });

  const ignoreMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest('POST', `/api/bot-security/bulk-signups/${alertId}/ignore`);
    },
    onSuccess: () => {
      toast({ title: 'Alert Ignored', description: 'The alert has been dismissed' });
      invalidateAlerts();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to ignore alert', variant: 'destructive' });
    }
  });

  const forceScanMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/bot-security/bulk-signups/force-scan');
    },
    onSuccess: (data: any) => {
      toast({ title: 'Scan Complete', description: data.message });
      invalidateAlerts();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to run scan', variant: 'destructive' });
    }
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getWindowMinutes = (start: string, end: string) => {
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-destructive" />
          <div>
            <h1 className="text-2xl font-bold">Bulk Signup Alerts</h1>
            <p className="text-muted-foreground">Detect and manage coordinated bot registration patterns</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => forceScanMutation.mutate()}
            disabled={forceScanMutation.isPending}
          >
            {forceScanMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Scan
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle className="text-lg">Alerts</CardTitle>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="ignored">Ignored</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.items?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              No bulk signup alerts found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Name Prefix</TableHead>
                      <TableHead>Bots</TableHead>
                      <TableHead>IPs</TableHead>
                      <TableHead>Claimed</TableHead>
                      <TableHead>Window</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((alert) => {
                      const statusInfo = STATUS_BADGES[alert.status];
                      const isPending = alert.status === 'pending';

                      return (
                        <TableRow key={alert.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDate(alert.createdAt)}
                          </TableCell>
                          <TableCell>
                            <code className="text-sm bg-muted px-2 py-0.5 rounded">{alert.namePrefix || '—'}</code>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-bold">{alert.botCount}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono">{alert.ipList?.length || 0}</span>
                          </TableCell>
                          <TableCell>
                            <span className={`font-mono ${alert.claimedCount === 0 ? 'text-destructive font-bold' : ''}`}>
                              {alert.claimedCount}/{alert.botCount}
                            </span>
                            {alert.claimedCount === 0 && (
                              <Badge variant="destructive" className="ml-2 text-xs">Red Flag</Badge>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {getWindowMinutes(alert.windowStart, alert.windowEnd)}m
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusInfo?.variant || 'outline'}>
                              {statusInfo?.label || alert.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/admin/bulk-signups/${alert.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>

                              {isPending && (
                                <>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground"
                                        disabled={ignoreMutation.isPending}
                                      >
                                        <X className="h-4 w-4 mr-1" />
                                        Ignore
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Ignore Alert?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will dismiss the alert for <strong>{alert.botCount}</strong> bots with prefix "<strong>{alert.namePrefix}</strong>". No action will be taken.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => ignoreMutation.mutate(alert.id)}>
                                          Ignore
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={approveMutation.isPending}
                                      >
                                        <Check className="h-4 w-4 mr-1" />
                                        Approve
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Approve Removal?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will <strong>suspend {alert.botCount} bots</strong> with prefix "<strong>{alert.namePrefix}</strong>", remove their handles, and <strong>block {alert.ipList?.length || 0} IPs for 14 days</strong>. This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          onClick={() => approveMutation.mutate(alert.id)}
                                        >
                                          Approve Removal
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, data.total)} of {data.total} alerts
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
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

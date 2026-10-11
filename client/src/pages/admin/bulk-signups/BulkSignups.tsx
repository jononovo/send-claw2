import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, RefreshCw, ChevronLeft, ChevronRight, Check, X, Eye, Plus, Trash2, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { TriggerReviewButton } from '@/components/admin/TriggerReviewButton';

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

interface SecurityRule {
  id: number;
  type: string;
  value: string;
  label: string;
  message: string;
  enabled: boolean;
  createdAt: string;
}

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'destructive' },
  approved: { label: 'Approved', variant: 'default' },
  ignored: { label: 'Ignored', variant: 'secondary' }
};

const COUNTRY_OPTIONS = [
  { code: 'CN', name: 'China' },
  { code: 'RU', name: 'Russia' },
  { code: 'IR', name: 'Iran' },
  { code: 'KP', name: 'North Korea' },
  { code: 'SY', name: 'Syria' },
  { code: 'CU', name: 'Cuba' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'BY', name: 'Belarus' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'LY', name: 'Libya' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SO', name: 'Somalia' },
  { code: 'YE', name: 'Yemen' },
];

function invalidateAlerts() {
  queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0]?.toString().includes('/api/bot-security/bulk-signups') ?? false });
}

function invalidateRules() {
  queryClient.invalidateQueries({ queryKey: ['/api/bot-security/bulk-signups/rules'] });
}

export default function BulkSignups() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [ruleType, setRuleType] = useState('country_block');
  const [ruleCountry, setRuleCountry] = useState('');
  const [ruleMessage, setRuleMessage] = useState('At this time, SendClaw does not serve this region.');

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

  const { data: rulesData, isLoading: rulesLoading } = useQuery<{ items: SecurityRule[] }>({
    queryKey: ['/api/bot-security/bulk-signups/rules']
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
    mutationFn: async (date?: string) => {
      return apiRequest('POST', '/api/bot-security/bulk-signups/force-scan', date ? { date } : {});
    },
    onSuccess: (data: any) => {
      toast({ title: 'Scan Complete', description: data.message });
      invalidateAlerts();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to run scan', variant: 'destructive' });
    }
  });

  const createRuleMutation = useMutation({
    mutationFn: async (rule: { type: string; value: string; label: string; message: string }) => {
      return apiRequest('POST', '/api/bot-security/bulk-signups/rules', rule);
    },
    onSuccess: () => {
      toast({ title: 'Rule Created', description: 'Security rule has been added' });
      invalidateRules();
      setAddRuleOpen(false);
      setRuleCountry('');
      setRuleMessage('At this time, SendClaw does not serve this region.');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create rule', variant: 'destructive' });
    }
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      return apiRequest('PATCH', `/api/bot-security/bulk-signups/rules/${id}`, { enabled });
    },
    onSuccess: () => {
      invalidateRules();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update rule', variant: 'destructive' });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/bot-security/bulk-signups/rules/${id}`);
    },
    onSuccess: () => {
      toast({ title: 'Rule Deleted', description: 'Security rule has been removed' });
      invalidateRules();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete rule', variant: 'destructive' });
    }
  });

  const triggerScan = (date?: Date) => {
    const dateStr = date ? date.toISOString().split('T')[0] : undefined;
    forceScanMutation.mutate(dateStr);
  };

  const handleCreateRule = () => {
    if (!ruleCountry) {
      toast({ title: 'Error', description: 'Please select a country', variant: 'destructive' });
      return;
    }
    const country = COUNTRY_OPTIONS.find(c => c.code === ruleCountry);
    createRuleMutation.mutate({
      type: ruleType,
      value: ruleCountry,
      label: `Block ${country?.name || ruleCountry}`,
      message: ruleMessage
    });
  };

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

  const rules = rulesData?.items || [];

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
          <Dialog open={addRuleOpen} onOpenChange={setAddRuleOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Security Rule</DialogTitle>
                <DialogDescription>
                  Create a rule to automatically block bot registrations based on criteria.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Rule Type</Label>
                  <Select value={ruleType} onValueChange={setRuleType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="country_block">Country Block</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={ruleCountry} onValueChange={setRuleCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_OPTIONS.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Message shown to blocked users</Label>
                  <Input
                    value={ruleMessage}
                    onChange={(e) => setRuleMessage(e.target.value)}
                    placeholder="At this time, SendClaw does not serve this region."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddRuleOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateRule} disabled={createRuleMutation.isPending}>
                  {createRuleMutation.isPending ? 'Creating...' : 'Create Rule'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <TriggerReviewButton
            onTrigger={triggerScan}
            isPending={forceScanMutation.isPending}
            label="Run Scan"
            description="Default scans last 24 hours"
          />
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Security Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rulesLoading ? (
            <div className="flex justify-center py-6">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No security rules configured. Click "Add Rule" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.label}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {rule.type === 'country_block' ? 'Country' : rule.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-0.5 rounded text-sm">{rule.value}</code>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                        {rule.message}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) => toggleRuleMutation.mutate({ id: rule.id, enabled: checked })}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(rule.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the rule "{rule.label}". Bot registrations from this source will no longer be blocked by this rule.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteRuleMutation.mutate(rule.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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

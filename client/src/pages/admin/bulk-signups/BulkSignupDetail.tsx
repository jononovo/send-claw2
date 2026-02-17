import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, RefreshCw, ArrowLeft, Check, X, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useLocation, useParams } from 'wouter';

interface BotDetail {
  id: string;
  name: string;
  senderName: string;
  address: string | null;
  registrationIp: string | null;
  status: string | null;
  verified: boolean | null;
  flagCount: number | null;
  userId: number | null;
  claimedAt: string | null;
  createdAt: string | null;
}

interface IpBlock {
  id: number;
  ip: string;
  blockedUntil: string;
  reason: string | null;
  createdAt: string;
}

interface AlertDetail {
  alert: {
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
    approvalToken: string;
    resolvedAt: string | null;
    createdAt: string;
  };
  bots: BotDetail[];
  ipBlocks: IpBlock[];
}

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending Review', variant: 'destructive' },
  approved: { label: 'Approved', variant: 'default' },
  ignored: { label: 'Ignored', variant: 'secondary' }
};

function invalidateAlerts() {
  queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0]?.toString().includes('/api/bot-security/bulk-signups') ?? false });
}

export default function BulkSignupDetail() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();

  const { data, isLoading } = useQuery<AlertDetail>({
    queryKey: ['/api/bot-security/bulk-signups', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/bot-security/bulk-signups/${params.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch alert');
      return res.json();
    }
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/bot-security/bulk-signups/${params.id}/approve`);
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
    mutationFn: async () => {
      return apiRequest('POST', `/api/bot-security/bulk-signups/${params.id}/ignore`);
    },
    onSuccess: () => {
      toast({ title: 'Alert Ignored', description: 'The alert has been dismissed' });
      invalidateAlerts();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to ignore alert', variant: 'destructive' });
    }
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p className="text-muted-foreground">Alert not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/bulk-signups')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Alerts
        </Button>
      </div>
    );
  }

  const { alert, bots: botDetails, ipBlocks } = data;
  const isPending = alert.status === 'pending';
  const statusInfo = STATUS_BADGES[alert.status];
  const windowMinutes = Math.round(
    (new Date(alert.windowEnd).getTime() - new Date(alert.windowStart).getTime()) / 60000
  );

  const ipCounts = (alert.ipList as string[]).map(ip => ({
    ip,
    count: botDetails.filter(b => b.registrationIp === ip).length,
    blocked: ipBlocks.find(b => b.ip === ip)
  }));

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/bulk-signups')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-destructive" />
          <div>
            <h1 className="text-2xl font-bold">Alert Detail</h1>
            <p className="text-muted-foreground">
              <code className="bg-muted px-2 py-0.5 rounded">{alert.namePrefix}</code> — {alert.botCount} bots
            </p>
          </div>
        </div>
        <Badge variant={statusInfo?.variant || 'outline'} className="text-sm px-3 py-1">
          {statusInfo?.label || alert.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{alert.botCount}</div>
            <div className="text-xs text-muted-foreground">Bots Detected</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{alert.ipList?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Distinct IPs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className={`text-2xl font-bold ${alert.claimedCount === 0 ? 'text-destructive' : ''}`}>
              {alert.claimedCount}/{alert.botCount}
            </div>
            <div className="text-xs text-muted-foreground">Claimed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{windowMinutes}m</div>
            <div className="text-xs text-muted-foreground">Time Window</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-sm font-mono">{formatDate(alert.createdAt)}</div>
            <div className="text-xs text-muted-foreground">Alert Created</div>
          </CardContent>
        </Card>
      </div>

      {alert.claimedCount === 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div>
            <p className="font-semibold text-destructive">Major Red Flag</p>
            <p className="text-sm text-muted-foreground">None of the {alert.botCount} bots have been claimed by a human user.</p>
          </div>
        </div>
      )}

      {isPending && (
        <div className="flex gap-3 mb-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={approveMutation.isPending}>
                <Check className="h-4 w-4 mr-2" />
                Approve Removal
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve Removal?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will <strong>suspend {alert.botCount} bots</strong>, remove their handles, and <strong>block {alert.ipList?.length || 0} IPs for 14 days</strong>. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => approveMutation.mutate()}
                >
                  Approve Removal
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={ignoreMutation.isPending}>
                <X className="h-4 w-4 mr-2" />
                Ignore
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ignore Alert?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will dismiss the alert without taking any action on the {alert.botCount} bots.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => ignoreMutation.mutate()}>
                  Ignore
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Bot Registrations ({botDetails.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">#</TableHead>
                  <TableHead className="whitespace-nowrap">Created At</TableHead>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Sender Name</TableHead>
                  <TableHead className="whitespace-nowrap">Email Address</TableHead>
                  <TableHead className="whitespace-nowrap">IP Address</TableHead>
                  <TableHead className="whitespace-nowrap">Claimed At</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">Verified</TableHead>
                  <TableHead className="whitespace-nowrap">Flags</TableHead>
                  <TableHead className="whitespace-nowrap">User ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {botDetails.map((bot, i) => (
                  <TableRow key={bot.id}>
                    <TableCell className="font-mono text-sm">{i + 1}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDate(bot.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{bot.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{bot.senderName}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-sm">{bot.address || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-sm">{bot.registrationIp || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {bot.claimedAt ? formatDate(bot.claimedAt) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={bot.status === 'suspended' ? 'destructive' : 'secondary'}>
                        {(bot.status || 'normal').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-center">{bot.verified ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-center">{bot.flagCount || 0}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono">{bot.userId || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">IP Summary ({ipCounts.length} IPs)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Registrations</TableHead>
                  <TableHead>Block Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ipCounts.map(({ ip, count, blocked }) => (
                  <TableRow key={ip}>
                    <TableCell className="font-mono">{ip}</TableCell>
                    <TableCell className="font-mono">{count}</TableCell>
                    <TableCell>
                      {blocked ? (
                        <Badge variant="destructive">
                          Blocked until {formatDate(blocked.blockedUntil)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Not blocked</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {alert.resolvedAt && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          Resolved on {formatDate(alert.resolvedAt)}
        </div>
      )}
    </div>
  );
}

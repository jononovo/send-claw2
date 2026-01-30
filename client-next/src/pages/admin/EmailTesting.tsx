import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Mail, 
  Send, 
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Calendar,
  User,
  AlertTriangle,
  Play
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface OutreachJob {
  id: number;
  userId: number;
  status: string;
  nextRunAt: string;
  lastRunAt: string | null;
  lastError: string | null;
  retryCount: number;
  updatedAt: string;
  user: {
    username: string;
    email: string;
  };
  preferences: {
    enabled: boolean;
    scheduleDays: string[];
    scheduleTime: string;
    timezone: string;
  } | null;
}

interface OutreachBatch {
  id: number;
  userId: number;
  createdAt: string;
  itemCount: number;
  secureToken: string;
  user: {
    username: string;
    email: string;
  };
}

export default function AdminEmailTesting() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState({
    toEmail: '',
    subject: '',
    content: ''
  });

  // Fetch outreach jobs
  const { data: jobs, isLoading: jobsLoading } = useQuery<OutreachJob[]>({
    queryKey: ['/api/admin/outreach/jobs'],
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Fetch recent batches
  const { data: batches, isLoading: batchesLoading } = useQuery<OutreachBatch[]>({
    queryKey: ['/api/admin/outreach/batches'],
    enabled: !!user,
  });

  // Send test email mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: async (emailData: typeof testEmail) => {
      const response = await apiRequest('POST', '/api/admin/test/email', emailData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Test email sent',
        description: `Email sent to ${testEmail.toEmail}`,
      });
      setTestEmail({ toEmail: '', subject: '', content: '' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send test email',
        description: error.message || 'Email sending failed',
        variant: 'destructive',
      });
    },
  });

  // Trigger outreach mutation
  const triggerOutreachMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest('POST', `/api/admin/outreach/trigger/${userId}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Outreach triggered',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/outreach/batches'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to trigger outreach',
        description: error.message || 'Outreach generation failed',
        variant: 'destructive',
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-orange-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      scheduled: 'secondary',
      running: 'outline',
      completed: 'default',
      failed: 'destructive',
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setLocation('/admin')}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Email & Outreach Testing</h1>
              <p className="text-muted-foreground mt-1">
                Monitor and test email systems
              </p>
            </div>
          </div>
        </div>

        {/* Test Email Sending */}
        <Card>
          <CardHeader>
            <CardTitle>Send Test Email</CardTitle>
            <CardDescription>
              Test SendGrid email delivery functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="toEmail">To Email</Label>
                <Input
                  id="toEmail"
                  type="email"
                  placeholder="recipient@example.com"
                  value={testEmail.toEmail}
                  onChange={(e) => setTestEmail({ ...testEmail, toEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Test email subject"
                  value={testEmail.subject}
                  onChange={(e) => setTestEmail({ ...testEmail, subject: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Enter your test email content..."
                className="min-h-[100px]"
                value={testEmail.content}
                onChange={(e) => setTestEmail({ ...testEmail, content: e.target.value })}
              />
            </div>
            <Button
              onClick={() => sendTestEmailMutation.mutate(testEmail)}
              disabled={!testEmail.toEmail || !testEmail.subject || !testEmail.content || sendTestEmailMutation.isPending}
            >
              {sendTestEmailMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Outreach Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Outreach Jobs</CardTitle>
            <CardDescription>
              Monitor and manage daily outreach email jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs?.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{job.user.username}</span>
                          <span className="text-xs text-muted-foreground">{job.user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.status)}
                          {getStatusBadge(job.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {job.preferences?.enabled ? (
                          <div className="text-sm">
                            <div>{job.preferences.scheduleDays.join(', ')}</div>
                            <div className="text-xs text-muted-foreground">
                              {job.preferences.scheduleTime} {job.preferences.timezone}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(job.nextRunAt), 'MMM d, h:mm a')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {job.lastRunAt ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3" />
                            {format(new Date(job.lastRunAt), 'MMM d, h:mm a')}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {job.lastError && (
                          <div className="max-w-[200px]">
                            <span className="text-xs text-red-600 truncate">
                              {job.lastError}
                            </span>
                            {job.retryCount > 0 && (
                              <Badge variant="outline" className="text-xs ml-2">
                                Retries: {job.retryCount}
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => triggerOutreachMutation.mutate(job.userId)}
                          variant="outline"
                          size="sm"
                          disabled={triggerOutreachMutation.isPending}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Trigger
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!jobs || jobs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No outreach jobs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Batches */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Email Batches</CardTitle>
            <CardDescription>
              View recently generated outreach batches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Token</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches?.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-mono text-sm">
                        #{batch.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="text-sm">{batch.user.username}</span>
                            <span className="text-xs text-muted-foreground">{batch.user.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{batch.itemCount} emails</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(batch.createdAt), 'MMM d, h:mm a')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {batch.secureToken.substring(0, 8)}...
                        </code>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!batches || batches.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No batches found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
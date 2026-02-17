import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Building2, 
  UserCheck, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Shield,
  FileText,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';

interface AdminStats {
  users: {
    totalUsers: number;
    adminUsers: number;
    guestUsers: number;
  };
  data: {
    companies: number;
    contacts: number;
    contactsWithEmail: number;
  };
  outreach: {
    batchesThisWeek: number;
    emailsSentToday: number;
    emailsSentThisWeek: number;
    emailsSentThisMonth: number;
  };
  jobs: {
    total: number;
    scheduled: number;
    running: number;
    completed: number;
    failed: number;
  };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch admin stats
  const { data: stats, isLoading, error, refetch } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Check if user is admin - redirect if not
  useEffect(() => {
    if (error && (error as any).status === 403) {
      console.log('Access denied - not an admin');
      setLocation('/');
    }
  }, [error, setLocation]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-semibold">Access Denied</h3>
              <p className="text-muted-foreground">
                You don't have permission to access this page.
              </p>
              <Button onClick={() => setLocation('/')}>
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              System overview and management tools
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.users.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.users.adminUsers || 0} admins, {stats?.users.guestUsers || 0} guests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Companies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.data.companies || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total companies in database
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contacts</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.data.contacts || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.data.contactsWithEmail || 0} with emails
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Emails Today</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.outreach.emailsSentToday || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.outreach.emailsSentThisWeek || 0} this week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different admin sections */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users" onClick={() => setLocation('/admin/users')}>
              Users
            </TabsTrigger>
            <TabsTrigger value="email" onClick={() => setLocation('/admin/email')}>
              Email & Outreach
            </TabsTrigger>
            <TabsTrigger value="testing" onClick={() => setLocation('/admin/testing')}>
              API Testing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Outreach Jobs Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Outreach Jobs Status</CardTitle>
                  <CardDescription>
                    Current state of scheduled email jobs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Scheduled</span>
                      </div>
                      <Badge variant="secondary">{stats?.jobs.scheduled || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-orange-600 animate-spin" />
                        <span className="text-sm">Running</span>
                      </div>
                      <Badge variant="outline">{stats?.jobs.running || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Completed</span>
                      </div>
                      <Badge>{stats?.jobs.completed || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">Failed</span>
                      </div>
                      <Badge variant="destructive">{stats?.jobs.failed || 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Email Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Email Activity</CardTitle>
                  <CardDescription>
                    Outreach campaign performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Today</span>
                      <span className="text-2xl font-bold">
                        {stats?.outreach.emailsSentToday || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">This Week</span>
                      <span className="text-lg">
                        {stats?.outreach.emailsSentThisWeek || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">This Month</span>
                      <span className="text-lg">
                        {stats?.outreach.emailsSentThisMonth || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Batches (Week)</span>
                      <span className="text-lg">
                        {stats?.outreach.batchesThisWeek || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common administrative tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={() => setLocation('/admin/users')}
                    variant="outline"
                    size="sm"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button 
                    onClick={() => setLocation('/admin/email')}
                    variant="outline"
                    size="sm"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email Testing
                  </Button>
                  <Button 
                    onClick={() => setLocation('/admin/templates')}
                    variant="outline"
                    size="sm"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Email Templates
                  </Button>
                  <Button 
                    onClick={() => setLocation('/admin/testing')}
                    variant="outline"
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run Tests
                  </Button>
                  <Button 
                    onClick={() => setLocation('/testing')}
                    variant="outline"
                    size="sm"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    System Health
                  </Button>
                  <Button 
                    onClick={() => setLocation('/admin/attribution')}
                    variant="outline"
                    size="sm"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Ads Attribution
                  </Button>
                  <Button 
                    onClick={() => setLocation('/admin/bot-security')}
                    variant="outline"
                    size="sm"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Bot Security
                  </Button>
                  <Button 
                    onClick={() => setLocation('/admin/bulk-signups')}
                    variant="outline"
                    size="sm"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Bulk Signups
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
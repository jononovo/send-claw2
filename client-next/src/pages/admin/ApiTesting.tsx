import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Play,
  Clock,
  Database,
  Search,
  Shield,
  Globe
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  message: string;
  duration?: number;
  error?: string;
  subTests?: any[];
}

interface TestReport {
  message: string;
  status: string;
  timestamp: string;
  duration: number;
  overallStatus: string;
  summary: {
    passed: number;
    total: number;
    failed: number;
    warnings: number;
  };
  tests: TestResult[];
}

export default function AdminApiTesting() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [testReport, setTestReport] = useState<TestReport | null>(null);

  // Run all tests mutation
  const runAllTestsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/test/run-all');
      return response.json();
    },
    onSuccess: (data: TestReport) => {
      setTestReport(data);
      toast({
        title: 'Tests completed',
        description: data.message,
        variant: data.overallStatus === 'passed' ? 'default' : 
                 data.overallStatus === 'warning' ? 'default' : 'destructive',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to run tests',
        description: error.message || 'Test execution failed',
        variant: 'destructive',
      });
    },
  });

  // Run search extension test mutation
  const runExtensionTestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/test/extension');
      return response.json();
    },
    onSuccess: (data: TestReport) => {
      setTestReport(data);
      toast({
        title: 'Extension test completed',
        description: data.message,
        variant: data.overallStatus === 'passed' ? 'default' : 
                 data.overallStatus === 'warning' ? 'default' : 'destructive',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to run extension test',
        description: error.message || 'Extension test execution failed',
        variant: 'destructive',
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      passed: 'default',
      failed: 'destructive',
      warning: 'secondary',
      running: 'outline',
      pending: 'outline'
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'database connectivity':
        return <Database className="h-4 w-4 text-muted-foreground" />;
      case 'search functionality':
        return <Search className="h-4 w-4 text-muted-foreground" />;
      case 'api health':
        return <Globe className="h-4 w-4 text-muted-foreground" />;
      case 'authentication':
        return <Shield className="h-4 w-4 text-muted-foreground" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
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
              <h1 className="text-3xl font-bold tracking-tight">API Testing & Workflows</h1>
              <p className="text-muted-foreground mt-1">
                Test system APIs and monitor workflow health
              </p>
            </div>
          </div>
          <Button
            onClick={() => runAllTestsMutation.mutate()}
            disabled={runAllTestsMutation.isPending}
            size="sm"
          >
            {runAllTestsMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
        </div>

        {/* Test Summary */}
        {testReport && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Test Results Summary</span>
                {getStatusBadge(testReport.overallStatus)}
              </CardTitle>
              <CardDescription>
                Executed in {testReport.duration}ms on {new Date(testReport.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{testReport.summary.passed}</div>
                    <p className="text-xs text-muted-foreground">Passed</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold">{testReport.summary.failed}</div>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <div>
                    <div className="text-2xl font-bold">{testReport.summary.warnings}</div>
                    <p className="text-xs text-muted-foreground">Warnings</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{testReport.summary.total}</div>
                    <p className="text-xs text-muted-foreground">Total Tests</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Individual Test Results */}
        {testReport?.tests && testReport.tests.length > 0 && (
          <div className="space-y-4">
            {testReport.tests.map((test, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(test.name)}
                      <span>{test.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {test.duration && (
                        <Badge variant="outline" className="text-xs">
                          {test.duration}ms
                        </Badge>
                      )}
                      {getStatusBadge(test.status)}
                    </div>
                  </CardTitle>
                  <CardDescription>{test.message}</CardDescription>
                </CardHeader>
                {test.subTests && test.subTests.length > 0 && (
                  <CardContent>
                    <div className="space-y-2">
                      {test.subTests.map((subTest: any, subIndex: number) => (
                        <div
                          key={subIndex}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(subTest.status)}
                            <div>
                              <div className="font-medium text-sm">{subTest.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {subTest.message}
                              </div>
                              {subTest.error && (
                                <div className="text-xs text-red-600 mt-1">
                                  Error: {subTest.error}
                                </div>
                              )}
                            </div>
                          </div>
                          {subTest.data && (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {JSON.stringify(subTest.data)}
                            </code>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
                {test.error && (
                  <CardContent>
                    <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
                      <div className="text-sm text-red-800">
                        <strong>Error:</strong> {test.error}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* No Tests Run Yet */}
        {!testReport && !runAllTestsMutation.isPending && (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tests run yet</h3>
              <p className="text-muted-foreground mb-4">
                Click "Run All Tests" to execute the comprehensive system test suite
              </p>
              <Button onClick={() => runAllTestsMutation.mutate()}>
                <Play className="h-4 w-4 mr-2" />
                Run All Tests Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Search Extension Test Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              "+5 More" Extension Test
            </CardTitle>
            <CardDescription>
              Test the search extension feature that adds 5 additional companies to existing searches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">What this test does:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Creates an initial search job</li>
                  <li>• Tests the extension endpoint with exclude lists</li>
                  <li>• Verifies exactly 5 unique companies are added</li>
                  <li>• Checks for duplicates and data integrity</li>
                  <li>• Validates contact and email discovery for extensions</li>
                </ul>
              </div>
              <Button
                onClick={() => runExtensionTestMutation.mutate()}
                disabled={runExtensionTestMutation.isPending || runAllTestsMutation.isPending}
                className="w-full"
                variant="default"
              >
                {runExtensionTestMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running Extension Test...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run "+5 More" Extension Test
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Testing Tools</CardTitle>
            <CardDescription>
              Access other testing and monitoring features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setLocation('/testing')}
                variant="outline"
                size="sm"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                System Health Dashboard
              </Button>
              <Button
                onClick={() => setLocation('/admin/email')}
                variant="outline"
                size="sm"
              >
                <Globe className="h-4 w-4 mr-2" />
                Email Testing
              </Button>
              <Button
                onClick={() => window.open('/api/test/health', '_blank')}
                variant="outline"
                size="sm"
              >
                <Shield className="h-4 w-4 mr-2" />
                API Health Check
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
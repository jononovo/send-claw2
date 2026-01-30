import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Play, RefreshCw, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  message: string;
  duration?: number;
  error?: string;
  category?: string;
  data?: any;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
}

export default function Testing() {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testSummary, setTestSummary] = useState<TestSummary>({ total: 0, passed: 0, failed: 0, warnings: 0 });
  const [isRunning, setIsRunning] = useState(false);

  // Group tests by category for display
  const groupedTests = testResults.reduce((acc, test) => {
    const category = test.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(test);
    return acc;
  }, {} as Record<string, TestResult[]>);

  const runAllTests = async () => {
    setIsRunning(true);
    
    try {
      const response = await fetch('/api/test/run-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const testReport = await response.json();
      
      // Set individual test results and summary
      setTestResults(testReport.tests || []);
      setTestSummary(testReport.summary || { total: 0, passed: 0, failed: 0, warnings: 0 });
    } catch (error) {
      console.error('Error running tests:', error);
      setTestResults([]);
      setTestSummary({ total: 0, passed: 0, failed: 0, warnings: 0 });
    } finally {
      setIsRunning(false);
    }
  };

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
    const variants = {
      passed: "default",
      failed: "destructive", 
      warning: "secondary",
      running: "outline",
      pending: "outline"
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">System Testing Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive testing of all platform components and integrations
          </p>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Results Summary</span>
              <Button 
                onClick={runAllTests} 
                disabled={isRunning}
                size="sm"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run All Tests
                  </>
                )}
              </Button>
            </CardTitle>
            <CardDescription>
              Total: {testSummary.total} tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{testSummary.passed} Passed</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span>{testSummary.failed} Failed</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span>{testSummary.warnings} Warnings</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Categories */}
        <div className="space-y-4">
          {Object.entries(groupedTests).map(([category, tests]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
                <CardDescription>
                  {tests.length} individual tests in this category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tests.map((test, index) => (
                    <div key={`${category}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(test.status)}
                        <div>
                          <div className="font-medium">{test.name}</div>
                          <div className="text-sm text-muted-foreground">{test.message}</div>
                          {test.error && (
                            <div className="text-sm text-red-600 mt-1">Error: {test.error}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {test.duration && (
                          <span className="text-xs text-muted-foreground">
                            {test.duration}ms
                          </span>
                        )}
                        {getStatusBadge(test.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {testResults.length === 0 && !isRunning && (
          <Card>
            <CardContent className="py-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tests run yet</h3>
              <p className="text-muted-foreground mb-4">
                Click "Run All Tests" to start the comprehensive system test suite
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
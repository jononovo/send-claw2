import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
  MousePointer,
  Globe
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { format } from 'date-fns';

interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  rdt_cid?: string;
  gclid?: string;
  li_fat_id?: string;
  landingPage?: string;
  referrer?: string;
  timestamp?: string;
}

interface ConversionEvent {
  event: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface AttributionRecord {
  id: number;
  userId: number;
  source: string;
  attributionData: AttributionData;
  conversionEvents: ConversionEvent[];
  createdAt: string;
  userEmail: string | null;
}

interface AttributionStats {
  totalTracked: number;
  sourceBreakdown: Record<string, number>;
  recentAttributions: AttributionRecord[];
}

const SOURCE_COLORS: Record<string, string> = {
  reddit: 'bg-orange-500',
  google: 'bg-blue-500',
  linkedin: 'bg-sky-600',
  organic: 'bg-green-500',
  direct: 'bg-gray-500',
  unknown: 'bg-gray-400'
};

const SOURCE_ICONS: Record<string, string> = {
  reddit: '🔴',
  google: '🔵',
  linkedin: '🔷',
  organic: '🌱',
  direct: '🔗'
};

export default function AdminAttribution() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: stats, isLoading, error, refetch } = useQuery<AttributionStats>({
    queryKey: ['/api/admin/attribution'],
    enabled: !!user,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (error && (error as any).status === 403) {
      router.push('/');
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
              <Button onClick={() => router.push('/')}>
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sourceBreakdown = stats?.sourceBreakdown || {};
  const totalTracked = stats?.totalTracked || 0;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ads Attribution</h1>
            <p className="text-muted-foreground mt-1">
              Track user acquisition sources from Reddit, Google, and LinkedIn ads
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tracked</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTracked}</div>
              <p className="text-xs text-muted-foreground">users with attribution</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reddit</CardTitle>
              <span className="text-lg">🔴</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sourceBreakdown.reddit || 0}</div>
              <p className="text-xs text-muted-foreground">
                {totalTracked > 0 ? ((sourceBreakdown.reddit || 0) / totalTracked * 100).toFixed(1) : 0}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Google</CardTitle>
              <span className="text-lg">🔵</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sourceBreakdown.google || 0}</div>
              <p className="text-xs text-muted-foreground">
                {totalTracked > 0 ? ((sourceBreakdown.google || 0) / totalTracked * 100).toFixed(1) : 0}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organic</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sourceBreakdown.organic || 0}</div>
              <p className="text-xs text-muted-foreground">
                {totalTracked > 0 ? ((sourceBreakdown.organic || 0) / totalTracked * 100).toFixed(1) : 0}% of total
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Attributions</CardTitle>
            <CardDescription>
              Latest users tracked with their acquisition source and campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentAttributions && stats.recentAttributions.length > 0 ? (
              <div className="space-y-4">
                {stats.recentAttributions.map((attr) => (
                  <div 
                    key={attr.id} 
                    className="flex items-start justify-between p-4 border rounded-lg"
                    data-testid={`attribution-row-${attr.id}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={SOURCE_COLORS[attr.source] || SOURCE_COLORS.unknown}>
                          {SOURCE_ICONS[attr.source] || '❓'} {attr.source}
                        </Badge>
                        {attr.attributionData?.utm_campaign && (
                          <Badge variant="outline">
                            {attr.attributionData.utm_campaign}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {attr.userEmail || `User #${attr.userId}`}
                      </p>
                      {attr.attributionData?.utm_medium && (
                        <p className="text-xs text-muted-foreground">
                          Medium: {attr.attributionData.utm_medium}
                        </p>
                      )}
                      {attr.conversionEvents && attr.conversionEvents.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {attr.conversionEvents.map((event, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {event.event}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {attr.createdAt && format(new Date(attr.createdAt), 'MMM d, yyyy')}
                      <br />
                      {attr.createdAt && format(new Date(attr.createdAt), 'h:mm a')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MousePointer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No attribution data yet</p>
                <p className="text-sm">Users from your ad campaigns will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

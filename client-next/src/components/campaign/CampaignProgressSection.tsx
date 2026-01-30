import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Send, 
  Eye, 
  MousePointer, 
  Reply, 
  UserX,
  Clock,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CampaignStep {
  stepNumber: number;
  name: string;
  description?: string;
  condition?: string;
  sent: number;
  opens: number;
  openRate: number;
  clicks: number;
  clickRate: number;
  replies: number;
  replyRate: number;
  unsubscribes: number;
  unsubscribeRate: number;
  triggeredAt?: Date;
  status: 'pending' | 'in_progress' | 'completed';
}

interface CampaignProgressSectionProps {
  steps: CampaignStep[];
  totalRecipients: number;
  className?: string;
}

export function CampaignProgressSection({ 
  steps, 
  totalRecipients,
  className 
}: CampaignProgressSectionProps) {
  const MetricCell = ({ 
    value, 
    rate, 
    label, 
    icon: Icon,
    iconColor 
  }: { 
    value: number; 
    rate?: number; 
    label: string;
    icon: any;
    iconColor?: string;
  }) => (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
        <Icon className={cn("h-3 w-3", iconColor)} />
        <span>{label}</span>
      </div>
      <div className="text-lg font-semibold">{value}</div>
      {rate !== undefined && (
        <div className="text-xs text-muted-foreground">{rate}%</div>
      )}
    </div>
  );

  const getStepStatusIcon = (status: CampaignStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Campaign Progress</span>
          <Badge variant="outline" className="font-normal">
            {totalRecipients} recipients
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Header Row */}
          <div className="grid grid-cols-7 gap-2 pb-2 border-b">
            <div className="col-span-2"></div>
            <div className="text-center text-sm font-medium text-muted-foreground">Sent</div>
            <div className="text-center text-sm font-medium text-muted-foreground">Opens</div>
            <div className="text-center text-sm font-medium text-muted-foreground">Clicks</div>
            <div className="text-center text-sm font-medium text-muted-foreground">Replies</div>
            <div className="text-center text-sm font-medium text-muted-foreground">Unsubscribes</div>
          </div>

          {/* Step Rows */}
          {steps.map((step) => (
            <div key={step.stepNumber} className="space-y-2">
              <div className="grid grid-cols-7 gap-2 items-center">
                {/* Step Info */}
                <div className="col-span-2 space-y-1">
                  <div className="flex items-center gap-2">
                    {getStepStatusIcon(step.status)}
                    <div>
                      <div className="font-medium text-sm">
                        Step {step.stepNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {step.name}
                      </div>
                    </div>
                  </div>
                  {step.condition && (
                    <div className="text-xs text-muted-foreground ml-6">
                      {step.condition}
                    </div>
                  )}
                  {step.triggeredAt && (
                    <div className="text-xs text-muted-foreground ml-6">
                      {format(new Date(step.triggeredAt), 'MMM d, h:mm a')}
                    </div>
                  )}
                </div>

                {/* Metrics */}
                <MetricCell 
                  value={step.sent} 
                  label="" 
                  icon={Send}
                  iconColor="text-gray-500"
                />
                <MetricCell 
                  value={step.opens} 
                  rate={step.openRate} 
                  label="" 
                  icon={Eye}
                  iconColor="text-yellow-500"
                />
                <MetricCell 
                  value={step.clicks} 
                  rate={step.clickRate} 
                  label="" 
                  icon={MousePointer}
                  iconColor="text-green-500"
                />
                <MetricCell 
                  value={step.replies} 
                  rate={step.replyRate} 
                  label="" 
                  icon={Reply}
                  iconColor="text-blue-500"
                />
                <MetricCell 
                  value={step.unsubscribes} 
                  rate={step.unsubscribeRate} 
                  label="" 
                  icon={UserX}
                  iconColor="text-red-500"
                />
              </div>

              {/* Progress Bar */}
              {step.status === 'in_progress' && step.sent < totalRecipients && (
                <div className="ml-6 mr-2">
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(step.sent / totalRecipients) * 100} 
                      className="flex-1 h-1.5"
                    />
                    <span className="text-xs text-muted-foreground">
                      {((step.sent / totalRecipients) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Empty State */}
          {steps.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Campaign not started yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
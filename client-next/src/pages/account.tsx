import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, ExternalLink, Mail, Settings, Sun, Moon, Monitor } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { ProfileForm, type UserProfile, type SubscriptionStatus } from "@/features/user-account-settings";

export default function AccountPage() {
  const { user, authReady } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Fetch user profile data - wait for authReady to ensure session is established
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
    enabled: authReady && !!user,
  });

  // Fetch subscription status - wait for authReady to ensure session is established
  const { data: subscriptionStatus } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/user/subscription-status"],
    enabled: authReady && !!user,
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">
          Please log in to view your account settings.
        </div>
      </div>
    );
  }

  const generateEmailLink = (action: string, plan?: string) => {
    let subject, actionText, requestedAction;
    
    if (action === 'cancel') {
      subject = 'Request Subscription Cancellation';
      actionText = 'cancel';
      requestedAction = 'Cancellation';
    } else if (action === 'downgrade') {
      subject = `Request Downgrade to ${plan} Plan`;
      actionText = 'downgrade';
      requestedAction = `Downgrade to ${plan}`;
    } else {
      subject = `Request Upgrade to ${plan} Plan`;
      actionText = 'upgrade';
      requestedAction = `Upgrade to ${plan}`;
    }
    
    const body = encodeURIComponent(
      `Hello 5Ducks Support,

I would like to ${actionText} my subscription.

Account Email: ${profile?.email}
Current Plan: ${subscriptionStatus?.planDisplayName || 'Not subscribed'}
Requested Action: ${requestedAction}

Please process this request and let me know if you need any additional information.

Best regards,
${profile?.username}`
    );
    
    return `mailto:support@5ducks.ai?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Profile Section - Using ProfileForm from feature module */}
        <ProfileForm profile={profile} isLoading={isLoading} />

        {/* Settings Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </CardTitle>
            <CardDescription>
              Customize your app experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme Toggle */}
            <div className="space-y-3">
              <Label>Appearance</Label>
              <p className="text-xs text-muted-foreground">
                Choose how the app looks for you
              </p>
              <div className="flex gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setTheme("light")}
                  data-testid="button-theme-light"
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setTheme("dark")}
                  data-testid="button-theme-dark"
                >
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setTheme("system")}
                  data-testid="button-theme-system"
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing
            </CardTitle>
            <CardDescription>
              Payment methods and billing history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Plan */}
            <div className="space-y-2">
              <Label>Current Plan</Label>
              <div className="text-sm font-medium">
                {subscriptionStatus?.planDisplayName || 'Not subscribed'}
              </div>
            </div>

            {/* Subscription Actions */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Subscription Actions</Label>
                <p className="text-xs text-muted-foreground">
                  Click to send email requests to support
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => window.open(generateEmailLink('downgrade', 'The Duckling'))}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Downgrade to "The Duckling"
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => window.open(generateEmailLink('upgrade', 'Mama Duck'))}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Upgrade to "Mama Duck"
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>

                {subscriptionStatus?.isSubscribed && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={() => window.open(generateEmailLink('cancel'))}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Cancel Subscription
                    <ExternalLink className="ml-auto h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
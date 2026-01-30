import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Users, Plus, Check } from 'lucide-react';
import { type TargetCustomerProfile } from '@shared/schema';

interface CustomerProfileCardProps {
  customerProfiles: TargetCustomerProfile[] | undefined;
  selectedCustomerProfileId: number | null;
  isLoading: boolean;
  onProfileChange: (profileId: number) => void;
  onAddProfile: () => void;
}

export function CustomerProfileCard({
  customerProfiles,
  selectedCustomerProfileId,
  isLoading,
  onProfileChange,
  onAddProfile
}: CustomerProfileCardProps) {
  return (
    <Card className={cn(
      "relative transition-all duration-300 border-2",
      selectedCustomerProfileId 
        ? "border-primary bg-primary/5 shadow-lg" 
        : "hover:shadow-xl hover:border-primary/30"
    )}>
      {/* Progress indicator */}
      {selectedCustomerProfileId && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Ideal Customer
            </CardTitle>
            <CardDescription className="text-xs">
              Who are you connecting with?
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onAddProfile}
            data-testid="button-add-customer-profile"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="text-xs text-muted-foreground">Loading...</div>
        ) : customerProfiles && customerProfiles.length > 0 ? (
          <div className="space-y-2">
            {customerProfiles
              .sort((a, b) => a.id - b.id) // Stable sort by ID
              .slice(0, 3)
              .map((profile) => (
              <div
                key={profile.id}
                className={cn(
                  "p-2 rounded-lg border cursor-pointer transition-all",
                  selectedCustomerProfileId === profile.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => onProfileChange(profile.id)}
                data-testid={`customer-profile-${profile.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs truncate">{profile.label}</div>
                    {profile.industries && profile.industries.length > 0 && (
                      <div className="text-xs text-muted-foreground truncate">{profile.industries.join(', ')}</div>
                    )}
                    {profile.companySizes && profile.companySizes.length > 0 && profile.companySizes[0] !== 'All sizes' && (
                      <div className="text-xs text-muted-foreground truncate">{profile.companySizes.join(', ')}</div>
                    )}
                  </div>
                  {selectedCustomerProfileId === profile.id && (
                    <Check className="h-3 w-3 text-primary flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-16 w-16 rounded-full p-0"
              onClick={onAddProfile}
              data-testid="button-create-customer-profile"
            >
              <Plus className="h-8 w-8 text-muted-foreground/30" />
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Add ideal customer
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { User, Plus, Check } from 'lucide-react';

interface SenderProfile {
  id: number;
  userId: number;
  displayName: string;
  email: string;
  companyName?: string;
  companyWebsite?: string;
  title?: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface SenderProfileCardProps {
  senderProfiles: SenderProfile[] | undefined;
  selectedSenderProfileId: number | null;
  isLoading: boolean;
  onProfileChange: (profileId: number) => void;
  onAddProfile: () => void;
  user: any;
}

export function SenderProfileCard({
  senderProfiles,
  selectedSenderProfileId,
  isLoading,
  onProfileChange,
  onAddProfile,
  user
}: SenderProfileCardProps) {
  return (
    <Card className={cn(
      "relative transition-all duration-300 border-2",
      selectedSenderProfileId 
        ? "border-primary bg-primary/5 shadow-lg" 
        : "hover:shadow-xl hover:border-primary/30"
    )}>
      {/* Progress indicator */}
      {selectedSenderProfileId && (
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
              <User className="h-4 w-4" />
              My Identity
            </CardTitle>
            <CardDescription className="text-xs">
              Who are you sending from?
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onAddProfile}
            data-testid="button-add-sender-profile"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="text-xs text-muted-foreground">Loading...</div>
        ) : senderProfiles && senderProfiles.length > 0 ? (
          <div className="space-y-2">
            {senderProfiles
              .sort((a, b) => {
                // Stable sort: default first, then by ID
                if (a.isDefault && !b.isDefault) return -1;
                if (!a.isDefault && b.isDefault) return 1;
                return a.id - b.id;
              })
              .slice(0, 3)
              .map((profile) => (
              <div
                key={profile.id}
                className={cn(
                  "p-2 rounded-lg border cursor-pointer transition-all",
                  selectedSenderProfileId === profile.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => onProfileChange(profile.id)}
                data-testid={`sender-profile-${profile.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs truncate">{profile.displayName}</div>
                    <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
                    {profile.title && (
                      <div className="text-xs text-muted-foreground truncate">{profile.title}</div>
                    )}
                  </div>
                  {selectedSenderProfileId === profile.id && (
                    <Check className="h-3 w-3 text-primary flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="p-2 bg-secondary rounded-lg mb-2">
              <div className="font-medium text-xs truncate">{user?.username || user?.email}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
            <p className="text-xs text-muted-foreground">
              Default profile created
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
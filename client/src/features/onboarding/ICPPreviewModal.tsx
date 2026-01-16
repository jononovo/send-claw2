import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Target, Building2, Users, Briefcase, TrendingUp, Edit, Sparkles, CheckCircle } from 'lucide-react';

interface ICPData {
  title?: string;
  industry?: string;
  companySize?: string;
  targetRoles?: string[];
  painPoints?: string[];
  valueProposition?: string;
  searchPrompt?: string;
  exampleCompany?: string;
  additionalContext?: string;
}

interface ICPPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (updatedICP: ICPData) => void;
  onEdit: () => void;
  icpData: ICPData | null;
  searchResults: any[];
}

export function ICPPreviewModal({
  open,
  onClose,
  onConfirm,
  onEdit,
  icpData,
  searchResults
}: ICPPreviewModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedICP, setEditedICP] = useState<ICPData>(icpData || {});

  const handleConfirm = () => {
    onConfirm(isEditing ? editedICP : (icpData || {}));
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setEditedICP(icpData || {});
    }
  };

  if (!icpData) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Your Ideal Customer Profile
          </DialogTitle>
          <DialogDescription className="text-base">
            Based on your product and search results, we've created this customer profile. This will help us find and reach the right prospects for you.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            {/* Success Message */}
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 dark:text-green-100">AI-Generated Profile</p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    We analyzed {searchResults.length} companies from your search to create this profile
                  </p>
                </div>
              </div>
            </div>

            {/* Industry & Company Size */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <Label>Industry Focus</Label>
                </div>
                {isEditing ? (
                  <Input
                    value={editedICP.industry || ''}
                    onChange={(e) => setEditedICP({ ...editedICP, industry: e.target.value })}
                    placeholder="e.g., Technology, Healthcare"
                  />
                ) : (
                  <p className="text-sm font-medium">{icpData.industry || 'Not specified'}</p>
                )}
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Label>Company Size</Label>
                </div>
                {isEditing ? (
                  <Input
                    value={editedICP.companySize || ''}
                    onChange={(e) => setEditedICP({ ...editedICP, companySize: e.target.value })}
                    placeholder="e.g., 50-200 employees"
                  />
                ) : (
                  <p className="text-sm font-medium">{icpData.companySize || 'Not specified'}</p>
                )}
              </Card>
            </div>

            {/* Target Roles */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <Label>Decision Makers</Label>
              </div>
              {isEditing ? (
                <Textarea
                  value={editedICP.targetRoles?.join(', ') || ''}
                  onChange={(e) => setEditedICP({ 
                    ...editedICP, 
                    targetRoles: e.target.value.split(',').map(r => r.trim()).filter(Boolean)
                  })}
                  placeholder="e.g., CEO, VP Sales, Marketing Director"
                  className="min-h-[60px]"
                />
              ) : (
                <div className="flex flex-wrap gap-1">
                  {icpData.targetRoles?.map((role, index) => (
                    <Badge key={index} variant="secondary">{role}</Badge>
                  )) || <span className="text-sm text-muted-foreground">Not specified</span>}
                </div>
              )}
            </Card>

            {/* Pain Points */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <Label>Key Pain Points</Label>
              </div>
              {isEditing ? (
                <Textarea
                  value={editedICP.painPoints?.join('\n') || ''}
                  onChange={(e) => setEditedICP({ 
                    ...editedICP, 
                    painPoints: e.target.value.split('\n').filter(Boolean)
                  })}
                  placeholder="Enter each pain point on a new line"
                  className="min-h-[80px]"
                />
              ) : (
                <ul className="space-y-1">
                  {icpData.painPoints?.map((point, index) => (
                    <li key={index} className="text-sm flex items-start">
                      <span className="mr-2">•</span>
                      <span>{point}</span>
                    </li>
                  )) || <span className="text-sm text-muted-foreground">Not specified</span>}
                </ul>
              )}
            </Card>

            {/* Value Proposition */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <Label>Value Proposition</Label>
              </div>
              {isEditing ? (
                <Textarea
                  value={editedICP.valueProposition || ''}
                  onChange={(e) => setEditedICP({ ...editedICP, valueProposition: e.target.value })}
                  placeholder="How your product solves their problems"
                  className="min-h-[80px]"
                />
              ) : (
                <p className="text-sm">{icpData.valueProposition || 'Not specified'}</p>
              )}
            </Card>

            {/* Search Prompt */}
            <Card className="p-4">
              <Label className="mb-2 block">Optimized Search Query</Label>
              {isEditing ? (
                <Textarea
                  value={editedICP.searchPrompt || ''}
                  onChange={(e) => setEditedICP({ ...editedICP, searchPrompt: e.target.value })}
                  placeholder="Search query to find similar companies"
                  className="min-h-[60px]"
                />
              ) : (
                <p className="text-sm font-mono bg-muted p-2 rounded">
                  {icpData.searchPrompt || searchResults[0]?.searchQuery || 'Not specified'}
                </p>
              )}
            </Card>
          </div>
        </ScrollArea>

        <div className="flex justify-between">
          <Button variant="outline" onClick={toggleEdit}>
            {isEditing ? (
              <>Cancel Edit</>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </>
            )}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Go Back
            </Button>
            <Button onClick={handleConfirm}>
              {isEditing ? 'Save Changes' : 'Confirm & Continue'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
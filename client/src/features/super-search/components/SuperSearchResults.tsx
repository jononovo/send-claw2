import { useState, useEffect } from 'react';
import { Loader2, Sparkles, AlertCircle, Save, Check, Plus } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { SuperSearchTable } from './SuperSearchTable';
import { Button } from '@/components/ui/button';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { SuperSearchState, SearchPlan } from '../types';

interface SuperSearchResultsProps {
  state: SuperSearchState;
  query?: string;
  onSaved?: (listId: number) => void;
  alreadySaved?: boolean;
  onExpandResults?: (additionalCount: number) => void;
}

function formatFieldLabel(field: string): string {
  const labelMap: Record<string, string> = {
    name: 'Name',
    website: 'Website',
    city: 'City',
    state: 'State',
    country: 'Country',
    description: 'Description',
    size: 'Size',
    services: 'Services',
    role: 'Role',
    company: 'Company',
    companyWebsite: 'Website',
    linkedinUrl: 'LinkedIn',
    department: 'Department',
  };
  return labelMap[field] || field.charAt(0).toUpperCase() + field.slice(1);
}

function buildColumnsFromPlan(plan: SearchPlan): string[] {
  const priorityFields = ['name', 'role', 'company'];
  const columns: string[] = [];
  
  // 1. Add priority fields first (Name, Role, Company)
  for (const field of priorityFields) {
    if (plan.standardFields.includes(field)) {
      columns.push(formatFieldLabel(field));
    }
  }
  
  // 2. Add custom field labels
  for (const customField of plan.customFields) {
    columns.push(customField.label);
  }
  
  // 3. Add remaining standard fields
  for (const field of plan.standardFields) {
    if (!priorityFields.includes(field)) {
      columns.push(formatFieldLabel(field));
    }
  }
  
  return columns;
}

export function SuperSearchResults({ state, query, onSaved, alreadySaved = false, onExpandResults }: SuperSearchResultsProps) {
  const { status, plan, results, progressMessages, error, completionStats, isExpanding } = state;
  const [isSaved, setIsSaved] = useState(alreadySaved);

  // Sync alreadySaved prop to local state when it changes
  useEffect(() => {
    setIsSaved(alreadySaved);
  }, [alreadySaved]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!query || !plan) throw new Error('Missing query or plan');
      const response = await apiRequest('POST', '/api/super-search/save', {
        query,
        plan,
        results
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsSaved(true);
      queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
      onSaved?.(data.listId);
    }
  });

  if (status === 'idle') {
    return null;
  }

  if (status === 'connecting') {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-accent mr-2" />
        <span className="text-muted-foreground">Connecting to Super Search...</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center py-12 text-destructive">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span>{error || 'An error occurred'}</span>
      </div>
    );
  }

  // Build columns from plan's standardFields + customFields
  const columns = plan ? buildColumnsFromPlan(plan) : ['Name', 'Company', 'Role', 'Location', 'LinkedIn'];

  return (
    <div className="space-y-4">
      {plan && (
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-accent mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Search Strategy</h3>
              <p className="text-sm text-muted-foreground">{plan.searchStrategy}</p>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground/80">
                <span>Mode: {plan.queryType} list</span>
                <span>Target: {plan.targetCount} results</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {progressMessages.length > 0 && status === 'streaming' && (
        <div className="text-sm text-muted-foreground animate-pulse">
          {progressMessages[progressMessages.length - 1]}
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <SuperSearchTable columns={columns} results={results} plan={plan} />
        </div>
      )}

      {status === 'streaming' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Streaming results... ({results.length} found)</span>
        </div>
      )}

      {isExpanding && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Adding more results... ({results.length} total)</span>
        </div>
      )}

      {status === 'complete' && completionStats && (
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
          <div className="text-sm text-muted-foreground">
            Search complete: {results.length} results found.
          </div>
          <div className="flex items-center gap-2">
            {onExpandResults && !isExpanding && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExpandResults(5)}
                disabled={isExpanding}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add 5 More
              </Button>
            )}
            {query && !isSaved && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Results
                  </>
                )}
              </Button>
            )}
            {isSaved && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="h-4 w-4" />
                Saved!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

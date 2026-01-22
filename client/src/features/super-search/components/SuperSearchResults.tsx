import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { SuperSearchTable } from './SuperSearchTable';
import type { SuperSearchState, SearchPlan } from '../types';

interface SuperSearchResultsProps {
  state: SuperSearchState;
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
  const columns: string[] = [];
  
  // Add standard field labels
  for (const field of plan.standardFields) {
    columns.push(formatFieldLabel(field));
  }
  
  // Add custom field labels
  for (const customField of plan.customFields) {
    columns.push(customField.label);
  }
  
  return columns;
}

export function SuperSearchResults({ state }: SuperSearchResultsProps) {
  const { status, plan, results, progressMessages, error, completionStats } = state;

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

      {status === 'complete' && completionStats && (
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
          Search complete: {completionStats.totalResults} results found, 
          {completionStats.companiesSaved} companies and {completionStats.contactsSaved} contacts saved.
        </div>
      )}
    </div>
  );
}

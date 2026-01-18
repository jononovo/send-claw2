import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCircle, ChevronDown, ChevronUp } from "lucide-react";
import { ContactRow } from "@/components/contact-row";
import type { TopProspectsCardProps } from "./types";

const INITIAL_VISIBLE_COUNT = 5;

export function TopProspectsCard({
  prospects,
  pendingComprehensiveSearchIds,
  isVisible,
  onContactView,
  onContactFeedback,
  handleComprehensiveEmailSearch,
}: TopProspectsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!isVisible || prospects.length === 0) return null;
  
  const visibleProspects = isExpanded ? prospects : prospects.slice(0, INITIAL_VISIBLE_COUNT);
  const remainingCount = prospects.length - INITIAL_VISIBLE_COUNT;
  const hasMoreProspects = remainingCount > 0;

  return (
    <Card className="w-full rounded-none md:rounded-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="w-5 h-5" />
            Top Prospects
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Highest probability contacts across all companies
        </p>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <div className="space-y-1.5">
          {visibleProspects.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              showCheckbox={false}
              showCompanyName={true}
              showFeedback={true}
              handleContactView={onContactView}
              handleComprehensiveEmailSearch={handleComprehensiveEmailSearch}
              onContactFeedback={onContactFeedback}
              pendingComprehensiveSearchIds={pendingComprehensiveSearchIds}
            />
          ))}
        </div>
        
        {hasMoreProspects && (
          <div className="pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-accent-hover transition-all py-2 rounded-md"
              data-testid="button-toggle-prospects"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show fewer prospects
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  +{remainingCount} more prospects available
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

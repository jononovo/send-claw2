import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface ExtendSearchButtonProps {
  query: string;
  currentResults: Array<{ name: string; [key: string]: any }>;
  onResultsExtended: (query: string, extendedResults: any[]) => void;
  onLoginRequired: () => void;
  isAuthenticated: boolean;
  className?: string;
}

export function ExtendSearchButton({
  query,
  currentResults,
  onResultsExtended,
  onLoginRequired,
  isAuthenticated,
  className = ""
}: ExtendSearchButtonProps) {
  const [isExtending, setIsExtending] = useState(false);
  const { toast } = useToast();
  
  const handleExtendSearch = async () => {
    if (!isAuthenticated) {
      onLoginRequired();
      return;
    }
    
    if (!query || !currentResults) {
      toast({
        title: "No search to extend",
        description: "Please run a search first before extending",
        variant: "destructive"
      });
      return;
    }
    
    setIsExtending(true);
    
    try {
      // Get the contact search configuration from localStorage
      const savedConfig = localStorage.getItem('contactSearchConfig');
      let contactSearchConfig = null;
      if (savedConfig) {
        try {
          contactSearchConfig = JSON.parse(savedConfig);
        } catch (error) {
          console.error('Error parsing contact search config:', error);
        }
      }
      
      // Call the extend search API
      const res = await apiRequest("POST", "/api/search/extend", {
        query: query,
        excludeCompanyIds: currentResults.map(c => ({ name: c.name })) || [],
        contactSearchConfig: contactSearchConfig || {
          enableCoreLeadership: true,
          enableDepartmentHeads: true,
          enableMiddleManagement: true
        }
      });
      
      const data = await res.json();
      
      if (data.jobId && data.companies && data.companies.length > 0) {
        console.log(`[ExtendSearch] Extending search with ${data.companies.length} new companies`);
        toast({
          title: "Finding more companies",
          description: `Adding ${data.companies.length} additional companies with contacts and emails.`,
        });
        
        // Poll for job completion
        const pollInterval = setInterval(async () => {
          try {
            const jobRes = await apiRequest("GET", `/api/search-jobs/${data.jobId}`);
            const jobData = await jobRes.json();
            
            if (jobData.status === 'completed' && jobData.results) {
              clearInterval(pollInterval);
              setIsExtending(false);
              
              // Merge the new results with existing ones
              const newCompanies = jobData.results.companies || [];
              const mergedResults = [...(currentResults || []), ...newCompanies];
              
              // Notify parent component
              onResultsExtended(query, mergedResults);
              
              toast({
                title: "Search extended",
                description: `Added ${newCompanies.length} new companies to your results.`,
              });
            } else if (jobData.status === 'failed') {
              clearInterval(pollInterval);
              setIsExtending(false);
              toast({
                title: "Extension failed",
                description: "Could not fetch additional companies. Please try again.",
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error("[ExtendSearch] Error polling job:", error);
          }
        }, 2000); // Poll every 2 seconds
        
        // Stop polling after 30 seconds
        setTimeout(() => {
          clearInterval(pollInterval);
          setIsExtending(false);
        }, 30000);
      } else if (data.companies && data.companies.length === 0) {
        setIsExtending(false);
        toast({
          title: "No additional companies found",
          description: "We couldn't find more companies matching your search criteria.",
        });
      } else {
        setIsExtending(false);
        throw new Error(data.error || "Failed to extend search");
      }
    } catch (error) {
      setIsExtending(false);
      console.error("[ExtendSearch] Error extending search:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to extend search",
        variant: "destructive"
      });
    }
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "px-2 h-6 text-[11px] font-medium transition-all",
              "hover:bg-muted/50 text-gray-400/60 hover:text-gray-500",
              className
            )}
            onClick={handleExtendSearch}
            disabled={isExtending}
            data-testid="extend-search-button"
          >
            <Plus className={cn("h-3 w-3 mr-0.5", isExtending && "animate-spin")} />
            {isExtending ? "Extending..." : "5 More"}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">Expand the search to include another five companies with the same prompt</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Target, X, ThumbsUp, ThumbsDown, HelpCircle, Building2, Sparkles, Edit } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SearchResult {
  id: number;
  name: string;
  description: string | null;
  website: string | null;
  size: number | null;
  industry?: string;
}

interface SearchConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onRefine: () => void;
  searchQuery: string;
  searchResults: SearchResult[];
}

type CompanyRating = 'perfect' | 'unsure' | 'not-fit' | null;
type ModalState = 'initial' | 'ranking' | 'poor-results' | 'loading-suggestions';

interface PromptSuggestions {
  suggestions: string[];
  reasoning: string;
}

export function SearchConfirmationModal({
  open,
  onClose,
  onConfirm,
  onRefine,
  searchQuery,
  searchResults
}: SearchConfirmationModalProps) {
  const [modalState, setModalState] = useState<ModalState>('initial');
  const [companyRatings, setCompanyRatings] = useState<Record<number, CompanyRating>>({});
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState(0);
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const { toast } = useToast();

  // Mutation to get improved prompts from AI
  const generatePromptsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/onboarding/improve-search-prompt', {
        originalPrompt: searchQuery,
        searchResults: searchResults.map(r => ({
          name: r.name,
          description: r.description
        })),
        ratings: Object.entries(companyRatings).map(([id, rating]) => ({
          companyId: parseInt(id),
          companyName: searchResults.find(r => r.id === parseInt(id))?.name,
          rating
        }))
      });
      return await response.json() as PromptSuggestions;
    },
    onSuccess: (data) => {
      setPromptSuggestions(data.suggestions || []);
      setModalState('poor-results');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to generate improved search suggestions. Please try again.',
        variant: 'destructive'
      });
      // Fall back to letting them proceed anyway
      onConfirm();
    }
  });

  const handleRateCompany = (companyId: number, rating: CompanyRating) => {
    const newRatings = { ...companyRatings, [companyId]: rating };
    setCompanyRatings(newRatings);
    
    // Move to next unrated company
    const nextUnratedIndex = searchResults.findIndex((company, idx) => 
      idx > currentHighlightIndex && !newRatings[company.id]
    );
    
    if (nextUnratedIndex !== -1) {
      setCurrentHighlightIndex(nextUnratedIndex);
    } else {
      // Check if all companies are rated
      const allRated = searchResults.every(company => newRatings[company.id]);
      
      if (allRated) {
        // Check if results are poor
        const perfectFitCount = Object.values(newRatings).filter(r => r === 'perfect').length;
        const notFitCount = Object.values(newRatings).filter(r => r === 'not-fit').length;
        
        if (perfectFitCount < 3 || notFitCount > 3) {
          // Poor results, suggest better prompts
          setModalState('loading-suggestions');
          generatePromptsMutation.mutate();
        } else {
          // Good results, proceed normally
          setTimeout(() => onConfirm(), 500);
        }
      }
    }
  };

  const handleStartRanking = () => {
    setModalState('ranking');
    setCurrentHighlightIndex(0);
  };

  const handleNewSearch = () => {
    onClose();
  };

  const handlePromptSelection = (prompt: string) => {
    setSelectedPrompt(prompt);
    // TODO: Trigger a new search with the selected prompt
    // For now, we'll just close and let the user search manually
    onClose();
    // In a real implementation, you'd trigger a new search here
    window.location.href = `/?search=${encodeURIComponent(prompt)}`;
  };

  const handleCustomPromptSubmit = () => {
    if (customPrompt.trim()) {
      handlePromptSelection(customPrompt);
    }
  };

  const handleKeepExisting = () => {
    onConfirm();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 z-[100] animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Fullscreen modal content */}
      <div className="fixed inset-0 z-[101] bg-background animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-50 h-12 w-12 rounded-full bg-background/80 backdrop-blur hover:bg-background"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
          <span className="sr-only">Close</span>
        </Button>
        
        {/* Scrollable content */}
        <div className="h-full w-full overflow-auto">
          <div className="container max-w-5xl mx-auto p-6 md:p-8 pt-16 pb-10">
            {/* Show different content based on modal state */}
            {modalState === 'loading-suggestions' ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Analyzing your preferences to suggest better search terms...</p>
              </div>
            ) : modalState === 'poor-results' ? (
              <>
                {/* Improved prompts UI */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="h-8 w-8 text-primary shrink-0" />
                    <h2 className="text-2xl md:text-3xl font-bold">
                      Let's refine your search
                    </h2>
                  </div>
                  
                  <p className="text-muted-foreground mb-6">
                    Based on your feedback, here are some improved search prompts that might help find your ideal customers:
                  </p>

                  <div className="space-y-4">
                    {/* AI Suggested Prompts */}
                    {promptSuggestions.map((suggestion, index) => (
                      <Card 
                        key={index} 
                        className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-primary"
                        onClick={() => handlePromptSelection(suggestion)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold shrink-0">
                            {index + 1}
                          </div>
                          <p className="flex-1">{suggestion}</p>
                        </div>
                      </Card>
                    ))}

                    {/* Custom prompt input */}
                    <Card className="p-4">
                      <div className="flex items-start gap-3">
                        <Edit className="h-5 w-5 text-muted-foreground mt-2 shrink-0" />
                        <div className="flex-1 space-y-3">
                          <p className="font-medium">Write your own search</p>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter your custom search..."
                              value={customPrompt}
                              onChange={(e) => setCustomPrompt(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleCustomPromptSubmit()}
                            />
                            <Button 
                              onClick={handleCustomPromptSubmit}
                              disabled={!customPrompt.trim()}
                            >
                              Search
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Keep existing prompt */}
                    <Card 
                      className="p-4 cursor-pointer hover:shadow-md transition-all border-dashed"
                      onClick={handleKeepExisting}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground">
                          ✓
                        </div>
                        <div>
                          <p className="font-medium">Keep the existing prompt</p>
                          <p className="text-sm text-muted-foreground">It's a good example, I'll refine it myself later</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Original content for initial and ranking states */}
                {/* Compact Header */}
                <div className="mb-4 flex items-center gap-3">
                  <Target className="h-8 w-8 text-primary shrink-0" />
                  <h2 className="text-2xl md:text-3xl font-bold">
                    Let's confirm your target market
                  </h2>
                </div>
                
                <p className="text-muted-foreground mb-6">
                  We found {searchResults.length} companies matching your search. Before we set up your outreach campaign, let's make sure these are the right prospects.
                </p>

                {/* Action section - moved to top */}
                {modalState === 'initial' ? (
                  <div className="mb-6">
                    <p className="font-medium text-lg mb-4">Are these the type of companies you want to reach?</p>
                    <div className="flex flex-col md:flex-row gap-3">
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={handleNewSearch}
                        className="flex-1"
                      >
                        I want to do a NEW search
                      </Button>
                      <Button
                        size="lg"
                        onClick={handleStartRanking}
                        className="flex-1"
                      >
                        Tell us which results are the best
                      </Button>
                    </div>
                  </div>
                ) : modalState === 'ranking' && (
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Rate each company to help us find more like your favorites</p>
                      <p className="text-sm text-muted-foreground">
                        {Object.keys(companyRatings).length} of {searchResults.length} companies rated
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => setModalState('initial')}
                    >
                      Cancel ranking
                    </Button>
                  </div>
                )}

                {/* Companies list with rating buttons */}
                <div className="mb-6">
                  <ScrollArea className="h-[calc(100vh-450px)] md:h-[calc(100vh-400px)] border rounded-lg">
                    <div className="p-4 space-y-3">
                      {searchResults.map((company, index) => (
                        <Card 
                          key={company.id} 
                          className={cn(
                            "p-4 transition-all duration-200",
                            modalState === 'ranking' && index === currentHighlightIndex && !companyRatings[company.id] && 
                            "ring-2 ring-primary shadow-lg scale-[1.02] bg-primary/5"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <Building2 className="h-7 w-7 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium mb-1">{company.name}</h4>
                              {company.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {company.description}
                                </p>
                              )}
                            </div>
                            {modalState === 'ranking' && (
                              <div className="flex gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  variant={companyRatings[company.id] === 'perfect' ? 'default' : 'outline'}
                                  className={cn(
                                    "flex flex-col items-center gap-1 h-auto py-2 px-3",
                                    companyRatings[company.id] === 'perfect' && "bg-green-500 hover:bg-green-600"
                                  )}
                                  onClick={() => handleRateCompany(company.id, 'perfect')}
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                  <span className="text-xs">Perfect fit</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant={companyRatings[company.id] === 'unsure' ? 'secondary' : 'outline'}
                                  className="flex flex-col items-center gap-1 h-auto py-2 px-3"
                                  onClick={() => handleRateCompany(company.id, 'unsure')}
                                >
                                  <HelpCircle className="h-4 w-4" />
                                  <span className="text-xs">Not sure</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant={companyRatings[company.id] === 'not-fit' ? 'destructive' : 'outline'}
                                  className="flex flex-col items-center gap-1 h-auto py-2 px-3"
                                  onClick={() => handleRateCompany(company.id, 'not-fit')}
                                >
                                  <ThumbsDown className="h-4 w-4" />
                                  <span className="text-xs">Not a fit</span>
                                </Button>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                
                {/* Search query display */}
                <div className="mt-6">
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="font-medium text-sm">Your search:</span>
                    <span className="text-muted-foreground text-sm ml-2">"{searchQuery}"</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
import { useState } from 'react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Box, Palette, Gift, Check, Info, Wand2, Loader2, IdCard, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_OPTIONS } from "@/lib/tone-options";
import { OFFER_OPTIONS } from "@/lib/offer-options";
import { getGenerationModeConfig } from "@/components/email-generation-tabs";
import type { EmailGenerationControlsProps } from './types';
import { PromptContextBuilderDropdown } from './PromptContextBuilderDropdown';

export function EmailGenerationControls({
  selectedProduct,
  selectedProductData,
  onProductSelect,
  onProductClear,
  selectedTone,
  onToneSelect,
  selectedOfferStrategy,
  onOfferStrategySelect,
  selectedSenderProfile,
  onSenderProfileSelect,
  senderProfiles,
  products,
  emailPrompt,
  originalEmailPrompt,
  onPromptChange,
  onPromptResize,
  promptTextareaRef,
  getDisplayValue,
  onGenerate,
  isGenerating,
  drawerMode = 'compose',
  generationMode = 'merge_field',
  isExpanded = false,
  isMobile = false
}: EmailGenerationControlsProps) {
  const [tonePopoverOpen, setTonePopoverOpen] = useState(false);
  const [offerPopoverOpen, setOfferPopoverOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  
  // Find the selected sender profile from the list
  const selectedSenderProfileData = senderProfiles.find(p => p.id === selectedSenderProfile);

  return (
    <div className="relative border-t border-b rounded-tr-lg md:border-t-0 md:border-b-0 md:mb-6 mb-4 overflow-hidden">
      {selectedProductData ? (
        /* Product Chip Mode - Styled like an input field with controls below */
        <div className="relative">
          <div className="mobile-input mobile-input-text-fix border-0 rounded-none md:border md:rounded-md px-3 md:px-3 py-3 pb-10 bg-background min-h-[48px] flex items-center">
            <span className="group inline-flex items-center px-2.5 py-1 rounded bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary text-sm font-normal truncate max-w-full transition-colors">
              <Box className="w-3 h-3 mr-1.5 flex-shrink-0" />
              <span className="truncate">{selectedProductData.title}</span>
              <button
                onClick={onProductClear}
                className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-destructive"
                title="Remove product"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        </div>
      ) : (
        /* Regular Textarea Mode */
        <Textarea
          ref={promptTextareaRef}
          placeholder="Add product, e.g.: Stationary products & printers"
          value={getDisplayValue(emailPrompt, originalEmailPrompt)}
          onChange={(e) => {
            onPromptChange(e.target.value);
            onPromptResize();
          }}
          className="mobile-input mobile-input-text-fix resize-none transition-all duration-200 pb-8 border-0 rounded-none md:border md:rounded-md px-3 md:px-3 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
          style={{ minHeight: '32px', maxHeight: '120px' }}
        />
      )}
      <div className="absolute bottom-1 left-2 flex items-center gap-2 z-10">
        {/* Product Selection - Always show but hide label when product is selected */}
        <PromptContextBuilderDropdown
          contextType="product"
          items={products}
          selectedId={selectedProduct}
          onSelect={(id) => {
            if (id !== null) {
              const product = products.find(p => p.id === id);
              if (product) {
                onProductSelect(product);
              }
            } else {
              onProductClear();
            }
          }}
          triggerIcon={<Box className="w-3 h-3" />}
          triggerClassName="text-xs"
          headerTitle="Product Context"
          headerDescription="Insert from your existing product list"
          noneDescription="No specific product context"
          addNewLabel="Add New Product"
          showSource={false}
          showPosition={false}
          showTriggerLabel={isExpanded && !isMobile && !selectedProductData}  // Show label only in expanded view
          testIdPrefix="product"
        />

        {/* Tone Selection */}
        <Popover open={tonePopoverOpen} onOpenChange={setTonePopoverOpen}>
          <PopoverTrigger asChild>
            <button 
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-xs",
                selectedTone ? "bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-700" : "text-muted-foreground hover:bg-yellow-400/20"
              )}
              title="Select email tone"
              data-testid="button-tone-selector"
            >
              <Palette className="w-3 h-3" />
              {(isExpanded && !isMobile) && (
                <span>{TONE_OPTIONS.find(t => t.id === selectedTone)?.name || 'Casual'}</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <div className="px-3 py-2 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">Email Tone</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Choose the personality for your email</p>
            </div>
            <div className="p-2">
              {TONE_OPTIONS.map((tone) => (
                <button
                  key={tone.id}
                  className={cn(
                    "w-full text-left p-3 rounded-md hover:bg-accent-hover transition-colors",
                    selectedTone === tone.id && "bg-accent-active"
                  )}
                  onClick={() => {
                    onToneSelect(tone.id);
                    setTonePopoverOpen(false);
                  }}
                  data-testid={`button-tone-${tone.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      <span className="font-medium">{tone.name}</span>
                      <span className="text-muted-foreground"> - {tone.description}</span>
                    </div>
                    {selectedTone === tone.id && (
                      <Check className="w-3 h-3 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Offer Strategy Selection */}
        <Popover open={offerPopoverOpen} onOpenChange={setOfferPopoverOpen}>
          <PopoverTrigger asChild>
            <button 
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-xs",
                selectedOfferStrategy && selectedOfferStrategy !== 'none' ? "bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-700" : "text-muted-foreground hover:bg-yellow-400/20"
              )}
              title="Select offer strategy"
              data-testid="button-offer-selector"
            >
              <Gift className="w-3 h-3" />
              {(isExpanded && !isMobile) && selectedOfferStrategy !== 'none' && (
                <span>{OFFER_OPTIONS.find(o => o.id === selectedOfferStrategy)?.name}</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <div className="px-3 py-2 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">Offer Strategy</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Optional: Structure your offer for maximum impact</p>
            </div>
            <div className="p-2">
              {OFFER_OPTIONS.map((offer) => (
                <button
                  key={offer.id}
                  className={cn(
                    "w-full text-left p-3 rounded-md hover:bg-accent-hover transition-colors",
                    selectedOfferStrategy === offer.id && "bg-accent-active"
                  )}
                  onClick={() => {
                    onOfferStrategySelect(offer.id);
                    setOfferPopoverOpen(false);
                  }}
                  data-testid={`button-offer-${offer.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      <span className="font-medium">{offer.name}</span>
                      <span className="text-muted-foreground"> - {offer.description}</span>
                    </div>
                    {selectedOfferStrategy === offer.id && (
                      <Check className="w-3 h-3 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Sender Profile Selection */}
        <PromptContextBuilderDropdown
          contextType="sender"
          items={senderProfiles}
          selectedId={selectedSenderProfile}
          onSelect={onSenderProfileSelect}
          triggerIcon={<IdCard className="w-3 h-3" />}
          triggerClassName="text-xs"
          showTriggerLabel={isExpanded && !isMobile}
          headerTitle="Sender Profile"
          headerDescription="Sender context for email generation"
          noneDescription="No sender context"
          addNewLabel="Add New Profile"
          showSource={true}
          showPosition={true}
          testIdPrefix="sender"
        />
      </div>
      <div className="absolute bottom-2 right-2 flex items-center gap-2">
        <TooltipProvider>
          <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
            <TooltipTrigger asChild>
              <button 
                className="p-1 rounded hover:bg-accent-hover transition-colors"
                onClick={() => setTooltipOpen(!tooltipOpen)}
                onBlur={() => setTooltipOpen(false)}
                data-testid="button-info-tooltip"
              >
                <Info className="w-3 h-3 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-sm max-w-xs">
              <p>Give us a sentence about your offer and we'll generate the email for you. It'll be awesome.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button 
          onClick={onGenerate} 
          variant={drawerMode === 'campaign' ? "default" : "yellow"}
          disabled={isGenerating}
          className={cn(
            "h-8 px-3 text-xs hover:scale-105 transition-all duration-300 ease-out",
            drawerMode === 'campaign' && getGenerationModeConfig(generationMode).buttonColor
          )}
          data-testid="button-generate-email"
        >
          {isGenerating ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Wand2 className="w-3 h-3 mr-1" />
          )}
          {isGenerating 
            ? "Generating..." 
            : drawerMode === 'campaign' 
              ? getGenerationModeConfig(generationMode).buttonText
              : "Generate Email"
          }
        </Button>
      </div>

    </div>
  );
}
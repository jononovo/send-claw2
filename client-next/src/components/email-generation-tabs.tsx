import { cn } from "@/lib/utils";
import { Sparkles, FileText } from "lucide-react";

export interface GenerationMode {
  id: 'ai_unique' | 'merge_field';
  label: string;
  buttonText: string;
  description?: string;
  icon: React.ElementType;
  activeColor: string;
  buttonColor: string;
}

const GENERATION_MODES: GenerationMode[] = [
  { 
    id: 'merge_field', 
    label: 'Template with merge-fields', 
    buttonText: 'Generate Template',
    description: 'Use merge fields for personalization',
    icon: FileText,
    activeColor: '[&]:text-[#ff69b4]',
    buttonColor: '[&]:bg-[#ff69b4]/5 [&]:hover:bg-[#ff69b4]/10 [&]:text-[#ff69b4] dark:[&]:bg-[#ff69b4]/5 dark:[&]:hover:bg-[#ff69b4]/10 dark:[&]:text-[#ff69b4]'
  },
  { 
    id: 'ai_unique', 
    label: 'AI Each email unique', 
    buttonText: 'Generate Sample',
    description: 'Generate unique email for each recipient',
    icon: Sparkles,
    activeColor: '[&]:text-[#AA336A]',
    buttonColor: '[&]:bg-[#AA336A]/5 [&]:hover:bg-[#AA336A]/10 [&]:text-[#AA336A] dark:[&]:bg-[#AA336A]/5 dark:[&]:hover:bg-[#AA336A]/10 dark:[&]:text-[#AA336A]'
  }
];

interface EmailGenerationTabsProps {
  selectedMode: 'ai_unique' | 'merge_field';
  onModeChange: (mode: 'ai_unique' | 'merge_field') => void;
  className?: string;
}

export function EmailGenerationTabs({ 
  selectedMode, 
  onModeChange, 
  className 
}: EmailGenerationTabsProps) {
  const renderLabel = (label: string, isAI: boolean, isSelected: boolean, activeColor: string) => {
    if (isAI) {
      // "AI Each email unique"
      return (
        <>
          <span className="font-semibold text-muted-foreground">AI</span>
          <span className="font-normal text-muted-foreground"> Each email unique</span>
        </>
      );
    } else {
      // "Template with merge-fields"
      return (
        <>
          <span className="font-semibold text-muted-foreground">Template</span>
          <span className="font-normal text-muted-foreground"> with merge-fields</span>
        </>
      );
    }
  };

  return (
    <div className={cn("inline-flex rounded-tl-lg rounded-tr-lg p-0.5 gap-0.5", className)}>
      {GENERATION_MODES.map((mode) => {
        const Icon = mode.icon;
        const isSelected = selectedMode === mode.id;
        
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onModeChange(mode.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 text-xs rounded-t-md transition-all min-w-fit group",
              isSelected
                ? cn(
                    "shadow-sm bg-muted/30", 
                    mode.id === 'merge_field' 
                      ? "hover:bg-[#ff69b4]/10" 
                      : "hover:bg-[#AA336A]/10"
                  )
                : "hover:text-foreground bg-transparent opacity-55 hover:opacity-70"
            )}
            title={mode.description}
          >
            <Icon className={cn(
              "h-3.5 w-3.5 transition-colors",
              isSelected 
                ? cn(
                    "text-muted-foreground",
                    mode.id === 'merge_field'
                      ? "group-hover:text-[#ff69b4]"
                      : "group-hover:text-[#AA336A]"
                  )
                : "text-muted-foreground/60"
            )} />
            {renderLabel(mode.label, mode.id === 'ai_unique', isSelected, mode.activeColor)}
          </button>
        );
      })}
    </div>
  );
}

export function getGenerationModeConfig(mode: 'ai_unique' | 'merge_field'): GenerationMode {
  return GENERATION_MODES.find(m => m.id === mode) || GENERATION_MODES[0]; // Default to merge_field
}
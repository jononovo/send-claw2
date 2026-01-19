import { useState, useCallback } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ClickToCopyTextProps {
  text: string;
  className?: string;
  tooltipText?: string;
  copiedText?: string;
  copiedDuration?: number;
}

export function ClickToCopyText({
  text,
  className = "",
  tooltipText = "Click to copy",
  copiedText = "Copied",
  copiedDuration = 1500,
}: ClickToCopyTextProps) {
  const [showCopied, setShowCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), copiedDuration);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  }, [text, copiedDuration]);

  return (
    <span className="inline-flex items-center gap-1">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleCopy}
              className={`hover:underline cursor-pointer focus:outline-none ${className}`}
            >
              {text}
            </button>
          </TooltipTrigger>
          {!showCopied && (
            <TooltipContent side="right" className="text-[10px] px-1.5 py-0.5">
              <p>{tooltipText}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      {showCopied && (
        <span className="text-xs text-green-600 animate-in fade-in duration-150">
          {copiedText}
        </span>
      )}
    </span>
  );
}

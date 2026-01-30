import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, ThumbsDown, Loader2 } from "lucide-react";

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedbackType: "excellent" | "terrible", ispContext: string) => void;
  feedbackType: "excellent" | "terrible";
  contactName: string;
  isPending?: boolean;
}

export function FeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  feedbackType,
  contactName,
  isPending = false,
}: FeedbackModalProps) {
  const [context, setContext] = useState("");

  const isExcellent = feedbackType === "excellent";
  const title = isExcellent ? "Excellent Match" : "Not a Match";
  const question = isExcellent
    ? "Tell us why this contact is ideal?"
    : "Tell us why this contact is not ideal?";

  const handleSubmit = () => {
    if (context.trim()) {
      onSubmit(feedbackType, context.trim());
      setContext("");
    }
  };

  const handleClose = () => {
    setContext("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md" data-testid="feedback-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isExcellent ? (
              <Star className="h-5 w-5 text-yellow-500" />
            ) : (
              <ThumbsDown className="h-5 w-5 text-red-500" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>
            You're rating <span className="font-medium">{contactName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label htmlFor="feedback-context" className="text-sm font-medium">
            {question}
          </Label>
          <Textarea
            id="feedback-context"
            placeholder="recently promoted or part of large group of companies"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="mt-2 min-h-[100px]"
            data-testid="input-feedback-context"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
            data-testid="button-cancel-feedback"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!context.trim() || isPending}
            data-testid="button-submit-feedback"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

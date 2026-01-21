import { X, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTopNavAd } from './context';

export function TopNavAdMessage() {
  const { activeOffer, dismissOffer } = useTopNavAd();

  if (!activeOffer) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-primary/90 to-primary text-primary-foreground px-4 py-2 flex items-center justify-center gap-3 text-sm">
      <Gift className="h-4 w-4 flex-shrink-0" />
      <span className="font-medium">{activeOffer.message}</span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 px-3 text-xs font-semibold"
        onClick={activeOffer.onAction}
      >
        {activeOffer.ctaLabel}
      </Button>
      {activeOffer.dismissible && (
        <button
          onClick={() => dismissOffer(activeOffer.id)}
          className="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

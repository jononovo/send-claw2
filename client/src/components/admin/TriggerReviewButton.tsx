import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Play, RefreshCw, ChevronDown } from 'lucide-react';

interface TriggerReviewButtonProps {
  onTrigger: (date?: Date) => void;
  isPending: boolean;
  label?: string;
  description?: string;
}

export function TriggerReviewButton({
  onTrigger,
  isPending,
  label = 'Trigger Review',
  description = 'Default reviews last 24 hours'
}: TriggerReviewButtonProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  return (
    <div className="flex">
      <Button
        size="sm"
        onClick={() => onTrigger()}
        disabled={isPending}
        className="rounded-r-none"
      >
        {isPending ? (
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Play className="h-4 w-4 mr-2" />
        )}
        {label}
      </Button>
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="default"
            className="rounded-l-none border-l border-primary-foreground/20 px-2"
            disabled={isPending}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-2 border-b">
            <p className="text-sm font-medium">Select date to review</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              if (date) {
                onTrigger(date);
                setDateOpen(false);
              }
            }}
            disabled={(date) => date > new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

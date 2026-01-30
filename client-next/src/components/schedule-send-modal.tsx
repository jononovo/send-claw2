import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface ScheduleSendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  selectedTime?: string;
  onApply: (date: Date, time: string) => void;
}

export function ScheduleSendModal({
  open,
  onOpenChange,
  selectedDate,
  selectedTime = "09:00",
  onApply,
}: ScheduleSendModalProps) {
  const [date, setDate] = useState<Date | undefined>(selectedDate || new Date());
  const [time, setTime] = useState<string>(selectedTime);

  const handleApply = () => {
    if (date) {
      onApply(date, time);
      onOpenChange(false);
    }
  };

  const formatSelectedDate = () => {
    if (!date) return "";
    return format(date, "EEEE, MMM d, yyyy");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-2xl font-semibold">Settings</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-2">
          <div className="flex items-center gap-3 text-lg">
            <span>Schedule send</span>
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="px-6 pb-4">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border"
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </div>

        <div className="px-6 pb-4 space-y-3">
          <div>
            <Label className="text-base font-normal text-muted-foreground">
              {formatSelectedDate()}
            </Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-32"
            />
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 flex flex-col gap-2 sm:flex-col">
          <Button 
            onClick={handleApply}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Apply
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
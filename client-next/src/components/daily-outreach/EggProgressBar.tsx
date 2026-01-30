import { useState, useEffect } from 'react';
import { fireDailyCompleteConfetti } from '@/features/animations';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

interface EggProgressBarProps {
  totalEmails: number;
  sentEmails: number;
  currentIndex?: number;
  pendingCount?: number;
  date?: string;
  productName?: string;
  onEggClick?: (index: number) => void;
}

// Define egg states
type EggState = 'egg' | 'cracked' | 'hatched';

interface EggData {
  state: EggState;
  isNew?: boolean;
}

export function EggProgressBar({ totalEmails, sentEmails, currentIndex, pendingCount, date, productName, onEggClick }: EggProgressBarProps) {
  const [eggs, setEggs] = useState<EggData[]>([]);

  // Initialize eggs based on sent count
  useEffect(() => {
    const initialEggs: EggData[] = Array.from({ length: totalEmails }, (_, i) => {
      if (i < sentEmails) {
        return { state: 'hatched', isNew: false };
      } else if (i === sentEmails) {
        return { state: 'cracked', isNew: true };
      } else {
        return { state: 'egg', isNew: false };
      }
    });
    setEggs(initialEggs);
    
    // Clear the "new" flag after animation plays
    if (sentEmails > 0 && sentEmails < totalEmails) {
      const timer = setTimeout(() => {
        setEggs(prev => prev.map((egg, i) => 
          i === sentEmails ? { ...egg, isNew: false } : egg
        ));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [totalEmails, sentEmails]);

  // Simple confetti when all emails are sent
  useEffect(() => {
    if (sentEmails === totalEmails && totalEmails > 0) {
      fireDailyCompleteConfetti();
    }
  }, [sentEmails, totalEmails]);

  const getEggEmoji = (egg: EggData) => {
    if (egg.state === 'hatched') {
      return '🐥';
    } else if (egg.state === 'cracked') {
      return '🐣';
    } else {
      return '🥚';
    }
  };

  const getEggAnimation = (egg: EggData, index: number) => {
    // Apply subtle animation to the current egg (cracked state)
    if (egg.state === 'cracked' && egg.isNew) {
      // Use one of the subtle animations from the search page
      return 'animate-disco-bounce';
    }
    return '';
  };

  return (
    <div className="w-full">
      {/* Header row with product name and email count/date */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-medium text-gray-700">
          {productName || ''}
        </div>
        <div className="text-xs text-gray-600 mr-4 flex items-center gap-1">
          {currentIndex !== undefined && pendingCount !== undefined && (
            <span>Email {currentIndex + 1} of {totalEmails}</span>
          )}
          {currentIndex !== undefined && date && (
            <span className="mx-1">•</span>
          )}
          {date && (
            <>
              <Calendar className="h-3 w-3" />
              <span>{date}</span>
            </>
          )}
        </div>
      </div>
      
      {/* White card container for eggs */}
      <div className="bg-white rounded-lg p-4">
        {/* Eggs container - with subtle animations */}
        <div className="flex items-center justify-center gap-3 md:gap-4 mb-2">
          {eggs.map((egg, index) => (
            <div
              key={index}
              className="relative"
            >
              <button
                onClick={() => onEggClick?.(index)}
                disabled={egg.state === 'egg' && index > sentEmails}
                className={cn(
                  "text-2xl md:text-3xl transition-transform duration-200",
                  egg.state === 'hatched' && 'hover:scale-110',
                  getEggAnimation(egg, index)
                )}
              >
                {getEggEmoji(egg)}
              </button>
            </div>
          ))}
        </div>

        {/* Progress text */}
        <div className="text-center text-xs text-gray-600">
          {sentEmails === 0 && (
            <span>Ready for email {totalEmails}</span>
          )}
          {sentEmails > 0 && sentEmails < totalEmails && (
            <span>Sent {sentEmails}, Ready for email {sentEmails + 1}</span>
          )}
          {sentEmails === totalEmails && totalEmails > 0 && (
            <span className="text-green-600 font-semibold">All done! Great job! 🎉</span>
          )}
        </div>
      </div>
    </div>
  );
}
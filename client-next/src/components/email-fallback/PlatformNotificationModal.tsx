import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Smartphone, Monitor } from 'lucide-react';

interface PlatformNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: {
    title: string;
    message: string;
    icon: string;
    delay: number;
  };
}

export function PlatformNotificationModal({
  open,
  onOpenChange,
  notification
}: PlatformNotificationModalProps) {
  // Auto-close after delay
  React.useEffect(() => {
    if (open && notification.delay) {
      const timer = setTimeout(() => {
        onOpenChange(false);
      }, notification.delay + 1000); // Add extra second for reading
      
      return () => clearTimeout(timer);
    }
  }, [open, notification.delay, onOpenChange]);

  const getIcon = () => {
    // Detect if mobile or desktop
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
    
    if (isMobile) {
      return <Smartphone className="h-8 w-8 text-blue-500" />;
    } else {
      return <Monitor className="h-8 w-8 text-blue-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <DialogTitle className="text-lg">
              {notification.title}
            </DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription className="text-left pt-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm">
              {notification.message}
            </p>
          </div>
        </DialogDescription>
        
        <div className="flex justify-end pt-4">
          <Button 
            onClick={() => onOpenChange(false)}
            variant="outline"
            size="sm"
          >
            Got it
          </Button>
        </div>
        
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all"
            style={{
              animation: `progress ${notification.delay}ms linear`,
              transformOrigin: 'left'
            }}
          />
        </div>
      </DialogContent>
      
      <style>{`
        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        .animate-progress {
          animation: progress linear;
        }
      `}</style>
    </Dialog>
  );
}
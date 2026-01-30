import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sentCount: number;
}

export function CompletionModal({ isOpen, onClose, sentCount }: CompletionModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay - same style as registration modal */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4">
        {/* Modal Content - same style as registration modal */}
        <div className="bg-white dark:bg-black/90 border border-gray-200 dark:border-white/10 rounded-lg w-full max-w-md mx-auto relative overflow-hidden">
          <div className="p-8">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                All Done! 🎉
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                You've completed your daily outreach!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {sentCount} emails sent today. Check back tomorrow for your next batch of leads!
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={onClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Review My Emails
              </Button>
              <Button
                onClick={() => window.location.href = '/streak'}
                variant="outline"
                className="w-full"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
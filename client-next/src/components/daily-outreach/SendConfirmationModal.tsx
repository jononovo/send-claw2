import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle, X } from 'lucide-react';

interface SendConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  contactName: string;
  companyName: string;
}

export function SendConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  contactName,
  companyName,
}: SendConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Did you send the email?
          </DialogTitle>
          <DialogDescription className="pt-2">
            Please confirm that you've sent the email to{' '}
            <span className="font-semibold">{contactName}</span> at{' '}
            <span className="font-semibold">{companyName}</span>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 sm:flex-none"
          >
            <X className="h-4 w-4 mr-2" />
            Not yet
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Yes, I sent it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { motion } from "framer-motion";
import { X, Download, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CertificateFull } from "./CertificatePreview";
import { generateCertificatePDF } from "../utils/generateCertificatePDF";

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  completionDate: string;
  isUnlocked: boolean;
  userId?: string;
}

export function CertificateModal({ 
  isOpen, 
  onClose, 
  recipientName, 
  completionDate,
  isUnlocked,
  userId
}: CertificateModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!isUnlocked) return;
    
    setIsDownloading(true);
    try {
      const pdfBytes = await generateCertificatePDF(recipientName, completionDate, userId);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `5Ducks-Certificate-${recipientName.replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate certificate:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-gray-950 border-gray-800 p-0 overflow-hidden">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 transition-colors"
            data-testid="certificate-modal-close"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>

          <div className="p-6 md:p-8">
            <CertificateFull 
              recipientName={recipientName} 
              completionDate={completionDate}
              credentialId={userId}
            />

            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleDownload}
                disabled={!isUnlocked || isDownloading}
                className={`
                  ${isUnlocked 
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" 
                    : "bg-gray-700 cursor-not-allowed"
                  } text-white px-6
                `}
                data-testid="certificate-download-button"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {isUnlocked ? "Download Certificate" : "Complete All Quests to Download"}
                  </>
                )}
              </Button>
            </div>

            {!isUnlocked && (
              <p className="text-center text-sm text-gray-500 mt-3">
                This is a preview. Complete all quests to unlock your personalized certificate.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

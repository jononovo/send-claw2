import { useState } from "react";
import { motion } from "framer-motion";
import { Award, Eye } from "lucide-react";
import { CertificatePreview } from "./CertificatePreview";
import { CertificateModal } from "./CertificateModal";

interface CertificateShowcaseProps {
  recipientName: string;
  completionDate?: string;
  isUnlocked: boolean;
  questsCompleted: number;
  totalQuests: number;
  userId?: string;
}

export function CertificateShowcase({
  recipientName,
  completionDate,
  isUnlocked,
  questsCompleted,
  totalQuests,
  userId,
}: CertificateShowcaseProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const displayDate = completionDate || new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-10 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Your Certificate</h2>
        </div>

        <div className={`
          relative p-6 rounded-xl border backdrop-blur-sm
          ${isUnlocked 
            ? "bg-gradient-to-br from-amber-900/20 to-orange-900/10 border-amber-500/30" 
            : "bg-gray-900/50 border-gray-700/50"
          }
        `}>
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="group relative w-48 cursor-pointer"
              data-testid="certificate-thumbnail"
            >
              <CertificatePreview
                recipientName={recipientName}
                completionDate={displayDate}
                isUnlocked={isUnlocked}
              />
              
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-white/90 text-gray-900 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </div>
              </div>
            </button>

            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold text-white mb-2">
                Prospecting & Email Campaigns Certificate
              </h3>
              
              {isUnlocked ? (
                <>
                  <p className="text-gray-400 mb-4">
                    Congratulations! You've completed all quests and earned your certificate.
                    Click the preview to view and download your personalized certificate.
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Unlocked
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-400 mb-4">
                    Complete all quests to unlock your personalized certificate of completion.
                    You can preview what it will look like by clicking the thumbnail.
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-[200px] h-2 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(questsCompleted / totalQuests) * 100}%` }}
                        className="h-full bg-amber-500 rounded-full"
                      />
                    </div>
                    <span className="text-sm text-gray-500">
                      {questsCompleted}/{totalQuests} quests
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <CertificateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        recipientName={recipientName}
        completionDate={displayDate}
        isUnlocked={isUnlocked}
        userId={userId}
      />
    </>
  );
}

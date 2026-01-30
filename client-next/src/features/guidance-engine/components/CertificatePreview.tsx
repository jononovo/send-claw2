import { motion } from "framer-motion";
import { Award, Download, Lock } from "lucide-react";

interface CertificatePreviewProps {
  recipientName?: string;
  completionDate?: string;
  isUnlocked: boolean;
}

export function CertificatePreview({ recipientName = "Your Name", completionDate, isUnlocked }: CertificatePreviewProps) {
  const displayDate = completionDate || new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <div className={`
      relative w-full aspect-[1.4] rounded-lg overflow-hidden
      bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900
      border-2 ${isUnlocked ? "border-amber-500/50" : "border-gray-700/50"}
      shadow-2xl
    `}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
      
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-amber-500 to-transparent" />
      <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-amber-500 to-transparent" />

      <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-amber-500/60 rounded-tl-lg" />
      <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-500/60 rounded-tr-lg" />
      <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-500/60 rounded-bl-lg" />
      <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-amber-500/60 rounded-br-lg" />

      <div className="relative h-full flex flex-col items-center justify-center p-4 text-center">
        <div className="mb-2">
          <Award className={`h-6 w-6 ${isUnlocked ? "text-amber-400" : "text-gray-500"}`} />
        </div>
        
        <p className={`text-[6px] uppercase tracking-[0.15em] ${isUnlocked ? "text-amber-400/80" : "text-gray-500"} mb-0.5`}>
          5Ducks GTM Mastery Program
        </p>
        
        <h3 className="text-[9px] font-bold text-white mb-0.5">
          Prospecting & Email Campaigns
        </h3>
        
        <p className="text-[6px] text-gray-400 mb-1">
          This certifies that
        </p>
        
        <p className={`text-xs font-semibold ${isUnlocked ? "text-amber-300" : "text-gray-400"} mb-2`}>
          {recipientName}
        </p>
        
        <p className="text-[6px] text-gray-500">
          {displayDate}
        </p>

        {!isUnlocked && (
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-[1px] flex items-center justify-center">
            <div className="text-center">
              <Lock className="h-5 w-5 text-gray-500 mx-auto mb-1" />
              <p className="text-[8px] text-gray-400">Complete all quests</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface CertificateFullProps {
  recipientName: string;
  completionDate: string;
  credentialId?: string;
}

function formatCredentialId(userId?: string): string {
  const paddedId = (userId || "0").padStart(6, "0");
  return `${paddedId}-PE021`;
}

export function CertificateFull({ recipientName, completionDate, credentialId }: CertificateFullProps) {
  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-[1.4] rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-amber-500/50 shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/30 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-amber-800/10 via-transparent to-transparent" />
      
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
      <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-transparent via-amber-500 to-transparent" />
      <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-transparent via-amber-500 to-transparent" />

      <div className="absolute top-6 left-6 w-16 h-16 border-t-4 border-l-4 border-amber-500/60 rounded-tl-2xl" />
      <div className="absolute top-6 right-6 w-16 h-16 border-t-4 border-r-4 border-amber-500/60 rounded-tr-2xl" />
      <div className="absolute bottom-6 left-6 w-16 h-16 border-b-4 border-l-4 border-amber-500/60 rounded-bl-2xl" />
      <div className="absolute bottom-6 right-6 w-16 h-16 border-b-4 border-r-4 border-amber-500/60 rounded-br-2xl" />

      <div className="relative h-full flex flex-col items-center justify-center p-8 md:p-12 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="mb-4"
        >
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Award className="h-8 w-8 md:h-10 md:w-10 text-gray-900" />
          </div>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xs md:text-sm uppercase tracking-[0.2em] text-amber-400/80 mb-1"
        >
          5Ducks GTM Mastery Program
        </motion.p>
        
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xl md:text-3xl font-bold text-white mb-4"
        >
          Prospecting & Email Campaigns
        </motion.h2>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-4"
        >
          <p className="text-sm text-gray-400 mb-2">
            This certifies that
          </p>
          <p className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 bg-clip-text text-transparent">
            {recipientName}
          </p>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-xs md:text-sm text-gray-300 max-w-md mb-6"
        >
          has successfully completed all quests and demonstrated proficiency in B2B prospecting and email campaign management
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col items-center mt-2"
        >
          <svg 
            width="120" 
            height="35" 
            viewBox="0 0 140 40" 
            className="-mb-1"
            style={{ transform: 'rotate(-2deg) skewX(-12deg)' }}
          >
            <path
              d="M6 34 C2 28, 0 18, 6 10 C12 2, 24 0, 30 8 C36 16, 32 28, 22 34 C12 40, 8 42, 18 38 C28 34, 34 26, 40 20 C46 14, 52 12, 56 16 C60 20, 58 26, 54 30 C50 34, 48 36, 54 34 C60 32, 68 26, 78 20 C88 14, 100 12, 110 18 C120 24, 116 32, 130 28"
              fill="none"
              stroke="#D1D5DB"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="w-40 h-px bg-gray-600 mb-2" />
          <p className="text-xs text-gray-400 mb-1">Director of GTM Programs</p>
          <p className="text-xs text-gray-500">{completionDate}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="absolute bottom-2 left-0 right-0 px-8 flex justify-between items-center"
        >
          <span className="text-[9px] text-gray-500">© 5Ducks 2025, 10005 NY, USA</span>
          <span className="text-[8px] text-gray-600 font-mono">{formatCredentialId(credentialId)}</span>
        </motion.div>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Trophy, ChevronRight, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface ChallengeCompleteProps {
  isVisible: boolean;
  challengeName: string;
  message?: string;
  creditsAwarded?: number;
  onContinue: () => void;
  onDismiss: () => void;
}

export function ChallengeComplete({
  isVisible,
  challengeName,
  message,
  creditsAwarded,
  onContinue,
  onDismiss,
}: ChallengeCompleteProps) {
  useEffect(() => {
    if (isVisible) {
      const duration = 2000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#facc15", "#f59e0b", "#fbbf24"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#facc15", "#f59e0b", "#fbbf24"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [isVisible]);

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onDismiss}
          data-recorder-ui="true"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 max-w-md mx-4 text-center border border-yellow-500/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg"
            >
              <Trophy className="h-10 w-10 text-white" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mb-2"
            >
              Challenge Complete!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-yellow-400 font-medium mb-3"
            >
              {challengeName}
            </motion.p>

            {message && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-gray-300 text-sm mb-4"
              >
                {message}
              </motion.p>
            )}

            {creditsAwarded && creditsAwarded > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55, type: "spring", stiffness: 400, damping: 20 }}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-full px-4 py-2 mb-6"
              >
                <Coins className="h-5 w-5 text-amber-400" />
                <span className="text-amber-400 font-semibold">+{creditsAwarded} Credits Earned!</span>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex gap-3 justify-center"
            >
              <Button
                variant="ghost"
                onClick={onDismiss}
                className="text-gray-400 hover:text-white"
              >
                Dismiss
              </Button>
              <Button
                onClick={onContinue}
                className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:from-yellow-600 hover:to-amber-600"
              >
                Next Challenge <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

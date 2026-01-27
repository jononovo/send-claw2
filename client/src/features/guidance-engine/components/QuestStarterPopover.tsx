import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Play, Pointer, X } from "lucide-react";

interface QuestStarterPopoverProps {
  isVisible: boolean;
  onShowMeMode: () => void;
  onGuideMeMode: () => void;
  onDismiss: () => void;
}

export function QuestStarterPopover({
  isVisible,
  onShowMeMode,
  onGuideMeMode,
  onDismiss,
}: QuestStarterPopoverProps) {
  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9980]"
            onClick={onDismiss}
          />

          <motion.div
            className="fixed bottom-6 right-6 z-[9990]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-3 right-0 bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden min-w-[200px]"
            >
              <div className="px-4 py-3 border-b border-gray-700">
                <p className="text-white text-sm font-medium">Hey, wanna see a demo?</p>
              </div>

              <button
                onClick={onShowMeMode}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-gray-800 transition-colors"
                data-testid="quest-starter-show-me"
              >
                <Play className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium">Show-me Mode</span>
              </button>

              <button
                onClick={onGuideMeMode}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-gray-800 transition-colors border-t border-gray-700"
                data-testid="quest-starter-guide-me"
              >
                <Pointer className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium">Guide-me Mode</span>
              </button>

              <button
                onClick={onDismiss}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-400 hover:bg-gray-800 hover:text-white transition-colors border-t border-gray-700"
                data-testid="quest-starter-dismiss"
              >
                <X className="h-4 w-4" />
                <span className="text-sm font-medium">Not now</span>
              </button>
            </motion.div>

            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
              <span className="text-xl">🐥</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

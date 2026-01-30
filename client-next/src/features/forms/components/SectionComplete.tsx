import { motion } from "framer-motion";
import type { ScreenComponentProps } from "../types";

export function SectionComplete({ title, subtitle, emoji = "🎉", credits }: ScreenComponentProps) {
  return (
    <div className="text-center space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.5, times: [0, 0.6, 1] }}
        className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-[0_0_80px_rgba(250,204,21,0.5)]"
      >
        <span className="text-5xl">{emoji}</span>
      </motion.div>

      <div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl md:text-4xl font-bold text-white mb-2"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-gray-400"
        >
          {subtitle}
        </motion.p>
      </div>

      {credits && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: "spring" }}
          className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30"
        >
          <span className="text-2xl">💰</span>
          <span className="text-xl font-bold text-yellow-400">+{credits} credits earned!</span>
        </motion.div>
      )}
    </div>
  );
}

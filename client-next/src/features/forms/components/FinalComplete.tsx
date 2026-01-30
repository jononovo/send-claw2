import { motion } from "framer-motion";
import type { ScreenComponentProps } from "../types";

export function FinalComplete({ title, subtitle, emoji = "🚀" }: ScreenComponentProps) {
  return (
    <div className="text-center space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.3, 1] }}
        transition={{ duration: 0.6, times: [0, 0.5, 1] }}
        className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-[0_0_100px_rgba(250,204,21,0.6)]"
      >
        <span className="text-6xl">{emoji}</span>
      </motion.div>

      <div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-5xl font-bold text-white mb-3"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xl text-gray-400"
        >
          {subtitle}
        </motion.p>
      </div>
    </div>
  );
}

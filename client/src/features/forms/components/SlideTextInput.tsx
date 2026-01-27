import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SlideComponentProps } from "../types";

interface SlideTextInputProps<T extends Record<string, string>> extends SlideComponentProps<T> {
  onAlternativeClick?: () => void;
}

export function SlideTextInput<T extends Record<string, string>>({
  slide,
  data,
  onTextInput,
  onNext,
  onAlternativeClick,
}: SlideTextInputProps<T>) {
  const value = (data[slide.id as keyof T] as string) || "";

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-6">
          <span className="text-2xl">🐥</span>
          <h2 className="text-xl md:text-2xl font-bold text-white">
            {slide.title}
          </h2>
        </div>
        {slide.subtitle && (
          <p className="text-gray-400">{slide.subtitle}</p>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {slide.inputType === "textarea" ? (
          <Textarea
            value={value}
            onChange={(e) => onTextInput?.(slide.id, e.target.value)}
            placeholder={slide.placeholder}
            className="min-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20 rounded-xl text-lg p-4"
            data-testid={`input-${slide.id}`}
          />
        ) : (
          <Input
            type={slide.inputType === "url" ? "url" : "text"}
            value={value}
            onChange={(e) => onTextInput?.(slide.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onNext?.();
              }
            }}
            placeholder={slide.placeholder}
            className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20 rounded-xl text-lg"
            data-testid={`input-${slide.id}`}
          />
        )}
        {slide.alternativeLink && onAlternativeClick && (
          <button
            onClick={onAlternativeClick}
            className="w-full mt-4 text-lg text-gray-400 hover:text-white transition-colors"
          >
            {slide.alternativeLink.text}
          </button>
        )}
      </motion.div>
    </div>
  );
}

import { motion } from "framer-motion";
import type { SlideComponentProps } from "../types";

export function SlideMultiSelect<T extends Record<string, string>>({
  slide,
  data,
  onSelect,
}: SlideComponentProps<T>) {
  const selectedValues = (data[slide.id as keyof T] as string || "")
    .split(",")
    .filter(Boolean);

  const handleToggle = (optionId: string) => {
    const isSelected = selectedValues.includes(optionId);
    let newValues: string[];
    
    if (isSelected) {
      newValues = selectedValues.filter((v) => v !== optionId);
    } else {
      newValues = [...selectedValues, optionId];
    }
    
    onSelect?.(slide.id, newValues.join(","));
  };

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

      <div className="space-y-3">
        {slide.options?.map((option, index) => {
          const isSelected = selectedValues.includes(option.id);
          return (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleToggle(option.id)}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 text-left group ${
                isSelected
                  ? "bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_20px_rgba(250,204,21,0.2)]"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              }`}
              data-testid={`option-${slide.id}-${option.id}`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  isSelected
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-white/10 text-gray-400 group-hover:text-white"
                }`}
              >
                {option.icon}
              </div>
              <div className="flex-1">
                <span
                  className={`text-lg font-medium transition-colors ${
                    isSelected ? "text-white" : "text-gray-300"
                  }`}
                >
                  {option.label}
                </span>
              </div>
              <div
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? "bg-yellow-500 border-yellow-500"
                    : "border-white/30"
                }`}
              >
                {isSelected && (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-4 h-4 text-black"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </motion.svg>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

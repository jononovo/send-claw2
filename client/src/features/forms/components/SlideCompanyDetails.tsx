import { useRef } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import type { SlideComponentProps } from "../types";

interface CompanyDetailsData {
  companyName: string;
  companyCity: string;
  companyCountry: string;
}

export function SlideCompanyDetails<T extends Record<string, string> & CompanyDetailsData>({
  slide,
  data,
  onTextInput,
  onNext,
}: SlideComponentProps<T>) {
  const cityRef = useRef<HTMLInputElement>(null);
  const countryRef = useRef<HTMLInputElement>(null);

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

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label className="block text-sm font-medium text-gray-400 mb-2">Company Name</label>
          <Input
            value={data.companyName || ""}
            onChange={(e) => onTextInput?.("companyName", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                cityRef.current?.focus();
              }
            }}
            placeholder="Acme Inc."
            className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20 rounded-xl text-lg"
            data-testid="input-companyName"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label className="block text-sm font-medium text-gray-400 mb-2">City</label>
          <Input
            ref={cityRef}
            value={data.companyCity || ""}
            onChange={(e) => onTextInput?.("companyCity", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                countryRef.current?.focus();
              }
            }}
            placeholder="San Francisco"
            className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20 rounded-xl text-lg"
            data-testid="input-companyCity"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <label className="block text-sm font-medium text-gray-400 mb-2">Country</label>
          <Input
            ref={countryRef}
            value={data.companyCountry || ""}
            onChange={(e) => onTextInput?.("companyCountry", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onNext?.();
              }
            }}
            placeholder="United States"
            className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20 rounded-xl text-lg"
            data-testid="input-companyCountry"
          />
        </motion.div>
      </div>
    </div>
  );
}

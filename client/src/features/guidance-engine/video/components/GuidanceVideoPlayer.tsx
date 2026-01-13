import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX, Minimize2, Maximize2 } from "lucide-react";

interface GuidanceVideoPlayerProps {
  videoUrl: string | null;
  isVisible: boolean;
  onClose?: () => void;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  size?: "small" | "medium" | "large";
}

export function GuidanceVideoPlayer({
  videoUrl,
  isVisible,
  onClose,
  position = "bottom-right",
  size = "small",
}: GuidanceVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      setIsLoaded(false);
      setHasError(false);
      videoRef.current.load();
    }
  }, [videoUrl]);

  useEffect(() => {
    if (isVisible && videoRef.current && isLoaded && !hasError) {
      videoRef.current.play().catch(console.error);
    }
  }, [isVisible, isLoaded, hasError]);

  const positionClasses = {
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
  };

  const sizeClasses = {
    small: isMinimized ? "w-20 h-14" : "w-48 h-32",
    medium: isMinimized ? "w-24 h-16" : "w-64 h-44",
    large: isMinimized ? "w-28 h-20" : "w-80 h-56",
  };

  if (!videoUrl || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={`fixed ${positionClasses[position]} z-50`}
      >
        <div
          className={`relative ${sizeClasses[size]} transition-all duration-300 ease-out`}
        >
          <div className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl ring-2 ring-amber-400/30">
            {hasError ? (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <span className="text-xs text-gray-500">Video unavailable</span>
              </div>
            ) : (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                src={videoUrl}
                muted={isMuted}
                loop
                playsInline
                onLoadedData={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
              />
            )}
          </div>

          {!isMinimized && (
            <div className="absolute -top-1 -right-1 flex gap-1">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-6 h-6 rounded-full bg-gray-900/80 hover:bg-gray-800 flex items-center justify-center text-white transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-3 h-3" />
                ) : (
                  <Volume2 className="w-3 h-3" />
                )}
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="w-6 h-6 rounded-full bg-gray-900/80 hover:bg-gray-800 flex items-center justify-center text-white transition-colors"
              >
                <Minimize2 className="w-3 h-3" />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-6 h-6 rounded-full bg-gray-900/80 hover:bg-red-600 flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {isMinimized && (
            <button
              onClick={() => setIsMinimized(false)}
              className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}

          {!isMinimized && !hasError && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
              <div className="px-2 py-0.5 bg-amber-500/90 rounded-full">
                <span className="text-[10px] font-medium text-gray-900">
                  Your guide
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX, Minimize2, Maximize2, Play, Pause, RotateCcw } from "lucide-react";

interface GuidanceVideoPlayerProps {
  videoUrl: string | null;
  isVisible: boolean;
  onClose?: () => void;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  size?: "small" | "medium" | "large";
  onTimeUpdate?: (currentTimeMs: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  /** If true, video won't auto-play until this becomes true. Used to wait for timestamps. */
  canAutoPlay?: boolean;
}

export function GuidanceVideoPlayer({
  videoUrl,
  isVisible,
  onClose,
  position = "bottom-right",
  size = "small",
  onTimeUpdate,
  onPlayStateChange,
  canAutoPlay = true,
}: GuidanceVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      setIsLoaded(false);
      setHasError(false);
      setHasEnded(false);
      setIsPlaying(false);
      videoRef.current.load();
    }
  }, [videoUrl]);

  useEffect(() => {
    if (isVisible && videoRef.current && isLoaded && !hasError && canAutoPlay) {
      const now = Date.now();
      console.log(`[TIMING ${now}] VideoPlayer AUTO-PLAY starting - canAutoPlay: ${canAutoPlay}, currentTime: ${videoRef.current.currentTime}s`);
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  }, [isVisible, isLoaded, hasError, canAutoPlay]);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    
    if (hasEnded) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
      setHasEnded(false);
      setIsPlaying(true);
    } else if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setHasEnded(true);
  };

  const positionClasses = {
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
  };

  const sizeClasses = {
    small: isMinimized ? "w-14 h-20" : "w-32 h-48",
    medium: isMinimized ? "w-16 h-24" : "w-44 h-64",
    large: isMinimized ? "w-20 h-28" : "w-56 h-80",
  };

  if (!videoUrl || !isVisible) return null;

  const showPlaybackOverlay = !isMinimized && !hasError && (hasEnded || !isPlaying || isHovering);

  return (
    <>
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-40" />
      <AnimatePresence>
        <motion.div
          drag
          dragConstraints={constraintsRef}
          dragElastic={0.1}
          dragMomentum={false}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={`fixed ${positionClasses[position]} z-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          whileDrag={{ scale: 1.05 }}
        >
          <div
            className={`relative ${sizeClasses[size]} transition-all duration-300 ease-out`}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
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
                playsInline
                onLoadedData={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                onEnded={handleVideoEnded}
                onPlay={() => {
                  setIsPlaying(true);
                  onPlayStateChange?.(true);
                }}
                onPause={() => {
                  setIsPlaying(false);
                  onPlayStateChange?.(false);
                }}
                onTimeUpdate={(e) => {
                  const currentTimeMs = (e.target as HTMLVideoElement).currentTime * 1000;
                  onTimeUpdate?.(currentTimeMs);
                }}
              />
            )}
          </div>

          {showPlaybackOverlay && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <button
                onClick={handlePlayPause}
                className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors cursor-pointer pointer-events-auto">
                {hasEnded ? (
                  <RotateCcw className="w-5 h-5" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>
            </div>
          )}

          {!isMinimized && (
            <div className="absolute -top-1 -right-1 flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="w-6 h-6 rounded-full bg-gray-900/80 hover:bg-gray-800 flex items-center justify-center text-white transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-3 h-3" />
                ) : (
                  <Volume2 className="w-3 h-3" />
                )}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                className="w-6 h-6 rounded-full bg-gray-900/80 hover:bg-gray-800 flex items-center justify-center text-white transition-colors"
              >
                <Minimize2 className="w-3 h-3" />
              </button>
              {onClose && (
                <button
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
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
    </>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import { X, RotateCcw } from "lucide-react";

interface DemoSimulationPlayerProps {
  simulation: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  onLoad?: () => void;
  onComplete?: () => void;
  onClose?: () => void;
  showControls?: boolean;
}

export function DemoSimulationPlayer({
  simulation,
  width = 520,
  height = 520,
  autoPlay = true,
  loop = true,
  className = "",
  onLoad,
  onComplete,
  onClose,
  showControls = true,
}: DemoSimulationPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHoveringControls, setIsHoveringControls] = useState(false);
  const [showReplayOverlay, setShowReplayOverlay] = useState(false);

  const src = `/static/demo-simulations/${simulation}.html`;

  const handleReplay = useCallback(() => {
    setShowReplayOverlay(false);
    iframeRef.current?.contentWindow?.postMessage({ type: 'restartDemo' }, '*');
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setIsLoaded(true);
      onLoad?.();
    };

    iframe.addEventListener("load", handleLoad);
    return () => iframe.removeEventListener("load", handleLoad);
  }, [onLoad]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'demoComplete') {
        setShowReplayOverlay(true);
        onComplete?.();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onComplete]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl shadow-lg ${className}`}
      style={{ width, height }}
      data-testid="demo-simulation-player"
      onMouseEnter={() => setIsHoveringControls(true)}
      onMouseLeave={() => setIsHoveringControls(false)}
    >
      <iframe
        ref={iframeRef}
        src={src}
        width={width}
        height={height}
        className="border-0"
        title="Interactive Demo"
        loading="lazy"
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="animate-pulse text-slate-400">Loading demo...</div>
        </div>
      )}
      
      {showControls && onClose && isLoaded && (
        <div 
          className={`absolute top-3 right-3 z-10 transition-opacity duration-200 ${
            isHoveringControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white transition-all"
            data-testid="demo-close-button"
            aria-label="Close demo"
          >
            <X size={16} />
          </button>
        </div>
      )}
      
      {showReplayOverlay && (
        <div 
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300"
          data-testid="demo-replay-overlay"
        >
          <button
            onClick={handleReplay}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white/90 font-medium rounded-lg border border-white/20 hover:border-white/30 transition-all"
            data-testid="demo-replay-button"
          >
            <RotateCcw size={16} />
            Watch Again
          </button>
          <p className="mt-3 text-white/40 text-sm">See how easy sales can be</p>
        </div>
      )}
    </div>
  );
}

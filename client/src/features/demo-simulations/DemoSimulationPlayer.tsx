import { useEffect, useRef, useState, useCallback } from "react";
import { X, RotateCcw } from "lucide-react";

interface DemoSimulationPlayerProps {
  simulation: string;
  params?: Record<string, string | number>;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  onLoad?: () => void;
  onComplete?: () => void;
  onClose?: () => void;
  showControls?: boolean;
  responsive?: boolean;
  aspectRatio?: number;
}

export function DemoSimulationPlayer({
  simulation,
  params,
  width = 520,
  height = 520,
  autoPlay = true,
  loop = true,
  className = "",
  onLoad,
  onComplete,
  onClose,
  showControls = true,
  responsive = false,
  aspectRatio = 1,
}: DemoSimulationPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHoveringControls, setIsHoveringControls] = useState(false);
  const [showReplayOverlay, setShowReplayOverlay] = useState(false);

  const queryString = params 
    ? '?' + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
    : '';
  const src = `/static/demo-simulations/${simulation}.html${queryString}`;

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

  // Send postMessage when params change (for seamless content switching)
  useEffect(() => {
    if (isLoaded && iframeRef.current && params?.id) {
      iframeRef.current.contentWindow?.postMessage({ 
        type: 'changeShowcase', 
        id: params.id 
      }, '*');
    }
  }, [params?.id, isLoaded]);

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

  const containerStyle = responsive 
    ? { aspectRatio: aspectRatio, width: '100%' }
    : { width, height };

  return (
    <div
      className={`relative overflow-hidden ${responsive ? '' : 'rounded-2xl shadow-lg'} ${className}`}
      style={containerStyle}
      data-testid="demo-simulation-player"
      onMouseEnter={() => setIsHoveringControls(true)}
      onMouseLeave={() => setIsHoveringControls(false)}
    >
      <iframe
        ref={iframeRef}
        src={src}
        className="border-0 w-full h-full"
        title="Interactive Demo"
        loading="lazy"
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-black" />
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
        </div>
      )}
    </div>
  );
}

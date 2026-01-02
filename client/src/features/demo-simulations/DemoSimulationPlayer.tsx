import { useEffect, useRef, useState } from "react";

interface DemoSimulationPlayerProps {
  simulation: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  onLoad?: () => void;
  onComplete?: () => void;
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
}: DemoSimulationPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const src = `/static/demo-simulations/${simulation}.html`;

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

  return (
    <div
      className={`relative overflow-hidden rounded-2xl shadow-lg ${className}`}
      style={{ width, height }}
      data-testid="demo-simulation-player"
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
    </div>
  );
}

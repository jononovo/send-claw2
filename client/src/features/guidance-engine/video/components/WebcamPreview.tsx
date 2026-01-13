import { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WebcamPreviewProps {
  stream: MediaStream | null;
  isRecording: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function WebcamPreview({ stream, isRecording, error, onRetry }: WebcamPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      setIsLoaded(true);
    }
  }, [stream]);

  if (error) {
    return (
      <div className="relative w-[200px] h-[130px] rounded-lg overflow-hidden bg-gray-800 flex flex-col items-center justify-center p-2">
        <AlertCircle className="w-6 h-6 text-red-400 mb-2" />
        <p className="text-xs text-gray-300 text-center mb-2">Camera access denied</p>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} className="text-xs">
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="relative w-[200px] h-[130px] rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
        <VideoOff className="w-8 h-8 text-gray-500" />
      </div>
    );
  }

  return (
    <div className="relative w-[200px] h-[130px] rounded-lg overflow-hidden bg-black shadow-lg">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform scale-x-[-1]"
      />
      
      {isRecording && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-white font-medium">REC</span>
        </div>
      )}

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      <div className="absolute bottom-2 left-2 right-2">
        <p className="text-[10px] text-white/70 text-center">
          Use a solid-color background for best results
        </p>
      </div>
    </div>
  );
}

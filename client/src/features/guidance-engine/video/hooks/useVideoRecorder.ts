import { useState, useRef, useCallback } from 'react';

interface UseVideoRecorderOptions {
  mimeType?: string;
  videoBitsPerSecond?: number;
}

interface UseVideoRecorderReturn {
  isRecording: boolean;
  isPreviewing: boolean;
  videoBlob: Blob | null;
  stream: MediaStream | null;
  startPreview: () => Promise<void>;
  stopPreview: () => void;
  startRecording: () => void;
  stopRecording: () => Promise<Blob>;
  getStream: () => MediaStream | null;
  error: string | null;
}

export function useVideoRecorder(options: UseVideoRecorderOptions = {}): UseVideoRecorderReturn {
  const { 
    mimeType = 'video/webm;codecs=vp9',
    videoBitsPerSecond = 500000
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startPreview = useCallback(async () => {
    try {
      setError(null);
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: true
      });
      streamRef.current = newStream;
      setStream(newStream);
      setIsPreviewing(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera';
      setError(message);
      throw err;
    }
  }, []);

  const stopPreview = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setIsPreviewing(false);
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      setError('No stream available');
      return;
    }

    chunksRef.current = [];
    setVideoBlob(null);

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType,
      videoBitsPerSecond
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000);
    setIsRecording(true);
  }, [mimeType, videoBitsPerSecond]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        reject(new Error('No active recording'));
        return;
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setVideoBlob(blob);
        setIsRecording(false);
        resolve(blob);
      };

      mediaRecorder.stop();
    });
  }, [mimeType]);

  const getStream = useCallback(() => streamRef.current, []);

  return {
    isRecording,
    isPreviewing,
    videoBlob,
    stream,
    startPreview,
    stopPreview,
    startRecording,
    stopRecording,
    getStream,
    error
  };
}

# Guidance Video Recording - Technical Plan

## Executive Summary

Add optional video recording to the existing Challenge Recorder, allowing admins to record themselves talking through a challenge while clicking through the steps. Videos are processed server-side (background removal, resize, optimize) and played as ambient encouragement during challenge playback.

---

## Phase 1 Scope (MVP)

### What We're Building
1. **Video toggle in existing ChallengeRecorder** - "Include video" checkbox
2. **Webcam preview during recording** - Small preview in recorder UI
3. **Video upload after stop** - Upload raw video to server
4. **Server-side processing** - Background removal + resize + WebM conversion
5. **Floating video player** - Shows during challenge playback
6. **Timestamp capture** - Each step click stores video timestamp

### What We're NOT Building (Phase 1)
- ❌ Real-time background removal in browser
- ❌ Step-synced video playback (video pauses at each step)
- ❌ "Show-me" auto-advance mode
- ❌ Video editing/trimming UI
- ❌ Multiple takes/re-recording

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ChallengeRecorder (existing)                                           │
│  ├── [NEW] "Include video" toggle                                       │
│  ├── [NEW] WebcamPreview component (lazy loaded)                        │
│  └── [MODIFY] handleStopRecording → also uploads video blob             │
│                                                                          │
│  useGuidanceEngine (existing)                                           │
│  ├── [MODIFY] RecordingState → add videoBlob, videoStartTime            │
│  └── [MODIFY] RecordedStep → already has timestamp (reuse)              │
│                                                                          │
│  GuidanceContext (existing)                                             │
│  └── [NEW] GuidanceVideoPlayer component (floating, lazy loaded)        │
│                                                                          │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   │ POST /api/guidance/videos
                                   │ multipart/form-data
                                   │ { video: Blob, challengeId, questId, timestamps[] }
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              SERVER                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  server/features/guidance-video/                                        │
│  ├── routes.ts          POST /api/guidance/videos                       │
│  │                      GET  /api/guidance/videos/:id                   │
│  │                      GET  /api/guidance/challenges/:id/video         │
│  │                                                                       │
│  ├── processor.ts       Video processing pipeline                       │
│  │   ├── extractFrames()    FFmpeg → PNG frames                         │
│  │   ├── removeBackgrounds() rembg CLI on each frame                    │
│  │   ├── reassembleVideo()   FFmpeg → WebM VP9 alpha                    │
│  │   └── cleanup()           Remove temp files                          │
│  │                                                                       │
│  ├── storage.ts         File storage abstraction                        │
│  │   ├── saveRawVideo()                                                 │
│  │   ├── saveProcessedVideo()                                           │
│  │   └── getVideoUrl()                                                  │
│  │                                                                       │
│  └── types.ts           GuidanceVideo, VideoProcessingJob               │
│                                                                          │
│  Database (guidance_videos table)                                       │
│  └── id, challengeId, questId, status, rawPath, processedPath,          │
│      timestamps[], duration, createdAt, updatedAt                       │
│                                                                          │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   │ Processed videos served from
                                   │ /static/guidance-videos/
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           FILE STORAGE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  static/guidance-videos/                                                │
│  ├── raw/                    Original uploads (temp, deleted after)     │
│  │   └── {uuid}.webm                                                    │
│  ├── processed/              Final optimized videos                     │
│  │   └── {challengeId}.webm  200x130px, 12fps, VP9 alpha, ~1MB/min     │
│  └── frames/                 Temp frame extraction (auto-cleaned)       │
│      └── {uuid}/                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model Changes

### New Table: `guidance_videos`

```sql
CREATE TABLE guidance_videos (
  id SERIAL PRIMARY KEY,
  challenge_id VARCHAR(255) NOT NULL,      -- e.g., "first-search"
  quest_id VARCHAR(255) NOT NULL,          -- e.g., "finding-customers"
  
  status VARCHAR(50) DEFAULT 'pending',    -- pending, processing, completed, failed
  
  raw_path VARCHAR(500),                   -- Path to uploaded raw video
  processed_path VARCHAR(500),             -- Path to final optimized video
  
  timestamps JSONB DEFAULT '[]',           -- Array of step timestamps in seconds
  duration FLOAT,                          -- Total video duration in seconds
  file_size INTEGER,                       -- Final file size in bytes
  
  error_message TEXT,                      -- If processing failed
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_guidance_videos_challenge ON guidance_videos(challenge_id);
CREATE INDEX idx_guidance_videos_quest ON guidance_videos(quest_id);
```

### Type Additions

```typescript
// client/src/features/guidance-engine/types.ts

// Extend RecordingState
export interface RecordingState {
  isRecording: boolean;
  selectedQuestId: string | null;
  startRoute: string | null;
  steps: RecordedStep[];
  // NEW
  includeVideo: boolean;
  videoBlob: Blob | null;
  videoStartTime: number | null;  // Date.now() when recording started
}

// RecordedStep already has timestamp - we'll use it for video sync
export interface RecordedStep {
  selector: string;
  action: "click" | "type" | "view" | "hover";
  tagName: string;
  textContent?: string;
  typedValue?: string;
  route: string;
  timestamp: number;  // Already exists! This becomes video timestamp
}

// Extend Challenge type
export interface Challenge {
  // ... existing fields
  video?: {
    url: string;
    timestamps: number[];  // Seconds into video for each step
    duration: number;
  };
}
```

---

## Client Implementation

### 1. WebcamPreview Component (NEW)

**File:** `client/src/features/guidance-engine/video/components/WebcamPreview.tsx`

```typescript
// Lazy-loaded component - zero bundle impact when not recording
import { useEffect, useRef, useState } from "react";
import { Video, VideoOff } from "lucide-react";

interface WebcamPreviewProps {
  isRecording: boolean;
  onStreamReady: (stream: MediaStream) => void;
  onError: (error: string) => void;
}

export function WebcamPreview({ isRecording, onStreamReady, onError }: WebcamPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isRecording) return;

    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          },
          audio: true  // Include audio for encouragement
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
        onStreamReady(stream);
      } catch (err) {
        setHasPermission(false);
        onError(err instanceof Error ? err.message : "Camera access denied");
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording, onStreamReady, onError]);

  if (!isRecording) return null;

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
      {hasPermission === false ? (
        <div className="flex items-center justify-center h-24 text-gray-400 text-xs">
          <VideoOff className="w-4 h-4 mr-2" />
          Camera access denied
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-24 object-cover mirror"
        />
      )}
      <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded">
        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
        REC
      </div>
    </div>
  );
}
```

### 2. useVideoRecorder Hook (NEW)

**File:** `client/src/features/guidance-engine/video/hooks/useVideoRecorder.ts`

```typescript
import { useRef, useCallback, useState } from "react";

interface UseVideoRecorderReturn {
  isRecording: boolean;
  startRecording: (stream: MediaStream) => void;
  stopRecording: () => Promise<Blob | null>;
  recordingTime: number;
}

export function useVideoRecorder(): UseVideoRecorderReturn {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback((stream: MediaStream) => {
    chunksRef.current = [];
    
    // Prefer VP9 for better quality, fallback to VP8
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm;codecs=vp8,opus';

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 1000000,  // 1 Mbps - decent quality for talking head
      audioBitsPerSecond: 128000,
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000);  // Capture in 1-second chunks
    setIsRecording(true);

    // Timer for UI feedback
    timerRef.current = setInterval(() => {
      setRecordingTime(t => t + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        chunksRef.current = [];
        setIsRecording(false);
        setRecordingTime(0);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        resolve(blob);
      };

      mediaRecorder.stop();
      
      // Stop all tracks
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    });
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    recordingTime,
  };
}
```

### 3. Modify ChallengeRecorder

**File:** `client/src/features/guidance-engine/components/ChallengeRecorder.tsx`

Key changes:
- Add "Include video" checkbox in idle state
- Show WebcamPreview when recording with video
- Capture video blob on stop
- Upload video alongside challenge data

```typescript
// Add to imports (lazy loaded)
const WebcamPreview = lazy(() => 
  import('../video/components/WebcamPreview').then(m => ({ default: m.WebcamPreview }))
);

// Add state
const [includeVideo, setIncludeVideo] = useState(false);
const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
const { startRecording: startVideoRec, stopRecording: stopVideoRec, recordingTime } = useVideoRecorder();

// Modify handleStartRecording
const handleStartRecording = () => {
  // ... existing code
  if (includeVideo && videoStream) {
    startVideoRec(videoStream);
  }
};

// Modify handleStopRecording  
const handleStopRecording = async () => {
  const steps = stopRecording();
  let videoBlob: Blob | null = null;
  
  if (includeVideo) {
    videoBlob = await stopVideoRec();
  }
  
  setUIState("processing");
  
  try {
    // Generate challenge first
    const response = await fetch("/api/guidance/generate-challenge", { /* ... */ });
    const data = await response.json();
    
    // If we have video, upload it
    if (videoBlob && data.challenge) {
      const formData = new FormData();
      formData.append('video', videoBlob, 'recording.webm');
      formData.append('challengeId', data.challenge.id);
      formData.append('questId', selectedQuestId);
      formData.append('timestamps', JSON.stringify(
        steps.map(s => (s.timestamp - steps[0].timestamp) / 1000)  // Convert to seconds
      ));
      
      await fetch('/api/guidance/videos', {
        method: 'POST',
        body: formData,
      });
    }
    
    setGeneratedChallenge(data.challenge);
    setUIState("complete");
  } catch (err) {
    // ... error handling
  }
};

// In JSX - idle state
{uiState === "idle" && (
  <>
    {/* ... existing quest selector ... */}
    
    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
      <input
        type="checkbox"
        checked={includeVideo}
        onChange={(e) => setIncludeVideo(e.target.checked)}
        className="rounded border-gray-600 bg-gray-800"
      />
      <Video className="w-4 h-4" />
      Include video guide
    </label>
    
    {/* ... existing start button ... */}
  </>
)}

// In JSX - recording state
{uiState === "recording" && (
  <>
    {includeVideo && (
      <Suspense fallback={<div className="h-24 bg-gray-800 rounded animate-pulse" />}>
        <WebcamPreview
          isRecording={recording.isRecording}
          onStreamReady={setVideoStream}
          onError={(e) => console.error("Camera error:", e)}
        />
        <div className="text-xs text-gray-400 text-center">
          {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
        </div>
      </Suspense>
    )}
    {/* ... existing steps UI ... */}
  </>
)}
```

### 4. GuidanceVideoPlayer Component (NEW)

**File:** `client/src/features/guidance-engine/video/components/GuidanceVideoPlayer.tsx`

```typescript
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX } from "lucide-react";

interface GuidanceVideoPlayerProps {
  videoUrl: string;
  isVisible: boolean;
  onClose: () => void;
}

export function GuidanceVideoPlayer({ videoUrl, isVisible, onClose }: GuidanceVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);  // Start muted for autoplay
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isVisible && videoRef.current && isLoaded) {
      videoRef.current.play().catch(() => {
        // Autoplay blocked - that's ok, video still visible
      });
    }
  }, [isVisible, isLoaded]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        className="fixed bottom-24 left-6 z-[9998]"
      >
        <div className="relative rounded-xl overflow-hidden shadow-2xl border border-gray-700 bg-transparent">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-1 right-1 z-10 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
          
          {/* Mute toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="absolute bottom-1 right-1 z-10 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          </button>

          {/* Video */}
          <video
            ref={videoRef}
            src={videoUrl}
            muted={isMuted}
            loop
            playsInline
            onLoadedData={() => setIsLoaded(true)}
            className="w-[200px] h-[130px] object-cover"
            style={{ background: 'transparent' }}
          />
          
          {/* Loading state */}
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## Server Implementation

### 1. Video Routes

**File:** `server/features/guidance-video/routes.ts`

```typescript
import express, { type Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { storage } from "../../storage";
import { getUserId } from "../../utils/auth";
import { processVideo } from "./processor";
import { VIDEO_CONFIG } from "./config";

const upload = multer({
  storage: multer.diskStorage({
    destination: VIDEO_CONFIG.RAW_DIR,
    filename: (req, file, cb) => {
      cb(null, `${uuidv4()}.webm`);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024,  // 100MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

export function registerGuidanceVideoRoutes(app: Express) {
  
  // Upload and process a guidance video
  app.post("/api/guidance/videos", upload.single('video'), async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const isDev = process.env.NODE_ENV !== 'production';
      
      // Only allow in dev or for admins
      if (!isDev && userId !== 1) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No video file provided" });
      }

      const { challengeId, questId, timestamps } = req.body;
      
      if (!challengeId || !questId) {
        return res.status(400).json({ message: "challengeId and questId required" });
      }

      const parsedTimestamps = timestamps ? JSON.parse(timestamps) : [];

      // Create database record
      const videoRecord = await storage.createGuidanceVideo({
        challengeId,
        questId,
        rawPath: req.file.path,
        timestamps: parsedTimestamps,
        status: 'processing',
        createdBy: userId,
      });

      // Process video asynchronously
      processVideo(videoRecord.id, req.file.path, challengeId)
        .then(async (result) => {
          await storage.updateGuidanceVideo(videoRecord.id, {
            status: 'completed',
            processedPath: result.outputPath,
            duration: result.duration,
            fileSize: result.fileSize,
          });
        })
        .catch(async (error) => {
          console.error(`[GuidanceVideo] Processing failed:`, error);
          await storage.updateGuidanceVideo(videoRecord.id, {
            status: 'failed',
            errorMessage: error.message,
          });
        });

      res.json({
        id: videoRecord.id,
        status: 'processing',
        message: 'Video upload received, processing started',
      });

    } catch (error) {
      console.error("[GuidanceVideo] Upload error:", error);
      res.status(500).json({ message: "Failed to upload video" });
    }
  });

  // Get video status
  app.get("/api/guidance/videos/:id", async (req: Request, res: Response) => {
    try {
      const video = await storage.getGuidanceVideo(parseInt(req.params.id));
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      res.json({
        id: video.id,
        status: video.status,
        url: video.status === 'completed' 
          ? `/static/guidance-videos/processed/${video.challengeId}.webm`
          : null,
        duration: video.duration,
        timestamps: video.timestamps,
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to get video" });
    }
  });

  // Get video for a challenge
  app.get("/api/guidance/challenges/:challengeId/video", async (req: Request, res: Response) => {
    try {
      const video = await storage.getGuidanceVideoByChallenge(req.params.challengeId);
      
      if (!video || video.status !== 'completed') {
        return res.status(404).json({ message: "No video available" });
      }

      res.json({
        url: `/static/guidance-videos/processed/${video.challengeId}.webm`,
        duration: video.duration,
        timestamps: video.timestamps,
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to get video" });
    }
  });
}
```

### 2. Video Processor

**File:** `server/features/guidance-video/processor.ts`

```typescript
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { VIDEO_CONFIG } from "./config";

const execAsync = promisify(exec);

interface ProcessingResult {
  outputPath: string;
  duration: number;
  fileSize: number;
}

export async function processVideo(
  videoId: number,
  inputPath: string,
  challengeId: string
): Promise<ProcessingResult> {
  const workDir = path.join(VIDEO_CONFIG.FRAMES_DIR, `job_${videoId}`);
  const framesDir = path.join(workDir, 'frames');
  const cleanFramesDir = path.join(workDir, 'clean');
  const outputPath = path.join(VIDEO_CONFIG.PROCESSED_DIR, `${challengeId}.webm`);

  try {
    // Create work directories
    await fs.mkdir(framesDir, { recursive: true });
    await fs.mkdir(cleanFramesDir, { recursive: true });
    await fs.mkdir(VIDEO_CONFIG.PROCESSED_DIR, { recursive: true });

    console.log(`[VideoProcessor] Starting processing for video ${videoId}`);

    // Step 1: Extract frames at 12fps
    console.log(`[VideoProcessor] Extracting frames...`);
    await execAsync(
      `ffmpeg -i "${inputPath}" -vf "fps=12,scale=200:130" "${framesDir}/%04d.png"`,
      { timeout: 300000 }  // 5 min timeout
    );

    // Count frames
    const frameFiles = await fs.readdir(framesDir);
    const frameCount = frameFiles.filter(f => f.endsWith('.png')).length;
    console.log(`[VideoProcessor] Extracted ${frameCount} frames`);

    // Step 2: Remove backgrounds using rembg
    console.log(`[VideoProcessor] Removing backgrounds...`);
    await execAsync(
      `rembg p "${framesDir}" "${cleanFramesDir}"`,
      { timeout: 600000 }  // 10 min timeout for background removal
    );

    // Step 3: Reassemble with VP9 alpha
    console.log(`[VideoProcessor] Reassembling video with alpha...`);
    await execAsync(
      `ffmpeg -y -framerate 12 -i "${cleanFramesDir}/%04d.png" ` +
      `-c:v libvpx-vp9 -pix_fmt yuva420p -crf 45 -b:v 0 ` +
      `-deadline good -cpu-used 4 -an "${outputPath}"`,
      { timeout: 300000 }
    );

    // Get video info
    const { stdout: probeOutput } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format "${outputPath}"`
    );
    const probeData = JSON.parse(probeOutput);
    const duration = parseFloat(probeData.format.duration);

    // Get file size
    const stats = await fs.stat(outputPath);
    const fileSize = stats.size;

    console.log(`[VideoProcessor] Completed: ${duration}s, ${(fileSize/1024/1024).toFixed(2)}MB`);

    // Cleanup
    await fs.rm(workDir, { recursive: true, force: true });
    await fs.rm(inputPath, { force: true });  // Remove raw upload

    return { outputPath, duration, fileSize };

  } catch (error) {
    // Cleanup on error
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}
```

### 3. Configuration

**File:** `server/features/guidance-video/config.ts`

```typescript
import path from "path";

const BASE_DIR = path.join(process.cwd(), 'static', 'guidance-videos');

export const VIDEO_CONFIG = {
  RAW_DIR: path.join(BASE_DIR, 'raw'),
  PROCESSED_DIR: path.join(BASE_DIR, 'processed'),
  FRAMES_DIR: path.join(BASE_DIR, 'frames'),
  
  // Output specs
  OUTPUT_WIDTH: 200,
  OUTPUT_HEIGHT: 130,
  OUTPUT_FPS: 12,
  
  // Processing limits
  MAX_DURATION_SECONDS: 180,  // 3 minutes max
  MAX_FILE_SIZE_MB: 100,
};
```

### 4. Storage Methods

Add to `server/storage.ts`:

```typescript
// Guidance Videos
async createGuidanceVideo(data: InsertGuidanceVideo): Promise<GuidanceVideo> {
  const [video] = await db.insert(guidanceVideos).values(data).returning();
  return video;
}

async getGuidanceVideo(id: number): Promise<GuidanceVideo | undefined> {
  const [video] = await db.select().from(guidanceVideos).where(eq(guidanceVideos.id, id));
  return video;
}

async getGuidanceVideoByChallenge(challengeId: string): Promise<GuidanceVideo | undefined> {
  const [video] = await db
    .select()
    .from(guidanceVideos)
    .where(eq(guidanceVideos.challengeId, challengeId))
    .orderBy(desc(guidanceVideos.createdAt))
    .limit(1);
  return video;
}

async updateGuidanceVideo(id: number, data: Partial<GuidanceVideo>): Promise<void> {
  await db.update(guidanceVideos).set({ ...data, updatedAt: new Date() }).where(eq(guidanceVideos.id, id));
}
```

---

## File Structure

```
client/src/features/guidance-engine/
├── video/                              # NEW directory
│   ├── components/
│   │   ├── WebcamPreview.tsx          # Camera preview during recording
│   │   └── GuidanceVideoPlayer.tsx    # Floating player during playback
│   ├── hooks/
│   │   └── useVideoRecorder.ts        # MediaRecorder wrapper
│   ├── api/
│   │   └── uploadVideo.ts             # Upload function
│   └── index.ts                        # Exports
├── components/
│   └── ChallengeRecorder.tsx          # MODIFIED - add video toggle
├── hooks/
│   └── useGuidanceEngine.ts           # MODIFIED - recording state
├── context/
│   └── GuidanceContext.tsx            # MODIFIED - video player integration
└── types.ts                            # MODIFIED - new types

server/features/guidance-video/         # NEW directory
├── routes.ts                           # API endpoints
├── processor.ts                        # FFmpeg + rembg pipeline
├── config.ts                           # Configuration
├── types.ts                            # TypeScript types
└── index.ts                            # Module exports

static/guidance-videos/                 # NEW directory
├── raw/                                # Temp uploads
├── processed/                          # Final videos
└── frames/                             # Temp frame extraction
```

---

## Dependencies

### New NPM Packages
```json
{
  "multer": "^1.4.5-lts.1",      // File upload handling (may already exist)
  "uuid": "^9.0.0"               // Unique IDs (may already exist)
}
```

### System Dependencies (Server)
```bash
# Already have ImageMagick, need to add:
apt-get install ffmpeg python3-pip
pip install rembg[cli] onnxruntime
```

---

## Migration

```sql
-- migrations/add_guidance_videos.sql

CREATE TABLE IF NOT EXISTS guidance_videos (
  id SERIAL PRIMARY KEY,
  challenge_id VARCHAR(255) NOT NULL,
  quest_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  raw_path VARCHAR(500),
  processed_path VARCHAR(500),
  timestamps JSONB DEFAULT '[]',
  duration FLOAT,
  file_size INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_guidance_videos_challenge ON guidance_videos(challenge_id);
CREATE INDEX idx_guidance_videos_quest ON guidance_videos(quest_id);
```

---

## Testing Plan

### Manual Testing Checklist

1. **Recording Flow**
   - [ ] "Include video" toggle appears
   - [ ] Webcam preview shows when enabled
   - [ ] Recording indicator visible
   - [ ] Steps still record correctly
   - [ ] Video uploads after stop

2. **Processing**
   - [ ] Video status shows "processing"
   - [ ] Background removal works
   - [ ] Output is small (~1MB/min)
   - [ ] Output has transparency

3. **Playback**
   - [ ] Video player appears during challenge
   - [ ] Can close/reopen player
   - [ ] Audio mute/unmute works
   - [ ] Video loops

4. **Edge Cases**
   - [ ] Camera permission denied
   - [ ] Very long recording (>3min)
   - [ ] Processing failure recovery
   - [ ] No video for challenge

---

## Rollout Plan

1. **Development** - Build and test locally
2. **Staging** - Test with real challenges
3. **Production (Limited)** - Enable for admin only
4. **Production (Full)** - Enable for all users viewing challenges with video

---

## Future Enhancements (Post-MVP)

- Step-synced playback (pause at each step)
- "Show-me" auto-advance mode
- Video trimming UI
- Multiple takes/re-recording
- CDN storage for videos
- Video analytics (watch time, skip patterns)

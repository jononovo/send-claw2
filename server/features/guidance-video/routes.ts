import express, { type Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { nanoid } from "nanoid";
import { storage } from "../../storage";
import { getUserId } from "../../utils/auth";
import { processVideoSimple } from "./processor";
import { VIDEO_CONFIG } from "./config";
import * as fs from "fs/promises";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      await fs.mkdir(VIDEO_CONFIG.RAW_DIR, { recursive: true });
      cb(null, VIDEO_CONFIG.RAW_DIR);
    },
    filename: (req, file, cb) => {
      cb(null, `${nanoid()}.webm`);
    },
  }),
  limits: {
    fileSize: VIDEO_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

function getBucketName(): string {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) {
    throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
  }
  return bucketId;
}

async function getSignedVideoUrl(objectPath: string): Promise<string> {
  const bucketName = getBucketName();
  const request = {
    bucket_name: bucketName,
    object_name: objectPath,
    method: "GET",
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  };
  
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to sign video URL: ${response.status}`);
  }
  
  const { signed_url } = await response.json();
  return signed_url;
}

export function registerGuidanceVideoRoutes(app: Express) {
  
  app.post("/api/guidance/videos", upload.single('video'), async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const isDev = process.env.NODE_ENV !== 'production';
      
      if (!isDev && userId === 1) {
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

      const videoRecord = await storage.createGuidanceVideo({
        challengeId,
        questId,
        rawPath: req.file.path,
        timestamps: parsedTimestamps,
        status: 'processing',
        createdBy: userId,
      });

      processVideoSimple(videoRecord.id, req.file.path, challengeId)
        .then(async (result) => {
          await storage.updateGuidanceVideo(videoRecord.id, {
            status: 'completed',
            processedPath: result.outputPath,
            objectPath: result.objectPath,
            duration: result.duration,
            fileSize: result.fileSize,
          });
          console.log(`[GuidanceVideo] Processing completed for video ${videoRecord.id}`);
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

  app.get("/api/guidance/videos/:id", async (req: Request, res: Response) => {
    try {
      const video = await storage.getGuidanceVideo(parseInt(req.params.id));
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      let url: string | null = null;
      if (video.status === 'completed' && video.objectPath) {
        url = await getSignedVideoUrl(video.objectPath);
      }

      res.json({
        id: video.id,
        status: video.status,
        url,
        duration: video.duration,
        timestamps: video.timestamps,
      });

    } catch (error) {
      console.error("[GuidanceVideo] Get video error:", error);
      res.status(500).json({ message: "Failed to get video" });
    }
  });

  app.get("/api/guidance/challenges/:challengeId/video", async (req: Request, res: Response) => {
    try {
      const video = await storage.getGuidanceVideoByChallenge(req.params.challengeId);
      
      if (!video || video.status !== 'completed') {
        return res.status(404).json({ message: "No video available" });
      }

      if (!video.objectPath) {
        return res.status(404).json({ message: "Video file not available" });
      }

      const url = await getSignedVideoUrl(video.objectPath);

      res.json({
        url,
        duration: video.duration,
        timestamps: video.timestamps,
      });

    } catch (error) {
      console.error("[GuidanceVideo] Get challenge video error:", error);
      res.status(500).json({ message: "Failed to get video" });
    }
  });
}

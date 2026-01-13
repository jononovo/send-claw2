import express, { type Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { nanoid } from "nanoid";
import { storage } from "../../storage";
import { getUserId } from "../../utils/auth";
import { processVideoSimple } from "./processor";
import { VIDEO_CONFIG } from "./config";
import * as fs from "fs/promises";

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

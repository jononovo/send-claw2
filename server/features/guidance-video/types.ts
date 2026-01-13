export interface ProcessingResult {
  outputPath: string;
  objectPath: string; // Path in App Storage
  duration: number;
  fileSize: number;
}

export interface VideoProcessingJob {
  videoId: number;
  inputPath: string;
  challengeId: string;
}

export type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ProcessingResult {
  outputPath: string;
  duration: number;
  fileSize: number;
}

export interface VideoProcessingJob {
  videoId: number;
  inputPath: string;
  challengeId: string;
}

export type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed';

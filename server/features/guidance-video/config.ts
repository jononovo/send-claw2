import path from "path";

const BASE_DIR = path.join(process.cwd(), 'static', 'guidance-videos');

export const VIDEO_CONFIG = {
  RAW_DIR: path.join(BASE_DIR, 'raw'),
  PROCESSED_DIR: path.join(BASE_DIR, 'processed'),
  FRAMES_DIR: path.join(BASE_DIR, 'frames'),
  
  OUTPUT_WIDTH: 200,
  OUTPUT_HEIGHT: 130,
  OUTPUT_FPS: 12,
  
  MAX_DURATION_SECONDS: 180,
  MAX_FILE_SIZE_MB: 100,
  
  CHROMA_KEY_COLOR: '0x00FF00',
  CHROMA_KEY_SIMILARITY: 0.3,
  CHROMA_KEY_BLEND: 0.1,
};

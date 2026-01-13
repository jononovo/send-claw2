import { apiRequest } from '@/lib/queryClient';

interface UploadVideoParams {
  videoBlob: Blob;
  challengeId: string;
  questId: string;
  timestamps?: { stepIndex: number; timestamp: number; action: string }[];
}

interface UploadVideoResponse {
  id: number;
  status: 'processing' | 'completed' | 'failed';
  message: string;
}

export async function uploadGuidanceVideo({
  videoBlob,
  challengeId,
  questId,
  timestamps = []
}: UploadVideoParams): Promise<UploadVideoResponse> {
  const formData = new FormData();
  formData.append('video', videoBlob, 'recording.webm');
  formData.append('challengeId', challengeId);
  formData.append('questId', questId);
  formData.append('timestamps', JSON.stringify(timestamps));

  const response = await fetch('/api/guidance/videos', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || 'Failed to upload video');
  }

  return response.json();
}

export async function getVideoStatus(videoId: number): Promise<{
  id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url: string | null;
  duration: number | null;
  timestamps: any[];
}> {
  const response = await fetch(`/api/guidance/videos/${videoId}`, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to get video status');
  }

  return response.json();
}

export async function getChallengeVideo(challengeId: string): Promise<{
  url: string;
  duration: number;
  timestamps: any[];
} | null> {
  try {
    const response = await fetch(`/api/guidance/challenges/${challengeId}/video`, {
      credentials: 'include'
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error('Failed to get challenge video');
    }

    return response.json();
  } catch {
    return null;
  }
}

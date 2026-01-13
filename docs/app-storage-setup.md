# App Storage (Replit Object Storage) Setup

**Overview**: App Storage is Replit's GCS-backed object storage for persistent file storage. Used for guidance video uploads.

## Environment Variables

These are automatically set when you run the `setup_object_storage` tool in Replit:

- `DEFAULT_OBJECT_STORAGE_BUCKET_ID`: The bucket name (e.g., `replit-objstore-xxx`)
- `PUBLIC_OBJECT_SEARCH_PATHS`: Comma-separated paths for public assets
- `PRIVATE_OBJECT_DIR`: Directory for private objects

## Integration Location

`server/replit_integrations/object_storage/objectStorage.ts`

## Usage Pattern

```typescript
import { objectStorageClient } from "../../replit_integrations/object_storage";

// Get bucket name from environment
const bucketName = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
const bucket = objectStorageClient.bucket(bucketName);

// Upload a file
await bucket.upload(localFilePath, {
  destination: 'guidance-videos/video-id.webm',
  contentType: 'video/webm',
  metadata: { cacheControl: 'public, max-age=31536000' },
});

// Generate public URL (files are publicly accessible)
const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectPath}`;

// Stream a file (for proxying)
const file = bucket.file(objectPath);
const [exists] = await file.exists();
file.createReadStream().pipe(response);
```

## Database Schema Pattern

- Add `objectPath TEXT` column to store the cloud path
- Keep legacy `processedPath` for backward compatibility
- Routes should check `objectPath` first, fall back to local path

## Implementation Example (Guidance Videos)

1. **Schema** (`shared/schema.ts`): Added `objectPath` column to `guidance_videos` table
2. **Processor** (`server/features/guidance-video/processor.ts`): After FFmpeg processing, uploads to App Storage, returns `objectPath`
3. **Routes** (`server/features/guidance-video/routes.ts`): Returns GCS public URL if `objectPath` exists, else falls back to local static path
4. **Cleanup**: Local temp files are deleted after successful upload

## Security Notes

- Files uploaded to App Storage are publicly readable via GCS URLs
- Do NOT create proxy/streaming endpoints that expose arbitrary bucket paths
- Use specific object paths (e.g., `guidance-videos/`) to namespace content

export type ImageUploadKind =
  | 'user_avatar'
  | 'project_image'
  | 'portfolio_image';

export type ImageContentType = 'image/jpeg' | 'image/png' | 'image/webp';

export type ImageUploadStatus =
  | 'awaiting_upload'
  | 'queued'
  | 'processing'
  | 'ready'
  | 'attached'
  | 'failed'
  | 'expired'
  | 'superseded';

export interface ImageUploadCreateRequest {
  kind: ImageUploadKind;
  target_id?: number;
  content_type: ImageContentType;
  size_bytes: number;
}

export interface ImageUploadCreateResponse {
  upload_id: string;
  status: ImageUploadStatus;
  expires_at: string;
  upload_url: string;
  upload_fields: Record<string, string>;
}

export interface ImageUploadConfirmResponse {
  upload_id: string;
  status: ImageUploadStatus;
}

export interface ImageUploadStatusResponse {
  upload_id: string;
  kind: ImageUploadKind;
  status: ImageUploadStatus;
  image_url: string | null;
  thumbnail_url: string | null;
  error_code: string | null;
  error_message: string;
}

export interface ImageUploadInput {
  kind: ImageUploadKind;
  targetId?: number;
  file: File;
}

export type ImageUploadStage =
  | 'idle'
  | 'creating'
  | 'uploading'
  | 'confirming'
  | 'processing'
  | 'attaching'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ImageUploadProgress {
  stage: ImageUploadStage;
  uploadId: string | null;
  status: ImageUploadStatus | null;
}

export interface ImageUploadOptions {
  signal?: AbortSignal;
  pollIntervalMs?: number;
  timeoutMs?: number;
  onProgress?: (progress: ImageUploadProgress) => void;
}

export type ImageUploadErrorCode =
  | 'invalid_file'
  | 'storage_upload_failed'
  | 'processing_failed'
  | 'expired'
  | 'superseded'
  | 'unexpected_status'
  | 'polling_timeout'
  | 'cancelled';

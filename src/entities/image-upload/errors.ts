import type { ImageUploadErrorCode } from './types';

interface ImageUploadErrorOptions {
  status?: number;
  backendCode?: string | null;
  cause?: unknown;
}

export class ImageUploadError extends Error {
  readonly code: ImageUploadErrorCode;
  readonly status?: number;
  readonly backendCode?: string | null;

  constructor(
    code: ImageUploadErrorCode,
    message: string,
    options: ImageUploadErrorOptions = {}
  ) {
    super(message, { cause: options.cause });
    this.name = 'ImageUploadError';
    this.code = code;
    this.status = options.status;
    this.backendCode = options.backendCode;
  }
}

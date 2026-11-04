import type { Api } from '@shared/api/api.class';
import { IMAGE_UPLOADS } from '@shared/api/constants';
import { ImageUploadError } from './errors';
import type {
  ImageContentType,
  ImageUploadConfirmResponse,
  ImageUploadCreateRequest,
  ImageUploadCreateResponse,
  ImageUploadInput,
  ImageUploadKind,
  ImageUploadOptions,
  ImageUploadProgress,
  ImageUploadStatus,
  ImageUploadStatusResponse,
} from './types';

const DEFAULT_POLL_INTERVAL_MS = 1_500;
const DEFAULT_POLL_TIMEOUT_MS = 2 * 60 * 1_000;

const IMAGE_UPLOAD_LIMITS: Record<ImageUploadKind, number> = {
  user_avatar: 1 * 1024 * 1024,
  project_image: 2 * 1024 * 1024,
  portfolio_image: 2 * 1024 * 1024,
};

const ALLOWED_CONTENT_TYPES = new Set<ImageContentType>([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

const isPendingStatus = (status: ImageUploadStatus): boolean =>
  status === 'queued' || status === 'processing';

const createCancelledError = () =>
  new ImageUploadError('cancelled', 'Загрузка изображения отменена.');

const throwIfCancelled = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw createCancelledError();
};

const wait = (delayMs: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    throwIfCancelled(signal);

    const handleAbort = () => {
      window.clearTimeout(timeoutId);
      reject(createCancelledError());
    };

    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, delayMs);

    signal?.addEventListener('abort', handleAbort, { once: true });
  });

const getOperationKey = ({ kind, targetId }: ImageUploadInput): string =>
  `${kind}:${targetId ?? 'current-user'}`;

export class ImageUploadService {
  private readonly api: Api;
  private readonly fetcher: Fetcher;
  private readonly activeUploads = new Map<
    string,
    Promise<ImageUploadStatusResponse>
  >();

  constructor(
    api: Api,
    fetcher: Fetcher = (input, init) => fetch(input, init)
  ) {
    this.api = api;
    this.fetcher = fetcher;
  }

  create(data: ImageUploadCreateRequest): Promise<ImageUploadCreateResponse> {
    return this.api.post<ImageUploadCreateResponse>(IMAGE_UPLOADS, data);
  }

  async uploadToStorage(
    session: ImageUploadCreateResponse,
    file: File,
    signal?: AbortSignal
  ): Promise<void> {
    throwIfCancelled(signal);

    const formData = new FormData();
    Object.entries(session.upload_fields).forEach(([name, value]) => {
      formData.append(name, value);
    });
    formData.append('file', file);

    let response: Response;
    try {
      response = await this.fetcher(session.upload_url, {
        method: 'POST',
        body: formData,
        signal,
      });
    } catch (error) {
      if (signal?.aborted) throw createCancelledError();
      throw new ImageUploadError(
        'storage_upload_failed',
        'Не удалось загрузить изображение в Object Storage.',
        { cause: error }
      );
    }

    if (!response.ok) {
      throw new ImageUploadError(
        'storage_upload_failed',
        `Object Storage отклонил загрузку (${response.status}).`,
        { status: response.status }
      );
    }
  }

  confirm(uploadId: string): Promise<ImageUploadConfirmResponse> {
    return this.api.post<ImageUploadConfirmResponse>(
      `${IMAGE_UPLOADS}${uploadId}/confirm/`
    );
  }

  getStatus(uploadId: string): Promise<ImageUploadStatusResponse> {
    return this.api.get<ImageUploadStatusResponse>(
      `${IMAGE_UPLOADS}${uploadId}/`
    );
  }

  attach(uploadId: string): Promise<ImageUploadStatusResponse> {
    return this.api.post<ImageUploadStatusResponse>(
      `${IMAGE_UPLOADS}${uploadId}/attach/`
    );
  }

  uploadAndAttach(
    input: ImageUploadInput,
    options: ImageUploadOptions = {}
  ): Promise<ImageUploadStatusResponse> {
    const operationKey = getOperationKey(input);
    const activeUpload = this.activeUploads.get(operationKey);
    if (activeUpload) return activeUpload;

    const operation = this.runUpload(input, options).finally(() => {
      if (this.activeUploads.get(operationKey) === operation) {
        this.activeUploads.delete(operationKey);
      }
    });
    this.activeUploads.set(operationKey, operation);
    return operation;
  }

  private async runUpload(
    input: ImageUploadInput,
    options: ImageUploadOptions
  ): Promise<ImageUploadStatusResponse> {
    this.validateInput(input);
    throwIfCancelled(options.signal);

    const emitProgress = (
      stage: ImageUploadProgress['stage'],
      uploadId: string | null,
      status: ImageUploadStatus | null
    ) => options.onProgress?.({ stage, uploadId, status });

    emitProgress('creating', null, null);
    const session = await this.create({
      kind: input.kind,
      ...(input.targetId === undefined ? {} : { target_id: input.targetId }),
      content_type: input.file.type as ImageContentType,
      size_bytes: input.file.size,
    });
    throwIfCancelled(options.signal);

    emitProgress('uploading', session.upload_id, session.status);
    await this.uploadToStorage(session, input.file, options.signal);
    throwIfCancelled(options.signal);

    emitProgress('confirming', session.upload_id, session.status);
    const confirmation = await this.confirm(session.upload_id);
    throwIfCancelled(options.signal);

    const readyUpload = await this.pollUntilReady(
      session.upload_id,
      confirmation.status,
      options,
      emitProgress
    );
    throwIfCancelled(options.signal);

    if (readyUpload.status === 'attached') {
      emitProgress('completed', readyUpload.upload_id, readyUpload.status);
      return readyUpload;
    }

    emitProgress('attaching', readyUpload.upload_id, readyUpload.status);
    const attachedUpload = await this.attach(readyUpload.upload_id);

    if (attachedUpload.status !== 'attached') {
      throw new ImageUploadError(
        'unexpected_status',
        `Неожиданный статус после attach: ${attachedUpload.status}.`
      );
    }

    emitProgress('completed', attachedUpload.upload_id, attachedUpload.status);
    return attachedUpload;
  }

  private async pollUntilReady(
    uploadId: string,
    initialStatus: ImageUploadStatus,
    options: ImageUploadOptions,
    emitProgress: (
      stage: ImageUploadProgress['stage'],
      uploadId: string,
      status: ImageUploadStatus
    ) => void
  ): Promise<ImageUploadStatusResponse> {
    const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const timeoutMs = options.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS;
    const deadline = Date.now() + timeoutMs;
    let currentStatus = initialStatus;

    if (currentStatus === 'ready' || currentStatus === 'attached') {
      return this.getStatus(uploadId);
    }

    while (isPendingStatus(currentStatus)) {
      throwIfCancelled(options.signal);
      if (Date.now() >= deadline) {
        throw new ImageUploadError(
          'polling_timeout',
          'Обработка изображения заняла слишком много времени.'
        );
      }

      emitProgress('processing', uploadId, currentStatus);
      await wait(
        Math.max(1, Math.min(pollIntervalMs, deadline - Date.now())),
        options.signal
      );
      const upload = await this.getStatus(uploadId);
      currentStatus = upload.status;

      if (upload.status === 'ready' || upload.status === 'attached') {
        return upload;
      }
      if (upload.status === 'failed') {
        throw new ImageUploadError(
          'processing_failed',
          upload.error_message || 'Не удалось обработать изображение.',
          { backendCode: upload.error_code }
        );
      }
      if (upload.status === 'expired') {
        throw new ImageUploadError('expired', 'Срок действия загрузки истёк.');
      }
      if (upload.status === 'superseded') {
        throw new ImageUploadError(
          'superseded',
          'Загрузка была заменена другим изображением.'
        );
      }
      if (upload.status === 'awaiting_upload') {
        throw new ImageUploadError(
          'unexpected_status',
          'Backend не подтвердил загрузку изображения.'
        );
      }
    }

    throw new ImageUploadError(
      'unexpected_status',
      `Неожиданный статус обработки: ${currentStatus}.`
    );
  }

  private validateInput({ kind, targetId, file }: ImageUploadInput): void {
    if (!ALLOWED_CONTENT_TYPES.has(file.type as ImageContentType)) {
      throw new ImageUploadError(
        'invalid_file',
        'Поддерживаются только JPEG, PNG и WebP.'
      );
    }

    if (file.size <= 0) {
      throw new ImageUploadError(
        'invalid_file',
        'Нельзя загрузить пустой файл.'
      );
    }

    if (file.size > IMAGE_UPLOAD_LIMITS[kind]) {
      throw new ImageUploadError(
        'invalid_file',
        'Размер изображения превышает допустимый лимит.'
      );
    }

    if (kind === 'user_avatar' && targetId !== undefined) {
      throw new ImageUploadError(
        'invalid_file',
        'Для аватара targetId не используется.'
      );
    }

    if (kind !== 'user_avatar' && targetId === undefined) {
      throw new ImageUploadError(
        'invalid_file',
        'Для изображения проекта или портфолио нужен targetId.'
      );
    }

    if (
      kind !== 'user_avatar' &&
      (!Number.isInteger(targetId) || (targetId ?? 0) <= 0)
    ) {
      throw new ImageUploadError(
        'invalid_file',
        'targetId должен быть положительным целым числом.'
      );
    }
  }
}

import { getServices } from '@app';
import {
  ImageUploadError,
  ImageUploadService,
  type ImageUploadInput,
  type ImageUploadProgress,
  type ImageUploadStage,
  type ImageUploadStatusResponse,
} from '@entities/image-upload';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const initialProgress: ImageUploadProgress = {
  stage: 'idle',
  uploadId: null,
  status: null,
};

export interface UseImageUploadOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export interface ImageUploadState extends ImageUploadProgress {
  previewUrl: string | null;
  result: ImageUploadStatusResponse | null;
  error: Error | null;
}

export interface UseImageUploadResult extends ImageUploadState {
  isUploading: boolean;
  startUpload: (
    input: ImageUploadInput
  ) => Promise<ImageUploadStatusResponse | null>;
  cancelUpload: () => void;
  reset: () => void;
}

const activeStages = new Set<ImageUploadStage>([
  'creating',
  'uploading',
  'confirming',
  'processing',
  'attaching',
]);

const getError = (error: unknown): Error =>
  error instanceof Error
    ? error
    : new Error('Не удалось загрузить изображение.');

export const useImageUpload = (
  options: UseImageUploadOptions = {}
): UseImageUploadResult => {
  const { api } = getServices();
  const service = useMemo(() => new ImageUploadService(api), [api]);
  const [state, setState] = useState<ImageUploadState>({
    ...initialProgress,
    previewUrl: null,
    result: null,
    error: null,
  });
  const mountedRef = useRef(false);
  const previewUrlRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const activePromiseRef =
    useRef<Promise<ImageUploadStatusResponse | null> | null>(null);

  const revokePreview = useCallback(() => {
    if (!previewUrlRef.current) return;
    URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
      revokePreview();
    };
  }, [revokePreview]);

  const startUpload = useCallback(
    (input: ImageUploadInput) => {
      if (activePromiseRef.current) return activePromiseRef.current;

      revokePreview();
      const previewUrl = URL.createObjectURL(input.file);
      previewUrlRef.current = previewUrl;
      const controller = new AbortController();
      controllerRef.current = controller;

      setState({
        ...initialProgress,
        stage: 'creating',
        previewUrl,
        result: null,
        error: null,
      });

      const operation = service
        .uploadAndAttach(input, {
          signal: controller.signal,
          pollIntervalMs: options.pollIntervalMs,
          timeoutMs: options.timeoutMs,
          onProgress: ({ stage, uploadId, status }) => {
            if (!mountedRef.current) return;
            setState((current) => ({
              ...current,
              stage,
              uploadId,
              status,
            }));
          },
        })
        .then((result) => {
          if (mountedRef.current) {
            setState((current) => ({
              ...current,
              stage: 'completed',
              uploadId: result.upload_id,
              status: result.status,
              result,
              error: null,
            }));
          }
          return result;
        })
        .catch((error: unknown) => {
          if (mountedRef.current) {
            const cancelled =
              error instanceof ImageUploadError && error.code === 'cancelled';
            setState((current) => ({
              ...current,
              stage: cancelled ? 'cancelled' : 'failed',
              error: cancelled ? null : getError(error),
            }));
          }
          return null;
        })
        .finally(() => {
          if (controllerRef.current === controller) {
            controllerRef.current = null;
          }
          if (activePromiseRef.current === operation) {
            activePromiseRef.current = null;
          }
        });

      activePromiseRef.current = operation;
      return operation;
    },
    [options.pollIntervalMs, options.timeoutMs, revokePreview, service]
  );

  const cancelUpload = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    if (activePromiseRef.current) return;
    revokePreview();
    setState({
      ...initialProgress,
      previewUrl: null,
      result: null,
      error: null,
    });
  }, [revokePreview]);

  return {
    ...state,
    isUploading: activeStages.has(state.stage),
    startUpload,
    cancelUpload,
    reset,
  };
};

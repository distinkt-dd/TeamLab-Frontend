const importAutModule = <T>(window: Window, path: string): Promise<T> =>
  (
    window as Window & {
      eval: (code: string) => unknown;
    }
  ).eval(`import(${JSON.stringify(path)})`) as Promise<T>;

const sessionResponse = {
  upload_id: '1e575f20-a5d2-4cd6-92cf-728f817a34df',
  status: 'awaiting_upload' as const,
  expires_at: '2026-11-03T12:05:00Z',
  upload_url: 'https://storage.yandexcloud.net/teamlab-media',
  upload_fields: {
    'Content-Type': 'image/png',
    key: 'temporary/upload/image',
    policy: 'opaque-policy',
  },
};

const statusResponse = (
  status: 'queued' | 'processing' | 'ready' | 'attached' | 'failed'
) => ({
  upload_id: sessionResponse.upload_id,
  kind: 'project_image' as const,
  status,
  image_url:
    status === 'ready' || status === 'attached'
      ? 'https://storage.yandexcloud.net/media/image.webp?signature'
      : null,
  thumbnail_url:
    status === 'ready' || status === 'attached'
      ? 'https://storage.yandexcloud.net/media/thumbnail.webp?signature'
      : null,
  error_code: status === 'failed' ? 'invalid_image' : null,
  error_message: status === 'failed' ? 'Некорректное изображение.' : '',
});

describe('ImageUploadService', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/v1/users/**', {
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    cy.visit('http://localhost:5173/policy');
  });

  it('выполняет полный flow и не дублирует параллельную загрузку', () => {
    cy.window().then(async (window) => {
      const [{ Api }, { ImageUploadService }] = await Promise.all([
        importAutModule<typeof import('@shared/api/api.class')>(
          window,
          '/src/shared/api/api.class.ts'
        ),
        importAutModule<typeof import('@entities/image-upload')>(
          window,
          '/src/entities/image-upload/index.ts'
        ),
      ]);
      const originalFetch = window.fetch;
      const calls: Array<{ url: string; init?: RequestInit }> = [];
      let statusChecks = 0;

      window.fetch = async (input, init) => {
        const url = String(input);
        calls.push({ url, init });

        if (url === sessionResponse.upload_url) {
          expect(init?.headers).to.equal(undefined);
          const entries = Array.from((init?.body as FormData).entries());
          expect(entries.slice(0, -1)).to.deep.equal(
            Object.entries(sessionResponse.upload_fields)
          );
          expect(entries.at(-1)?.[0]).to.equal('file');
          expect(entries.at(-1)?.[1]).to.be.instanceOf(window.File);
          return new window.Response(null, { status: 204 });
        }

        const pathname = new URL(url, window.location.origin).pathname;
        const response = (() => {
          if (pathname === '/api/v1/image-uploads/') {
            const body = JSON.parse(String(init?.body)) as Record<
              string,
              unknown
            >;
            expect(body).to.deep.equal({
              kind: 'project_image',
              target_id: 42,
              content_type: 'image/png',
              size_bytes: 4,
            });
            return sessionResponse;
          }
          if (pathname.endsWith('/confirm/')) {
            return {
              upload_id: sessionResponse.upload_id,
              status: 'queued',
            };
          }
          if (pathname.endsWith('/attach/')) {
            return statusResponse('attached');
          }

          statusChecks += 1;
          return statusResponse(statusChecks === 1 ? 'processing' : 'ready');
        })();
        return new window.Response(JSON.stringify(response), {
          status: pathname === '/api/v1/image-uploads/' ? 201 : 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      try {
        const service = new ImageUploadService(new Api('/api/v1'));
        const input = {
          kind: 'project_image' as const,
          targetId: 42,
          file: new window.File(['test'], 'image.png', {
            type: 'image/png',
          }),
        };
        const first = service.uploadAndAttach(input, { pollIntervalMs: 1 });
        const second = service.uploadAndAttach(input, { pollIntervalMs: 1 });

        expect(second).to.equal(first);
        expect((await first).status).to.equal('attached');
        expect(
          calls.filter(({ url }) =>
            url.endsWith(`/image-uploads/${sessionResponse.upload_id}/attach/`)
          )
        ).to.have.length(1);
        expect(statusChecks).to.equal(2);
      } finally {
        window.fetch = originalFetch;
      }
    });
  });

  it('не вызывает attach повторно и останавливается на attached', () => {
    cy.window().then(async (window) => {
      const [{ Api }, { ImageUploadService }] = await Promise.all([
        importAutModule<typeof import('@shared/api/api.class')>(
          window,
          '/src/shared/api/api.class.ts'
        ),
        importAutModule<typeof import('@entities/image-upload')>(
          window,
          '/src/entities/image-upload/index.ts'
        ),
      ]);
      const originalFetch = window.fetch;
      let attachCalls = 0;

      window.fetch = async (input) => {
        const url = String(input);
        if (url === sessionResponse.upload_url) {
          return new window.Response(null, { status: 204 });
        }
        const pathname = new URL(url, window.location.origin).pathname;
        let body: object;
        if (pathname === '/api/v1/image-uploads/') {
          body = sessionResponse;
        } else if (pathname.endsWith('/confirm/')) {
          body = { upload_id: sessionResponse.upload_id, status: 'queued' };
        } else if (pathname.endsWith('/attach/')) {
          attachCalls += 1;
          body = statusResponse('attached');
        } else {
          body = statusResponse('attached');
        }
        return new window.Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      try {
        const service = new ImageUploadService(new Api('/api/v1'));
        const result = await service.uploadAndAttach(
          {
            kind: 'user_avatar',
            file: new window.File(['test'], 'avatar.png', {
              type: 'image/png',
            }),
          },
          { pollIntervalMs: 1 }
        );

        expect(result.status).to.equal('attached');
        expect(attachCalls).to.equal(0);
      } finally {
        window.fetch = originalFetch;
      }
    });
  });

  it('передаёт ошибку обработки и не вызывает attach', () => {
    cy.window().then(async (window) => {
      const [{ Api }, { ImageUploadError, ImageUploadService }] =
        await Promise.all([
          importAutModule<typeof import('@shared/api/api.class')>(
            window,
            '/src/shared/api/api.class.ts'
          ),
          importAutModule<typeof import('@entities/image-upload')>(
            window,
            '/src/entities/image-upload/index.ts'
          ),
        ]);
      const originalFetch = window.fetch;
      let attachCalls = 0;

      window.fetch = async (input) => {
        const url = String(input);
        if (url === sessionResponse.upload_url) {
          return new window.Response(null, { status: 204 });
        }
        const pathname = new URL(url, window.location.origin).pathname;
        let body: object;
        if (pathname === '/api/v1/image-uploads/') {
          body = sessionResponse;
        } else if (pathname.endsWith('/confirm/')) {
          body = { upload_id: sessionResponse.upload_id, status: 'queued' };
        } else if (pathname.endsWith('/attach/')) {
          attachCalls += 1;
          body = statusResponse('attached');
        } else {
          body = statusResponse('failed');
        }
        return new window.Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      try {
        const service = new ImageUploadService(new Api('/api/v1'));
        const error = await service
          .uploadAndAttach(
            {
              kind: 'portfolio_image',
              targetId: 17,
              file: new window.File(['test'], 'work.png', {
                type: 'image/png',
              }),
            },
            { pollIntervalMs: 1 }
          )
          .catch((reason: unknown) => reason);

        expect(error).to.be.instanceOf(ImageUploadError);
        expect((error as InstanceType<typeof ImageUploadError>).code).to.equal(
          'processing_failed'
        );
        expect(
          (error as InstanceType<typeof ImageUploadError>).backendCode
        ).to.equal('invalid_image');
        expect(attachCalls).to.equal(0);
      } finally {
        window.fetch = originalFetch;
      }
    });
  });

  it('проверяет файл до create и корректно отменяет запрос', () => {
    cy.window().then(async (window) => {
      const [{ Api }, { ImageUploadError, ImageUploadService }] =
        await Promise.all([
          importAutModule<typeof import('@shared/api/api.class')>(
            window,
            '/src/shared/api/api.class.ts'
          ),
          importAutModule<typeof import('@entities/image-upload')>(
            window,
            '/src/entities/image-upload/index.ts'
          ),
        ]);
      const service = new ImageUploadService(new Api('/api/v1'));
      const invalidError = await service
        .uploadAndAttach({
          kind: 'project_image',
          targetId: 0,
          file: new window.File(['text'], 'file.txt', {
            type: 'text/plain',
          }),
        })
        .catch((reason: unknown) => reason);
      const controller = new window.AbortController();
      controller.abort();
      const cancelledError = await service
        .uploadAndAttach(
          {
            kind: 'user_avatar',
            file: new window.File(['test'], 'avatar.png', {
              type: 'image/png',
            }),
          },
          { signal: controller.signal }
        )
        .catch((reason: unknown) => reason);

      expect(invalidError).to.be.instanceOf(ImageUploadError);
      expect(
        (invalidError as InstanceType<typeof ImageUploadError>).code
      ).to.equal('invalid_file');
      expect(cancelledError).to.be.instanceOf(ImageUploadError);
      expect(
        (cancelledError as InstanceType<typeof ImageUploadError>).code
      ).to.equal('cancelled');
    });
  });

  it('не вызывает attach при отмене во время polling', () => {
    cy.window().then(async (window) => {
      const [{ Api }, { ImageUploadError, ImageUploadService }] =
        await Promise.all([
          importAutModule<typeof import('@shared/api/api.class')>(
            window,
            '/src/shared/api/api.class.ts'
          ),
          importAutModule<typeof import('@entities/image-upload')>(
            window,
            '/src/entities/image-upload/index.ts'
          ),
        ]);
      const originalFetch = window.fetch;
      const controller = new window.AbortController();
      let attachCalls = 0;

      window.fetch = async (input) => {
        const url = String(input);
        if (url === sessionResponse.upload_url) {
          return new window.Response(null, { status: 204 });
        }
        const pathname = new URL(url, window.location.origin).pathname;
        let body: object;
        if (pathname === '/api/v1/image-uploads/') {
          body = sessionResponse;
        } else if (pathname.endsWith('/confirm/')) {
          body = { upload_id: sessionResponse.upload_id, status: 'queued' };
        } else if (pathname.endsWith('/attach/')) {
          attachCalls += 1;
          body = statusResponse('attached');
        } else {
          controller.abort();
          body = statusResponse('ready');
        }
        return new window.Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      try {
        const service = new ImageUploadService(new Api('/api/v1'));
        const error = await service
          .uploadAndAttach(
            {
              kind: 'user_avatar',
              file: new window.File(['test'], 'avatar.png', {
                type: 'image/png',
              }),
            },
            { signal: controller.signal, pollIntervalMs: 1 }
          )
          .catch((reason: unknown) => reason);

        expect(error).to.be.instanceOf(ImageUploadError);
        expect((error as InstanceType<typeof ImageUploadError>).code).to.equal(
          'cancelled'
        );
        expect(attachCalls).to.equal(0);
      } finally {
        window.fetch = originalFetch;
      }
    });
  });
});

import http from 'node:http';
import { describe, expect, it } from 'vitest';
import {
  checkHttpStatus,
  httpRequestTools,
  sendHttpRequest
} from './httpRequest';

const listen = (server: http.Server): Promise<URL> =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        resolve(new URL(`http://127.0.0.1:${address.port}`));
      }
    });
  });

describe('sendHttpRequest', () => {
  it('sends a request and captures response data', async () => {
    const server = http.createServer((request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(
        JSON.stringify({
          method: request.method,
          url: request.url
        })
      );
    });
    const url = await listen(server);

    try {
      const result = await sendHttpRequest(
        {
          url: new URL('/hello', url).toString(),
          method: 'GET'
        },
        {
          allowPrivateNetworks: true
        }
      );

      expect(result.status).toBe(200);
      expect(result.headers['content-type']).toContain('application/json');
      expect(JSON.parse(result.bodyText)).toEqual({
        method: 'GET',
        url: '/hello'
      });
    } finally {
      server.close();
    }
  });

  it('blocks private network targets by default', async () => {
    await expect(
      sendHttpRequest({
        url: 'http://127.0.0.1/'
      })
    ).rejects.toThrow('Private or reserved IP is blocked');
  });

  it('validates redirects before following them', async () => {
    const server = http.createServer((request, response) => {
      if (request.url === '/private') {
        response.end('private target');
        return;
      }

      response.writeHead(302, {
        location: '/private'
      });
      response.end();
    });
    const url = await listen(server);

    try {
      await expect(
        sendHttpRequest(
          {
            url: url.toString()
          },
          {
            allowPrivateNetworks: true
          }
        )
      ).resolves.toMatchObject({
        redirected: true,
        finalUrl: new URL('/private', url).toString()
      });

      await expect(
        sendHttpRequest({
          url: url.toString()
        })
      ).rejects.toThrow('Private or reserved IP is blocked');
    } finally {
      server.close();
    }
  });
});

describe('checkHttpStatus', () => {
  it('checks URL status with HEAD by default', async () => {
    const server = http.createServer((request, response) => {
      response.statusCode = 204;
      response.statusMessage = 'No Content';
      response.setHeader('x-method', request.method ?? '');
      response.end();
    });
    const url = await listen(server);

    try {
      const result = await checkHttpStatus(
        {
          url: new URL('/health', url).toString()
        },
        {
          allowPrivateNetworks: true
        }
      );

      expect(result).toMatchObject({
        method: 'HEAD',
        status: 204,
        statusText: 'No Content',
        category: 'success',
        ok: true,
        redirected: false,
        redirectCount: 0
      });
      expect(result.headers['x-method']).toBe('HEAD');
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    } finally {
      server.close();
    }
  });

  it('reports redirects when followRedirects is enabled', async () => {
    const server = http.createServer((request, response) => {
      if (request.url === '/target') {
        response.statusCode = 200;
        response.end();
        return;
      }

      response.writeHead(302, {
        location: '/target'
      });
      response.end();
    });
    const url = await listen(server);

    try {
      const result = await checkHttpStatus(
        {
          url: new URL('/redirect', url).toString()
        },
        {
          allowPrivateNetworks: true
        }
      );

      expect(result.status).toBe(200);
      expect(result.finalUrl).toBe(new URL('/target', url).toString());
      expect(result.redirected).toBe(true);
      expect(result.redirectCount).toBe(1);
      expect(result.redirects).toEqual([new URL('/target', url).toString()]);
    } finally {
      server.close();
    }
  });
});

describe('httpRequestTools', () => {
  it('keeps HTTP request and status tools API-only', () => {
    const requestTool = httpRequestTools.find(
      (item) => item.name === 'http.request'
    );
    const statusTool = httpRequestTools.find(
      (item) => item.name === 'http.status'
    );

    expect(requestTool?.channels).toEqual(['api']);
    expect(statusTool?.channels).toEqual(['api']);
    expect(statusTool?.risks).toEqual(['network']);
  });
});

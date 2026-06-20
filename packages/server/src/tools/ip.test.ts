import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCurrentIpPureCard, ipTools, lookupIpPure } from './ip';

const mockFetchText = (body: string, contentType = 'application/json') => {
  const fetchMock = vi.fn(async (url: string | URL | Request) => {
    const encoded = new TextEncoder().encode(body);
    let consumed = false;

    return {
      ok: true,
      status: 200,
      url: String(url),
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'content-type' ? contentType : null
      },
      body: {
        getReader: () => ({
          read: async () => {
            if (consumed) return { done: true, value: undefined };
            consumed = true;
            return { done: false, value: encoded };
          },
          cancel: async () => undefined
        })
      }
    };
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('IP tools', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads current IPPure card responses as text when they are SVG', async () => {
    const fetchMock = mockFetchText('<svg>card</svg>', 'image/svg+xml');

    const result = await getCurrentIpPureCard({
      ipPureCardUrl: 'https://my.ippure.test/v1/card'
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://my.ippure.test/v1/card',
      expect.any(Object)
    );
    expect(result).toMatchObject({
      source: 'https://my.ippure.test/v1/card',
      contentType: 'image/svg+xml',
      data: null,
      text: '<svg>card</svg>'
    });
  });

  it('looks up public IP data through the configured IPPure lookup URL', async () => {
    const fetchMock = mockFetchText(
      JSON.stringify({
        data: {
          ip: '8.8.8.8',
          org: 'AS15169 Google LLC'
        }
      })
    );

    const result = await lookupIpPure(
      { ip: '8.8.8.8' },
      {
        ipPureLookupBaseUrl: 'https://ipinfo.test/widget/demo'
      }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://ipinfo.test/widget/demo/8.8.8.8',
      expect.any(Object)
    );
    expect(result).toEqual({
      ip: '8.8.8.8',
      source: 'https://ipinfo.test/widget/demo/8.8.8.8',
      data: {
        data: {
          ip: '8.8.8.8',
          org: 'AS15169 Google LLC'
        }
      }
    });
  });

  it('uses the IPPure data source switch for both current and lookup tools', async () => {
    await expect(
      getCurrentIpPureCard({
        dataSources: {
          rdap: true,
          ippure: false
        }
      })
    ).rejects.toThrow('Network data source is disabled: ippure');

    await expect(
      lookupIpPure(
        { ip: '8.8.8.8' },
        {
          dataSources: {
            rdap: true,
            ippure: false
          }
        }
      )
    ).rejects.toThrow('Network data source is disabled: ippure');
  });

  it('registers IP tools for API and MCP', () => {
    expect(
      ipTools.map((tool) => ({
        name: tool.name,
        channels: tool.channels,
        risks: tool.risks
      }))
    ).toEqual([
      {
        name: 'ip.current',
        channels: ['api', 'mcp'],
        risks: ['network']
      },
      {
        name: 'ip.lookup',
        channels: ['api', 'mcp'],
        risks: ['network']
      }
    ]);
  });
});

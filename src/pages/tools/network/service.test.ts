import { describe, expect, it } from 'vitest';
import { getApiToolErrorText, toNetworkErrorResult } from './service';

describe('network service helpers', () => {
  it('returns null for successful tool results', () => {
    expect(
      getApiToolErrorText({
        ok: true,
        result: {
          value: 'ok'
        }
      })
    ).toBeNull();
  });

  it('formats failed tool results as a compact error summary', () => {
    expect(
      getApiToolErrorText({
        ok: false,
        error: {
          code: 'API_UNAVAILABLE',
          message: 'Unable to reach local API'
        }
      })
    ).toBe('API_UNAVAILABLE: Unable to reach local API');
  });

  it('normalizes caught errors into API tool result shape', () => {
    expect(
      toNetworkErrorResult(
        'HTTP_REQUEST_INPUT_ERROR',
        'Unable to run request',
        new Error('Headers must be a JSON object')
      )
    ).toEqual({
      ok: false,
      error: {
        code: 'HTTP_REQUEST_INPUT_ERROR',
        message: 'Headers must be a JSON object'
      }
    });
  });
});

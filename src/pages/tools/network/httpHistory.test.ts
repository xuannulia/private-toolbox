import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearHttpHistory,
  getHttpHistory,
  recordHttpHistory
} from './httpHistory';

type RequestValues = {
  method: string;
  url: string;
  headers: string;
  body: string;
  followRedirects: boolean;
};

describe('http history', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records newest entries first', () => {
    recordHttpHistory<RequestValues>(
      'http.request',
      'GET https://example.com',
      {
        method: 'GET',
        url: 'https://example.com',
        headers: '{}',
        body: '',
        followRedirects: true
      }
    );
    recordHttpHistory<RequestValues>(
      'http.request',
      'POST https://example.com',
      {
        method: 'POST',
        url: 'https://example.com',
        headers: '{}',
        body: '{}',
        followRedirects: true
      }
    );

    expect(
      getHttpHistory<RequestValues>('http.request').map((entry) => entry.label)
    ).toEqual(['POST https://example.com', 'GET https://example.com']);
  });

  it('deduplicates by full stored values', () => {
    const values: RequestValues = {
      method: 'GET',
      url: 'https://example.com',
      headers: '{}',
      body: '',
      followRedirects: true
    };

    recordHttpHistory('http.request', 'GET https://example.com', values);
    recordHttpHistory('http.request', 'GET https://example.com', values);

    expect(getHttpHistory<RequestValues>('http.request')).toHaveLength(1);
  });

  it('keeps only the latest eight entries', () => {
    for (let index = 0; index < 10; index += 1) {
      recordHttpHistory<RequestValues>(
        'http.request',
        `GET https://e${index}.com`,
        {
          method: 'GET',
          url: `https://e${index}.com`,
          headers: '{}',
          body: '',
          followRedirects: true
        }
      );
    }

    expect(
      getHttpHistory<RequestValues>('http.request').map((entry) => entry.label)
    ).toEqual([
      'GET https://e9.com',
      'GET https://e8.com',
      'GET https://e7.com',
      'GET https://e6.com',
      'GET https://e5.com',
      'GET https://e4.com',
      'GET https://e3.com',
      'GET https://e2.com'
    ]);
  });

  it('clears per-key history', () => {
    recordHttpHistory<RequestValues>(
      'http.request',
      'GET https://example.com',
      {
        method: 'GET',
        url: 'https://example.com',
        headers: '{}',
        body: '',
        followRedirects: true
      }
    );

    clearHttpHistory('http.request');

    expect(getHttpHistory<RequestValues>('http.request')).toEqual([]);
  });
});

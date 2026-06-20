import { describe, expect, it } from 'vitest';
import {
  createNginxLocationMatchText,
  matchNginxLocationForTool
} from './service';

const content = `
server {
  location /api/ {
    proxy_pass http://api;
  }

  location ~* \\.png$ {
    expires 1h;
  }
}
`;

describe('matchNginxLocationForTool', () => {
  it('returns the selected location', () => {
    expect(
      matchNginxLocationForTool({
        content,
        uri: '/api/logo.png'
      })?.selected
    ).toMatchObject({
      raw: 'location ~* \\.png$',
      matchType: 'case_insensitive_regex'
    });
  });

  it('returns empty text when input is incomplete', () => {
    expect(
      createNginxLocationMatchText({
        content,
        uri: ''
      })
    ).toBe('');
  });
});

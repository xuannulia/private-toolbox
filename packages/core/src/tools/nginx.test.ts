import { describe, expect, it } from 'vitest';
import {
  formatNginxConfig,
  generateNginxSnippet,
  matchNginxLocation,
  nginxTools
} from './nginx';

describe('formatNginxConfig', () => {
  it('formats nested nginx blocks', () => {
    const result = formatNginxConfig({
      content:
        'events{worker_connections 1024;}http{server{listen 80;location /api/{proxy_pass http://app;}}}'
    });

    expect(result.valid).toBe(true);
    expect(result.directiveCount).toBe(3);
    expect(result.blockCount).toBe(4);
    expect(result.maxDepth).toBe(3);
    expect(result.output).toContain('http {\n  server {');
    expect(result.output).toContain('    location /api/ {');
    expect(result.contexts).toEqual(
      expect.arrayContaining(['$.http[2].server[3].location(/api/)'])
    );
  });

  it('preserves comments on their own lines', () => {
    const result = formatNginxConfig({
      content: 'server {\n# main listener\nlisten 80;\n}\n'
    });

    expect(result.valid).toBe(true);
    expect(result.output).toContain('  # main listener\n');
  });

  it('reports missing semicolons and braces', () => {
    const result = formatNginxConfig({
      content: 'server { listen 80 }'
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        message: 'Directive is missing a semicolon before closing brace.'
      })
    );
  });

  it('reports unmatched closing braces', () => {
    const result = formatNginxConfig({
      content: 'listen 80; }'
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        message: 'Closing brace has no matching opening brace.'
      })
    );
  });

  it('validates common directive and block arguments', () => {
    const result = formatNginxConfig({
      content: 'server { listen; location { proxy_pass; } }'
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(['$.server[1].listen', '$.server[1].location'])
    );
  });

  it('rejects empty input', () => {
    expect(() => formatNginxConfig({ content: '   ' })).toThrow(
      'content is required'
    );
  });
});

describe('matchNginxLocation', () => {
  const config = `
server {
  location = /health {
    return 200;
  }

  location ^~ /assets/ {
    root /srv/public;
  }

  location /assets/private/ {
    deny all;
  }

  location /api/ {
    proxy_pass http://api;
  }

  location ~* \\.(png|jpg)$ {
    expires 1h;
  }

  location / {
    try_files $uri $uri/ =404;
  }

  location @fallback {
    return 404;
  }
}
`;

  it('selects exact locations before any other match', () => {
    const result = matchNginxLocation({
      content: config,
      uri: '/health'
    });

    expect(result.selected).toMatchObject({
      raw: 'location = /health',
      matchType: 'exact',
      selected: true
    });
    expect(result.selectionReason).toContain('highest priority');
  });

  it('selects the longest matching ^~ prefix before regex locations', () => {
    const result = matchNginxLocation({
      content: config,
      uri: '/assets/logo.png'
    });

    expect(result.selected).toMatchObject({
      raw: 'location ^~ /assets/',
      matchType: 'preferential_prefix'
    });
    expect(
      result.locations.find(
        (location) => location.raw === 'location ~* \\.(png|jpg)$'
      )?.matched
    ).toBe(true);
  });

  it('selects the first matching regex after ordinary prefix lookup', () => {
    const result = matchNginxLocation({
      content: config,
      uri: '/api/avatar.jpg'
    });

    expect(result.selected).toMatchObject({
      raw: 'location ~* \\.(png|jpg)$',
      matchType: 'case_insensitive_regex'
    });
  });

  it('falls back to the longest ordinary prefix when no regex matches', () => {
    const result = matchNginxLocation({
      content: config,
      uri: '/api/users'
    });

    expect(result.selected).toMatchObject({
      raw: 'location /api/',
      matchType: 'prefix'
    });
  });

  it('ignores named locations for direct URI matching', () => {
    const result = matchNginxLocation({
      content: config,
      uri: '/fallback'
    });

    expect(
      result.locations.find((location) => location.raw === 'location @fallback')
    ).toMatchObject({
      matchType: 'named',
      matched: false,
      reason: 'Named locations are only selected by internal redirects.'
    });
  });

  it('reports unsupported regex patterns without selecting them', () => {
    const result = matchNginxLocation({
      content:
        'server { location ~ (?<bad> { return 200; } location / { return 404; } }',
      uri: '/anything'
    });

    expect(result.selected).toMatchObject({
      raw: 'location /',
      matchType: 'prefix'
    });
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          message: expect.stringContaining(
            'Regex location could not be evaluated'
          )
        })
      ])
    );
  });
});

describe('generateNginxSnippet', () => {
  it('generates reverse proxy snippets with websocket headers', () => {
    const result = generateNginxSnippet({
      kind: 'reverse_proxy',
      serverName: 'app.example.com',
      upstreamUrl: 'http://127.0.0.1:3000',
      enableWebsocket: true
    });

    expect(result.output).toContain('server_name app.example.com;');
    expect(result.output).toContain('proxy_pass http://127.0.0.1:3000;');
    expect(result.output).toContain('proxy_set_header Upgrade $http_upgrade;');
    expect(result.notes).toContain('WebSocket upgrade headers are enabled.');
  });

  it('generates SPA snippets with index fallback and cache rules', () => {
    const result = generateNginxSnippet({
      kind: 'spa',
      serverName: 'example.com www.example.com',
      root: '/srv/www/app',
      listenPort: 8080
    });

    expect(result.listenPort).toBe(8080);
    expect(result.output).toContain('root /srv/www/app;');
    expect(result.output).toContain('try_files $uri $uri/ /index.html;');
    expect(result.output).toContain('expires 30d;');
  });

  it('generates HTTPS redirect snippets', () => {
    const result = generateNginxSnippet({
      kind: 'https_redirect',
      serverName: 'example.com'
    });

    expect(result.output).toContain('return 301 https://$host$request_uri;');
    expect(result.notes[0]).toContain('redirection');
  });

  it('rejects unsafe server names', () => {
    expect(() =>
      generateNginxSnippet({
        kind: 'static_site',
        serverName: 'example.com; include bad.conf'
      })
    ).toThrow('serverName is not valid');
  });
});

describe('nginxTools', () => {
  it('registers nginx tools for Web, API, and MCP', () => {
    const formatTool = nginxTools.find((item) => item.name === 'nginx.format');
    const locationTool = nginxTools.find(
      (item) => item.name === 'nginx.location_match'
    );
    const snippetTool = nginxTools.find(
      (item) => item.name === 'nginx.snippet_generate'
    );

    expect(formatTool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(locationTool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(snippetTool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(locationTool?.risks).toEqual(['local']);
    expect(snippetTool?.risks).toEqual(['local']);
  });
});

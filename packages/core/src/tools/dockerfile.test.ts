import { describe, expect, it } from 'vitest';
import {
  dockerfileTools,
  formatDockerfile,
  generateDockerfileSnippet
} from './dockerfile';

describe('formatDockerfile', () => {
  it('formats Dockerfile instructions and continuation lines', () => {
    const result = formatDockerfile({
      content: `# syntax=docker/dockerfile:1
from node:20-alpine as build
workdir /app
copy package*.json ./
run npm ci && \\
 npm run build

from nginx:alpine
copy --from=build /app/dist /usr/share/nginx/html
expose 80
user nginx
`,
      indent: 4
    });

    expect(result.valid).toBe(true);
    expect(result.instructionCount).toBe(8);
    expect(result.stageCount).toBe(2);
    expect(result.stages).toEqual([
      {
        index: 1,
        name: 'build',
        baseImage: 'node:20-alpine',
        line: 2
      },
      {
        index: 2,
        name: null,
        baseImage: 'nginx:alpine',
        line: 8
      }
    ]);
    expect(result.baseImages).toEqual(['node:20-alpine', 'nginx:alpine']);
    expect(result.exposedPorts).toEqual(['80']);
    expect(result.workdirs).toEqual(['/app']);
    expect(result.users).toEqual(['nginx']);
    expect(result.output).toContain('FROM node:20-alpine as build');
    expect(result.output).toContain('RUN npm ci && \\\n    npm run build');
  });

  it('reports missing required arguments and missing FROM', () => {
    const result = formatDockerfile({
      content: 'copy app.py\nrun\n'
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          message: 'COPY requires at least one source and a destination.'
        }),
        expect.objectContaining({
          severity: 'error',
          message: 'RUN requires at least one argument.'
        }),
        expect.objectContaining({
          severity: 'error',
          message: 'Dockerfile must contain at least one FROM instruction.'
        })
      ])
    );
  });

  it('reports unknown instructions as warnings', () => {
    const result = formatDockerfile({
      content: 'FROM alpine\nBOOP value\n'
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        severity: 'warning',
        message: 'Unknown Dockerfile instruction: BOOP'
      })
    );
  });

  it('rejects empty input', () => {
    expect(() => formatDockerfile({ content: '   ' })).toThrow(
      'content is required'
    );
  });
});

describe('generateDockerfileSnippet', () => {
  it('generates Node multi-stage Dockerfiles', () => {
    const result = generateDockerfileSnippet({
      kind: 'node_app',
      packageManager: 'pnpm',
      port: 5173,
      includeHealthcheck: true
    });

    expect(result.output).toContain('FROM node:20-alpine AS deps');
    expect(result.output).toContain(
      'RUN corepack enable && pnpm install --frozen-lockfile'
    );
    expect(result.output).toContain('RUN corepack enable');
    expect(result.output).toContain('EXPOSE 5173');
    expect(result.output).toContain('HEALTHCHECK');
    expect(result.output).toContain('CMD ["pnpm", "start"]');
    expect(result.dockerignore).toContain('node_modules');
  });

  it('generates Python uvicorn Dockerfiles with Poetry', () => {
    const result = generateDockerfileSnippet({
      kind: 'python_app',
      packageManager: 'poetry',
      pythonModule: 'service.api:app',
      useNonRootUser: true
    });

    expect(result.output).toContain('FROM python:3.12-slim');
    expect(result.output).toContain('poetry install --only main');
    expect(result.output).toContain(
      'CMD ["uvicorn", "service.api:app", "--host", "0.0.0.0", "--port", "8000"]'
    );
    expect(result.output).toContain('USER appuser');
  });

  it('generates Go multi-stage Dockerfiles', () => {
    const result = generateDockerfileSnippet({
      kind: 'go_app',
      port: 8088
    });

    expect(result.baseImages).toEqual(['golang:1.23-alpine', 'alpine:3.20']);
    expect(result.output).toContain('go mod download');
    expect(result.output).toContain('ENTRYPOINT ["/app/app"]');
    expect(result.exposedPort).toBe(8088);
  });

  it('generates static Nginx Dockerfiles', () => {
    const result = generateDockerfileSnippet({
      kind: 'static_nginx'
    });

    expect(result.output).toContain('FROM nginx:1.27-alpine');
    expect(result.output).toContain(
      'COPY --from=build /app/dist /usr/share/nginx/html'
    );
    expect(result.exposedPort).toBe(80);
  });

  it('rejects unsupported package managers for a snippet kind', () => {
    expect(() =>
      generateDockerfileSnippet({
        kind: 'node_app',
        packageManager: 'pip'
      })
    ).toThrow('packageManager is not supported');
  });

  it('rejects unsafe image values', () => {
    expect(() =>
      generateDockerfileSnippet({
        kind: 'node_app',
        baseImage: 'node:20; RUN bad'
      })
    ).toThrow('baseImage is not valid');
  });
});

describe('dockerfileTools', () => {
  it('registers dockerfile tools for Web, API, and MCP', () => {
    const formatTool = dockerfileTools.find(
      (item) => item.name === 'dockerfile.format'
    );
    const snippetTool = dockerfileTools.find(
      (item) => item.name === 'dockerfile.snippet_generate'
    );

    expect(formatTool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(snippetTool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(formatTool?.risks).toEqual(['local']);
    expect(snippetTool?.risks).toEqual(['local']);
  });
});

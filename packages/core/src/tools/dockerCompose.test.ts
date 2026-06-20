import { describe, expect, it } from 'vitest';
import { formatDockerCompose, validateDockerCompose } from './dockerCompose';

describe('validateDockerCompose', () => {
  it('validates a useful compose file', () => {
    const result = validateDockerCompose({
      content: `
services:
  app:
    image: nginx:alpine
    ports:
      - "8080:80"
    environment:
      NODE_ENV: production
volumes:
  data:
`
    });

    expect(result.valid).toBe(true);
    expect(result.serviceNames).toEqual(['app']);
    expect(result.volumeNames).toEqual(['data']);
    expect(result.issues).toEqual([]);
  });

  it('reports YAML syntax errors', () => {
    const result = validateDockerCompose({
      content: 'services:\n  app: [\n'
    });

    expect(result.valid).toBe(false);
    expect(result.issues[0]).toMatchObject({
      severity: 'error',
      path: '$'
    });
  });

  it('checks required services and common field types', () => {
    const result = validateDockerCompose({
      content: `
services:
  bad service:
    image:
      name: nginx
    environment:
      - 42
    ports:
      target: 80
networks:
  - frontend
`
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining([
        '$.services.bad service',
        '$.services.bad service.image',
        '$.services.bad service.environment',
        '$.services.bad service.ports',
        '$.networks'
      ])
    );
  });

  it('warns when a service has neither image nor build', () => {
    const result = validateDockerCompose({
      content: `
services:
  worker:
    command: npm start
`
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        severity: 'warning',
        path: '$.services.worker'
      })
    );
  });
});

describe('formatDockerCompose', () => {
  it('formats flow-style YAML and keeps validation metadata', () => {
    const result = formatDockerCompose({
      content: 'services: { app: { image: nginx, ports: ["80:80"] } }\n'
    });

    expect(result.valid).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.output).toContain('services:');
    expect(result.output).toContain('image: nginx');
    expect(result.serviceNames).toEqual(['app']);
  });
});

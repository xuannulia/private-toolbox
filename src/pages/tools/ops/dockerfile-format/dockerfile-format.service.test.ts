import { describe, expect, it } from 'vitest';
import {
  createDockerfileSummaryText,
  formatDockerfileForTool
} from './service';

describe('Dockerfile format service', () => {
  it('formats Dockerfile content', () => {
    expect(
      formatDockerfileForTool({
        content: 'from alpine\nrun echo hi\n',
        indent: 4
      })
    ).toMatchObject({
      valid: true,
      output: 'FROM alpine\nRUN echo hi\n',
      baseImages: ['alpine']
    });
  });

  it('returns empty summary for empty input', () => {
    expect(
      createDockerfileSummaryText({
        content: '',
        indent: 4
      })
    ).toBe('');
  });
});

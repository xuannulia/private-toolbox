import {
  formatDockerfile,
  type DockerfileFormatOutput
} from '@private-toolbox/core';

export type DockerfileFormatOptions = {
  content: string;
  indent: number;
};

export const formatDockerfileForTool = ({
  content,
  indent
}: DockerfileFormatOptions): DockerfileFormatOutput | null => {
  if (!content.trim()) return null;
  return formatDockerfile({ content, indent });
};

export const createDockerfileSummaryText = (
  options: DockerfileFormatOptions
): string => {
  const result = formatDockerfileForTool(options);
  if (!result) return '';

  return JSON.stringify(
    {
      valid: result.valid,
      issues: result.issues,
      instructionCount: result.instructionCount,
      stageCount: result.stageCount,
      stages: result.stages,
      baseImages: result.baseImages,
      exposedPorts: result.exposedPorts,
      workdirs: result.workdirs,
      users: result.users
    },
    null,
    2
  );
};

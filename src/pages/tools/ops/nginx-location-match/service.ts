import {
  matchNginxLocation,
  type NginxLocationMatchOutput
} from '@private-toolbox/core';

export type NginxLocationMatchOptions = {
  content: string;
  uri: string;
};

export const matchNginxLocationForTool = (
  options: NginxLocationMatchOptions
): NginxLocationMatchOutput | null => {
  if (!options.content.trim() || !options.uri.trim()) return null;
  return matchNginxLocation(options);
};

export const createNginxLocationMatchText = (
  options: NginxLocationMatchOptions
): string => {
  const result = matchNginxLocationForTool(options);
  return result ? JSON.stringify(result, null, 2) : '';
};

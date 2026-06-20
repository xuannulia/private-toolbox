import { type ToolExecutionContext } from '@private-toolbox/core';
import { type NetworkToolConfig } from './config.js';

export const networkConfigFromContext = (
  context?: ToolExecutionContext
): Partial<NetworkToolConfig> | undefined => {
  if (!context?.maxOutputBytes) return undefined;

  return {
    maxResponseBytes: context.maxOutputBytes
  };
};

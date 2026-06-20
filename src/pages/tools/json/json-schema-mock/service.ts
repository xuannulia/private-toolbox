import { createMockJsonFromSchema } from '@private-toolbox/core';

export type JsonSchemaMockOptions = {
  schemaText: string;
  arrayItemCount: string;
  includeOptionalProperties: boolean;
};

export const createJsonSchemaMockText = ({
  schemaText,
  arrayItemCount,
  includeOptionalProperties
}: JsonSchemaMockOptions): string => {
  const parsedArrayItemCount = arrayItemCount.trim()
    ? Number(arrayItemCount)
    : 1;

  return createMockJsonFromSchema({
    schemaText,
    arrayItemCount: Number.isFinite(parsedArrayItemCount)
      ? Math.floor(parsedArrayItemCount)
      : 1,
    includeOptionalProperties
  }).dataText;
};

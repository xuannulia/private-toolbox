import { generateUuids } from '@private-toolbox/core';

export type UuidGeneratorOptions = {
  count: string;
  uppercase: boolean;
  removeDashes: boolean;
};

export const generateUuidText = ({
  count,
  uppercase,
  removeDashes
}: UuidGeneratorOptions): string => {
  const parsedCount = count.trim() ? Number(count) : 1;
  const result = generateUuids({
    count: Number.isFinite(parsedCount) ? Math.floor(parsedCount) : 1,
    uppercase,
    removeDashes
  });

  return result.uuids.join('\n');
};

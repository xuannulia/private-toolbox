import {
  convertNumberBase,
  type NumberBaseConvertOutput
} from '@private-toolbox/core';

export type BaseConverterOptions = {
  value: string;
  fromBase: string;
  toBase: string;
  uppercase: boolean;
  outputPrefix: boolean;
};

const parseBase = (value: string): number | undefined => {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : undefined;
};

export const convertBaseForTool = (
  options: BaseConverterOptions
): NumberBaseConvertOutput | null => {
  if (!options.value.trim()) return null;

  return convertNumberBase({
    value: options.value,
    fromBase: parseBase(options.fromBase),
    toBase: parseBase(options.toBase) ?? 10,
    uppercase: options.uppercase,
    outputPrefix: options.outputPrefix
  });
};

export const createBaseConversionText = (
  options: BaseConverterOptions
): string => {
  const result = convertBaseForTool(options);
  return result ? JSON.stringify(result, null, 2) : '';
};

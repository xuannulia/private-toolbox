import { convertColor, type ColorConvertOutput } from '@private-toolbox/core';

export type ColorConverterOptions = {
  color: string;
  uppercase: boolean;
};

export const convertColorForTool = ({
  color,
  uppercase
}: ColorConverterOptions): ColorConvertOutput | null => {
  if (!color.trim()) return null;
  return convertColor({ color, uppercase });
};

export const createColorConversionText = (
  options: ColorConverterOptions
): string => {
  const result = convertColorForTool(options);
  return result ? JSON.stringify(result, null, 2) : '';
};

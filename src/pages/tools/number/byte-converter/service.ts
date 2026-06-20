import { convertByteUnits } from '@private-toolbox/core';
import { InitialValuesType } from './types';

export function byteConverter(input: string, options: InitialValuesType) {
  if (!input) return '';

  return convertByteUnits({
    text: input,
    fromUnit: options.fromUnit,
    toUnit: options.toUnit,
    precision: options.precision
  }).result;
}

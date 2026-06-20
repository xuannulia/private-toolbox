import { calculateCidr } from '@private-toolbox/core';

export type CidrCalculatorOptions = {
  cidr: string;
  includeBinary: boolean;
};

export const calculateCidrText = ({
  cidr,
  includeBinary
}: CidrCalculatorOptions): string =>
  JSON.stringify(
    calculateCidr({
      cidr,
      includeBinary
    }),
    null,
    2
  );

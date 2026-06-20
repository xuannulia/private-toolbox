import { type IconSize } from '@private-toolbox/core/tools/ico';

export type ImageToIconOptions = {
  sizes: IconSize[];
};

export type ImageToIconResult = {
  file: File;
  sizes: IconSize[];
};

import { csvToJson } from '@private-toolbox/core';

type CsvToJsonOptions = {
  delimiter: string;
  quote: string;
  comment: string;
  useHeaders: boolean;
  skipEmptyLines: boolean;
  dynamicTypes: boolean;
};

const defaultOptions: CsvToJsonOptions = {
  delimiter: ',',
  quote: '"',
  comment: '#',
  useHeaders: true,
  skipEmptyLines: true,
  dynamicTypes: true
};

export const convertCsvToJson = (
  csv: string,
  options: Partial<CsvToJsonOptions> = {}
): string => {
  const opts = { ...defaultOptions, ...options };

  return csvToJson({
    text: csv,
    delimiter: opts.delimiter,
    quote: opts.quote,
    comment: opts.comment,
    useHeaders: opts.useHeaders,
    skipEmptyLines: opts.skipEmptyLines,
    dynamicTypes: opts.dynamicTypes
  }).text;
};

import {
  compareJson as compareJsonCore,
  compareJsonDocuments
} from '@private-toolbox/core';

export const compareJson = (
  json1: string,
  json2: string,
  format: 'text' | 'json'
): string => {
  if (format === 'json') {
    const result = compareJsonDocuments({
      left: json1,
      right: json2,
      format: 'json'
    });
    return JSON.stringify(
      Object.fromEntries(
        result.differences.map((difference) => [
          difference.path,
          difference.message.replace(`${difference.path}: `, '')
        ])
      )
    );
  }

  return compareJsonCore(json1, json2, format);
};

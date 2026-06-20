import {
  formatSql,
  minifySql,
  supportedSqlDialects,
  type SqlDialect,
  type SqlFormatInput,
  type SqlKeywordCase
} from '@private-toolbox/core';

export type SqlOperation = 'format' | 'minify';

export type SqlToolInput = SqlFormatInput & {
  operation: SqlOperation;
};

export const sqlDialectOptions = supportedSqlDialects;

export const sqlKeywordCaseOptions: SqlKeywordCase[] = [
  'upper',
  'lower',
  'preserve'
];

export const runSqlTool = ({
  operation,
  ...input
}: SqlToolInput):
  | {
      text: string;
      summary: string;
    }
  | Promise<{
      text: string;
      summary: string;
    }> => {
  if (operation === 'format') {
    return formatSql(input).then((result) => ({
      text: result.text,
      summary: JSON.stringify(
        {
          dialect: result.dialect,
          changed: result.changed
        },
        null,
        2
      )
    }));
  }

  return minifySql(input).then((result) => ({
    text: result.text,
    summary: JSON.stringify(
      {
        dialect: result.dialect,
        changed: result.changed,
        originalBytes: result.originalBytes,
        resultBytes: result.resultBytes,
        savedBytes: result.savedBytes,
        savedPercent: result.savedPercent
      },
      null,
      2
    )
  }));
};

export const isSqlDialect = (value: string): value is SqlDialect =>
  (supportedSqlDialects as readonly string[]).includes(value);

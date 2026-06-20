import { createHash } from 'node:crypto';
import { access, lstat, readdir, realpath, rename } from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve
} from 'node:path';
import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '@private-toolbox/core';
import { mergeFileToolConfig, type FileToolConfig } from '../config.js';

export type RenameBatchInput = {
  directory: string;
  pattern: string;
  replacement: string;
  flags?: string;
  recursive?: boolean;
  includeFiles?: boolean;
  includeDirectories?: boolean;
  dryRun?: boolean;
  planHash?: string;
  limit?: number;
};

export type RenameOperationStatus =
  | 'pending'
  | 'renamed'
  | 'invalid'
  | 'conflict';

export type RenameOperation = {
  from: string;
  to: string;
  fromRelative: string;
  toRelative: string;
  fromName: string;
  toName: string;
  status: RenameOperationStatus;
  reason?: string;
};

export type RenameBatchOutput = {
  directory: string;
  rootDir: string;
  recursive: boolean;
  dryRun: boolean;
  planHash: string;
  matchedCount: number;
  renamedCount: number;
  skippedCount: number;
  operations: RenameOperation[];
};

type FileEntry = {
  path: string;
  name: string;
  isDirectory: boolean;
};

const allowedRegexFlags = new Set(['d', 'g', 'i', 'm', 's', 'u', 'v', 'y']);

const isPathInside = (rootDir: string, targetPath: string): boolean => {
  const diff = relative(rootDir, targetPath);
  return diff === '' || (!diff.startsWith('..') && !isAbsolute(diff));
};

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const normalizeFlags = (flags = 'g'): string => {
  const uniqueFlags = Array.from(new Set(flags.split(''))).join('');

  for (const flag of uniqueFlags) {
    if (!allowedRegexFlags.has(flag)) {
      throw new ToolboxError(
        'RENAME_REGEX_FLAG_UNSUPPORTED',
        `Unsupported regex flag: ${flag}`
      );
    }
  }

  return uniqueFlags;
};

const makeRegex = (pattern: string, flags?: string): RegExp => {
  if (!pattern) {
    throw new ToolboxError(
      'RENAME_PATTERN_REQUIRED',
      'Rename pattern is required'
    );
  }

  try {
    return new RegExp(pattern, normalizeFlags(flags));
  } catch (error) {
    throw new ToolboxError(
      'RENAME_PATTERN_INVALID',
      error instanceof Error ? error.message : 'Invalid rename pattern'
    );
  }
};

const assertSafeTargetName = (name: string) => {
  if (!name || name === '.' || name === '..') {
    throw new ToolboxError(
      'RENAME_TARGET_INVALID',
      'Target file name is invalid'
    );
  }

  if (name.includes('/') || name.includes('\\')) {
    throw new ToolboxError(
      'RENAME_TARGET_INVALID',
      'Replacement must not create nested paths'
    );
  }
};

const resolveAllowedDirectory = async (
  directory: string,
  config: FileToolConfig
) => {
  if (!directory?.trim()) {
    throw new ToolboxError(
      'RENAME_DIRECTORY_REQUIRED',
      'Directory is required'
    );
  }

  const rootDir = await realpath(resolve(config.rootDir));
  const targetDirectory = await realpath(resolve(directory));
  const directoryStat = await lstat(targetDirectory);

  if (!directoryStat.isDirectory()) {
    throw new ToolboxError(
      'RENAME_DIRECTORY_INVALID',
      'Directory must point to a folder'
    );
  }

  if (!isPathInside(rootDir, targetDirectory)) {
    throw new ToolboxError(
      'FILE_TOOL_OUTSIDE_ROOT',
      'Directory is outside the configured file tool root',
      {
        rootDir,
        directory: targetDirectory
      }
    );
  }

  return {
    rootDir,
    directory: targetDirectory
  };
};

const collectEntries = async (
  directory: string,
  recursive: boolean,
  includeFiles: boolean,
  includeDirectories: boolean
): Promise<FileEntry[]> => {
  const entries: FileEntry[] = [];
  const dirents = await readdir(directory, { withFileTypes: true });

  for (const dirent of dirents) {
    const path = join(directory, dirent.name);

    if (dirent.isDirectory()) {
      if (includeDirectories) {
        entries.push({
          path,
          name: dirent.name,
          isDirectory: true
        });
      }

      if (recursive) {
        entries.push(
          ...(await collectEntries(
            path,
            recursive,
            includeFiles,
            includeDirectories
          ))
        );
      }

      continue;
    }

    if (includeFiles) {
      entries.push({
        path,
        name: dirent.name,
        isDirectory: false
      });
    }
  }

  return entries;
};

const createPlanHash = (
  rootDir: string,
  directory: string,
  operations: RenameOperation[]
): string => {
  const payload = JSON.stringify({
    rootDir,
    directory,
    operations: operations.map(({ from, to, status }) => ({
      from,
      to,
      status
    }))
  });

  return createHash('sha256').update(payload).digest('hex');
};

const createOperations = async (
  input: RenameBatchInput,
  config: FileToolConfig
) => {
  const recursive = input.recursive ?? false;
  const includeFiles = input.includeFiles ?? true;
  const includeDirectories = input.includeDirectories ?? false;

  if (!includeFiles && !includeDirectories) {
    throw new ToolboxError(
      'RENAME_NOTHING_SELECTED',
      'Select files, directories, or both'
    );
  }

  if (recursive && includeDirectories) {
    throw new ToolboxError(
      'RENAME_RECURSIVE_DIRECTORIES_UNSUPPORTED',
      'Recursive directory renaming is not supported'
    );
  }

  const { rootDir, directory } = await resolveAllowedDirectory(
    input.directory,
    config
  );
  const regex = makeRegex(input.pattern, input.flags);
  const entries = await collectEntries(
    directory,
    recursive,
    includeFiles,
    includeDirectories
  );
  const operations: RenameOperation[] = [];
  const targetPaths = new Set<string>();

  for (const entry of entries) {
    regex.lastIndex = 0;
    const toName = entry.name.replace(regex, input.replacement);

    if (toName === entry.name) {
      continue;
    }

    const from = entry.path;
    const to = join(dirname(entry.path), toName);
    let status: RenameOperationStatus = 'pending';
    let reason: string | undefined;

    try {
      assertSafeTargetName(toName);

      if (!isPathInside(rootDir, to)) {
        throw new ToolboxError(
          'RENAME_TARGET_OUTSIDE_ROOT',
          'Target path is outside the configured file tool root'
        );
      }

      if (targetPaths.has(to)) {
        status = 'conflict';
        reason = 'Duplicate target path';
      } else if ((await pathExists(to)) && resolve(to) !== resolve(from)) {
        status = 'conflict';
        reason = 'Target path already exists';
      }
    } catch (error) {
      status = 'invalid';
      reason = error instanceof Error ? error.message : 'Invalid target path';
    }

    targetPaths.add(to);
    operations.push({
      from,
      to,
      fromRelative: relative(rootDir, from),
      toRelative: relative(rootDir, to),
      fromName: basename(from),
      toName,
      status,
      ...(reason ? { reason } : {})
    });
  }

  const maxOperations = input.limit
    ? Math.min(input.limit, config.maxRenameOperations)
    : config.maxRenameOperations;

  if (operations.length > maxOperations) {
    throw new ToolboxError(
      'RENAME_OPERATION_LIMIT_EXCEEDED',
      `Rename plan exceeds the ${maxOperations} operation limit`,
      {
        matchedCount: operations.length,
        maxOperations
      }
    );
  }

  return {
    rootDir,
    directory,
    recursive,
    operations
  };
};

export const renameBatch = async (
  input: RenameBatchInput,
  configOverride?: Partial<FileToolConfig>
): Promise<RenameBatchOutput> => {
  const dryRun = input.dryRun ?? true;
  const config = mergeFileToolConfig(configOverride);
  const { rootDir, directory, recursive, operations } = await createOperations(
    input,
    config
  );
  const planHash = createPlanHash(rootDir, directory, operations);
  const invalidOperations = operations.filter(
    (operation) => operation.status !== 'pending'
  );

  if (!dryRun) {
    if (!input.planHash || input.planHash !== planHash) {
      throw new ToolboxError(
        'RENAME_PLAN_CONFIRMATION_REQUIRED',
        'Run a dry run first, then execute with the returned planHash',
        {
          planHash
        }
      );
    }

    if (invalidOperations.length) {
      throw new ToolboxError(
        'RENAME_PLAN_HAS_ERRORS',
        'Rename plan contains invalid or conflicting operations',
        {
          invalidCount: invalidOperations.length,
          planHash
        }
      );
    }

    for (const operation of operations) {
      await rename(operation.from, operation.to);
      operation.status = 'renamed';
    }
  }

  return {
    directory,
    rootDir,
    recursive,
    dryRun,
    planHash,
    matchedCount: operations.length,
    renamedCount: operations.filter(
      (operation) => operation.status === 'renamed'
    ).length,
    skippedCount: operations.filter(
      (operation) =>
        operation.status === 'invalid' || operation.status === 'conflict'
    ).length,
    operations
  };
};

export const renameBatchTools: ToolboxTool[] = [
  {
    name: 'file.rename_batch',
    title: 'Batch Rename Files',
    description:
      'Preview and execute a regex-based batch rename inside the configured file root.',
    channels: ['api', 'mcp'],
    risks: ['file-write'],
    inputSchema: {
      type: 'object',
      required: ['directory', 'pattern', 'replacement'],
      additionalProperties: false,
      properties: {
        directory: { type: 'string' },
        pattern: { type: 'string' },
        replacement: { type: 'string' },
        flags: {
          type: 'string',
          default: 'g'
        },
        recursive: {
          type: 'boolean',
          default: false
        },
        includeFiles: {
          type: 'boolean',
          default: true
        },
        includeDirectories: {
          type: 'boolean',
          default: false
        },
        dryRun: {
          type: 'boolean',
          default: true
        },
        planHash: { type: 'string' },
        limit: {
          type: 'integer',
          minimum: 1
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'directory',
        'rootDir',
        'recursive',
        'dryRun',
        'planHash',
        'matchedCount',
        'renamedCount',
        'skippedCount',
        'operations'
      ],
      additionalProperties: false,
      properties: {
        directory: { type: 'string' },
        rootDir: { type: 'string' },
        recursive: { type: 'boolean' },
        dryRun: { type: 'boolean' },
        planHash: { type: 'string' },
        matchedCount: { type: 'integer' },
        renamedCount: { type: 'integer' },
        skippedCount: { type: 'integer' },
        operations: {
          type: 'array',
          items: {
            type: 'object'
          }
        }
      }
    },
    execute: async (input) => {
      try {
        return ok(await renameBatch(input as RenameBatchInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];

import { type NetworkField } from './shared/NetworkLookupTool';

export type NetworkLookupHistoryEntry = {
  label: string;
  values: Record<string, string>;
  createdAt: number;
};

const maxHistoryEntries = 8;

const storagePrefix = 'private-toolbox-network-history:';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const getStorage = (storage?: StorageLike): StorageLike | null => {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;

  return window.localStorage;
};

const getStorageKey = (toolName: string) => `${storagePrefix}${toolName}`;

const normalizeValues = (
  fields: NetworkField[],
  values: Record<string, string>
): Record<string, string> =>
  Object.fromEntries(
    fields.map((field) => [field.name, (values[field.name] ?? '').trim()])
  );

const hasQueryValue = (
  fields: NetworkField[],
  values: Record<string, string>
): boolean =>
  fields.some((field) => {
    const value = (values[field.name] ?? '').trim();
    if (!value) return false;

    const defaultValue = field.defaultValue?.trim();
    return defaultValue === undefined || value !== defaultValue;
  });

export const buildNetworkLookupHistoryLabel = (
  fields: NetworkField[],
  values: Record<string, string>
): string =>
  fields
    .map((field) => (values[field.name] ?? '').trim())
    .filter(Boolean)
    .join(' / ');

const isHistoryEntry = (value: unknown): value is NetworkLookupHistoryEntry => {
  if (typeof value !== 'object' || value === null) return false;

  const entry = value as Partial<NetworkLookupHistoryEntry>;
  return (
    typeof entry.label === 'string' &&
    typeof entry.createdAt === 'number' &&
    typeof entry.values === 'object' &&
    entry.values !== null &&
    !Array.isArray(entry.values)
  );
};

export const getNetworkLookupHistory = (
  toolName: string,
  storage?: StorageLike
): NetworkLookupHistoryEntry[] => {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return [];

  try {
    const parsed = JSON.parse(
      targetStorage.getItem(getStorageKey(toolName)) ?? '[]'
    ) as unknown;

    return Array.isArray(parsed) ? parsed.filter(isHistoryEntry) : [];
  } catch {
    return [];
  }
};

export const recordNetworkLookupHistory = (
  toolName: string,
  fields: NetworkField[],
  values: Record<string, string>,
  storage?: StorageLike
): NetworkLookupHistoryEntry[] => {
  const targetStorage = getStorage(storage);
  if (!targetStorage || fields.length === 0) return [];

  const normalizedValues = normalizeValues(fields, values);
  if (!hasQueryValue(fields, normalizedValues)) {
    return getNetworkLookupHistory(toolName, targetStorage);
  }

  const label = buildNetworkLookupHistoryLabel(fields, normalizedValues);
  const serializedValues = JSON.stringify(normalizedValues);
  const nextHistory = [
    {
      label,
      values: normalizedValues,
      createdAt: Date.now()
    },
    ...getNetworkLookupHistory(toolName, targetStorage).filter(
      (entry) => JSON.stringify(entry.values) !== serializedValues
    )
  ].slice(0, maxHistoryEntries);

  targetStorage.setItem(getStorageKey(toolName), JSON.stringify(nextHistory));

  return nextHistory;
};

export const clearNetworkLookupHistory = (
  toolName: string,
  storage?: StorageLike
) => {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return;

  targetStorage.removeItem(getStorageKey(toolName));
};

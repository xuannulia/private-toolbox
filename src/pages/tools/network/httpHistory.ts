export type HttpHistoryValue = string | number | boolean;

export type HttpHistoryEntry<TValues extends Record<string, HttpHistoryValue>> =
  {
    label: string;
    values: TValues;
    createdAt: number;
  };

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const maxHistoryEntries = 8;
const storagePrefix = 'private-toolbox-http-history:';

const getStorage = (storage?: StorageLike): StorageLike | null => {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;

  return window.localStorage;
};

const getStorageKey = (key: string) => `${storagePrefix}${key}`;

const isHttpHistoryEntry = <TValues extends Record<string, HttpHistoryValue>>(
  value: unknown
): value is HttpHistoryEntry<TValues> => {
  if (typeof value !== 'object' || value === null) return false;

  const entry = value as Partial<HttpHistoryEntry<TValues>>;
  return (
    typeof entry.label === 'string' &&
    typeof entry.createdAt === 'number' &&
    typeof entry.values === 'object' &&
    entry.values !== null &&
    !Array.isArray(entry.values)
  );
};

export const getHttpHistory = <
  TValues extends Record<string, HttpHistoryValue>
>(
  key: string,
  storage?: StorageLike
): HttpHistoryEntry<TValues>[] => {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return [];

  try {
    const parsed = JSON.parse(
      targetStorage.getItem(getStorageKey(key)) ?? '[]'
    );

    return Array.isArray(parsed)
      ? parsed.filter(isHttpHistoryEntry<TValues>)
      : [];
  } catch {
    return [];
  }
};

export const recordHttpHistory = <
  TValues extends Record<string, HttpHistoryValue>
>(
  key: string,
  label: string,
  values: TValues,
  storage?: StorageLike
): HttpHistoryEntry<TValues>[] => {
  const targetStorage = getStorage(storage);
  const normalizedLabel = label.trim();
  if (!targetStorage || !normalizedLabel) return getHttpHistory(key, storage);

  const serializedValues = JSON.stringify(values);
  const nextHistory = [
    {
      label: normalizedLabel,
      values,
      createdAt: Date.now()
    },
    ...getHttpHistory<TValues>(key, targetStorage).filter(
      (entry) => JSON.stringify(entry.values) !== serializedValues
    )
  ].slice(0, maxHistoryEntries);

  targetStorage.setItem(getStorageKey(key), JSON.stringify(nextHistory));

  return nextHistory;
};

export const clearHttpHistory = (key: string, storage?: StorageLike) => {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return;

  targetStorage.removeItem(getStorageKey(key));
};

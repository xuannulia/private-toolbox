const recentToolsKey = 'recentTools';
const maxRecentToolCount = 8;

const readStoredPaths = (): string[] =>
  localStorage
    .getItem(recentToolsKey)
    ?.split(',')
    .map((path) => path.trim())
    .filter(Boolean) ?? [];

export function getRecentToolPaths(): string[] {
  return readStoredPaths();
}

export function recordRecentTool(toolPath: string) {
  const normalizedPath = toolPath.trim();
  if (!normalizedPath) return;

  const paths = [
    normalizedPath,
    ...readStoredPaths().filter((path) => path !== normalizedPath)
  ].slice(0, maxRecentToolCount);

  localStorage.setItem(recentToolsKey, paths.join(','));
}

export function clearRecentTools() {
  localStorage.removeItem(recentToolsKey);
}

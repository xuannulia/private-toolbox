import { JsonValue, ToolResult } from '@private-toolbox/core';

export type ApiToolResult = ToolResult;

const defaultApiBaseUrl = 'http://127.0.0.1:4317';

export const getApiBaseUrl = (): string => {
  const configured = import.meta.env.VITE_PRIVATE_TOOLBOX_API_URL as
    | string
    | undefined;

  return (
    configured ||
    window.localStorage.getItem('private-toolbox-api-url') ||
    defaultApiBaseUrl
  ).replace(/\/$/, '');
};

export const setApiBaseUrl = (value: string) => {
  window.localStorage.setItem(
    'private-toolbox-api-url',
    value.replace(/\/$/, '')
  );
};

export const getApiToolErrorText = (result: ApiToolResult): string | null => {
  if (result.ok) return null;

  return `${result.error.code}: ${result.error.message}`;
};

export const toNetworkErrorResult = (
  code: string,
  fallbackMessage: string,
  error: unknown
): Extract<ApiToolResult, { ok: false }> => ({
  ok: false,
  error: {
    code,
    message: error instanceof Error ? error.message : fallbackMessage
  }
});

export const callApiTool = async (
  name: string,
  args: Record<string, JsonValue>,
  apiBaseUrl = getApiBaseUrl()
): Promise<ApiToolResult> => {
  const response = await fetch(`${apiBaseUrl}/api/tools/call`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      name,
      arguments: args
    })
  });

  const data = (await response.json()) as ApiToolResult;

  if (!response.ok && data.ok) {
    return {
      ok: false,
      error: {
        code: 'HTTP_ERROR',
        message: `API returned HTTP ${response.status}`
      }
    };
  }

  return data;
};

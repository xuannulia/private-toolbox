export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonSchema = Record<string, unknown>;

export type ToolChannel = 'web' | 'api' | 'mcp';

export type ToolRisk =
  | 'local'
  | 'network'
  | 'secret'
  | 'file-read'
  | 'file-write';

export type ToolExecutionContext = {
  signal?: AbortSignal;
  maxInputBytes?: number;
  maxOutputBytes?: number;
};

export type ToolError = {
  code: string;
  message: string;
  details?: JsonValue;
};

export type ToolResult<T extends JsonValue = JsonValue> =
  | {
      ok: true;
      result: T;
      metadata?: Record<string, JsonValue>;
    }
  | {
      ok: false;
      error: ToolError;
    };

export type ToolboxTool<
  TInput extends JsonValue = JsonValue,
  TOutput extends JsonValue = JsonValue
> = {
  name: string;
  title: string;
  description: string;
  channels: ToolChannel[];
  risks: ToolRisk[];
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  execute: (
    input: TInput,
    context?: ToolExecutionContext
  ) => ToolResult<TOutput> | Promise<ToolResult<TOutput>>;
};

export class ToolboxError extends Error {
  code: string;
  details?: JsonValue;

  constructor(code: string, message: string, details?: JsonValue) {
    super(message);
    this.name = 'ToolboxError';
    this.code = code;
    this.details = details;
  }
}

export const ok = <T extends JsonValue>(
  result: T,
  metadata?: Record<string, JsonValue>
): ToolResult<T> => ({
  ok: true,
  result,
  metadata
});

export const fail = (
  code: string,
  message: string,
  details?: JsonValue
): ToolResult<never> => ({
  ok: false,
  error: {
    code,
    message,
    details
  }
});

export const normalizeError = (error: unknown): ToolResult<never> => {
  if (error instanceof ToolboxError) {
    return fail(error.code, error.message, error.details);
  }

  if (error instanceof Error) {
    return fail('TOOL_ERROR', error.message);
  }

  return fail('TOOL_ERROR', 'Unknown tool error');
};

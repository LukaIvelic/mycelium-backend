export const ASSISTANT_DEFAULT_MODEL = 'gpt-4.1';
export const ASSISTANT_DEFAULT_BASE_URL = 'https://api.openai.com/v1';
export const ASSISTANT_DEFAULT_MAX_OUTPUT_TOKENS = 700;
export const ASSISTANT_DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
export const ASSISTANT_DEFAULT_RATE_LIMIT_MAX_REQUESTS = 20;

export const ASSISTANT_DEFAULT_SYSTEM_PROMPT =
  'You are the Mycelium console assistant. Help users inspect projects, traces, logs, service graphs, API keys, and workspace settings. Keep answers concise, operational, and grounded in the conversation context.';

export function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

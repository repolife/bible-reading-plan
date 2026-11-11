import type { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message ?? code);
    this.name = 'HttpError';
  }
}

export const json = (statusCode: number, body: unknown): HandlerResponse => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    // Responses can contain member emails or a one-time password.
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(body),
});

export function parseJsonBody(event: HandlerEvent): Record<string, unknown> {
  if (!event.body) throw new HttpError(400, 'missing_body', 'Request body is required');
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body must be JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError(400, 'invalid_json', 'Request body must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new HttpError(400, 'invalid_request', `${field} must be a UUID`);
  }
  return value.toLowerCase();
}

// Wraps a handler with method checks and uniform error responses. Unexpected
// errors are logged by name only: messages can echo request or upstream data.
export function createHandler(
  methods: string[],
  fn: (event: HandlerEvent) => Promise<HandlerResponse>,
): Handler {
  return async (event) => {
    if (!methods.includes(event.httpMethod)) {
      return json(405, { error: 'method_not_allowed' });
    }
    try {
      return await fn(event);
    } catch (error) {
      if (error instanceof HttpError) {
        return json(error.status, { error: error.code, message: error.message, ...error.extra });
      }
      console.error('Unhandled function error:', error instanceof Error ? error.name : typeof error);
      return json(500, { error: 'internal_error', message: 'Something went wrong' });
    }
  };
}

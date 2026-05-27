import type { HandlerResponse } from '@netlify/functions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, stripe-signature',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

export function jsonResponse(statusCode: number, payload: unknown, headers: Record<string, string> = {}): HandlerResponse {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(payload),
  };
}

export function emptyOptionsResponse(): HandlerResponse {
  return {
    statusCode: 204,
    headers: corsHeaders,
    body: '',
  };
}

export function methodNotAllowed(allowedMethods: string[]): HandlerResponse {
  return jsonResponse(405, {
    error: 'Method not allowed',
    allowedMethods,
  }, {
    Allow: allowedMethods.join(', '),
  });
}

export function parseJsonBody<T extends Record<string, unknown>>(rawBody: string | null): T {
  try {
    return JSON.parse(rawBody || '{}') as T;
  } catch {
    const error = new Error('Invalid JSON body');
    error.name = 'BadRequestError';
    throw error;
  }
}

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    const error = new Error(`${name} is not configured in the Netlify environment.`);
    error.name = 'MissingEnvironmentVariableError';
    throw error;
  }

  return value;
}

export function errorResponse(error: unknown, fallbackMessage: string, fallbackStatus = 500): HandlerResponse {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const statusCode = error instanceof Error && error.name === 'BadRequestError' ? 400 : fallbackStatus;

  return jsonResponse(statusCode, {
    error: message || fallbackMessage,
  });
}

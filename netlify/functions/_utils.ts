import type { HandlerResponse } from '@netlify/functions';

const LOCAL_DEVELOPMENT_ORIGINS = ['http://localhost:5173', 'http://localhost:8888'];

function normalizeOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function configuredAllowedOrigins(): string[] {
  const configured = [
    process.env.APP_BASE_URL,
    process.env.VITE_APP_BASE_URL,
    process.env.URL,
    process.env.DEPLOY_URL,
    process.env.DEPLOY_PRIME_URL,
  ];

  return Array.from(new Set([
    ...configured.map(normalizeOrigin).filter((origin): origin is string => Boolean(origin)),
    ...LOCAL_DEVELOPMENT_ORIGINS,
  ]));
}

export function corsHeaders(requestOrigin?: string): Record<string, string> {
  const allowedOrigins = configuredAllowedOrigins();
  const normalizedRequestOrigin = normalizeOrigin(requestOrigin);
  const allowedOrigin = normalizedRequestOrigin && allowedOrigins.includes(normalizedRequestOrigin)
    ? normalizedRequestOrigin
    : allowedOrigins[0];

  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, stripe-signature',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    Vary: 'Origin',
  };

  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
  }

  return headers;
}

export function jsonResponse(statusCode: number, payload: unknown, headers: Record<string, string> = {}, requestOrigin?: string): HandlerResponse {
  return {
    statusCode,
    headers: {
      ...corsHeaders(requestOrigin),
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(payload),
  };
}

export function emptyOptionsResponse(requestOrigin?: string): HandlerResponse {
  return {
    statusCode: 204,
    headers: corsHeaders(requestOrigin),
    body: '',
  };
}

export function methodNotAllowed(allowedMethods: string[], requestOrigin?: string): HandlerResponse {
  return jsonResponse(405, {
    error: 'Method not allowed',
    allowedMethods,
  }, {
    Allow: allowedMethods.join(', '),
  }, requestOrigin);
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

export function errorResponse(error: unknown, fallbackMessage: string, fallbackStatus = 500, requestOrigin?: string): HandlerResponse {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const statusCode = error instanceof Error && error.name === 'BadRequestError' ? 400 : fallbackStatus;

  return jsonResponse(statusCode, {
    error: message || fallbackMessage,
  }, {}, requestOrigin);
}

export const publicConfig = {
  pocketBaseUrl: import.meta.env.VITE_POCKETBASE_URL?.trim() || '',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL?.trim() || 'support@example.com',
  appBaseUrl: import.meta.env.VITE_APP_BASE_URL?.trim() || window.location.origin,
  appName: 'PuzzleFlow AI',
} as const;

export function getPublicConfigWarning(): string | null {
  if (!publicConfig.pocketBaseUrl) {
    return 'PuzzleFlow AI is missing VITE_POCKETBASE_URL. Authentication and saved rooms are unavailable until the Netlify environment variable is configured.';
  }

  return null;
}

export function getCanonicalUrl(path = '/'): string {
  const baseUrl = publicConfig.appBaseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

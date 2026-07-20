import type { NextRequest } from 'next/server';

/** Checkout / Portal の return URL 用ベース URL */
export function resolveAppBaseUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const origin = request.headers.get('origin')?.trim();
  if (origin) return origin.replace(/\/$/, '');
  const host = request.headers.get('host');
  if (host) return `https://${host}`;
  return 'http://localhost:3000';
}

/**
 * Stripe を経由しない subscription 更新（デモ申込・デモダウングレード等）。
 * 本番では無効。ローカル開発または `NEXT_PUBLIC_MANABIBA_ALLOW_DEMO_SUBSCRIPTION_PATH=true` のときのみ有効。
 */
export function isDemoSubscriptionPathEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_MANABIBA_ALLOW_DEMO_SUBSCRIPTION_PATH === 'true') {
    return true;
  }
  return process.env.NODE_ENV === 'development';
}

export const DEMO_SUBSCRIPTION_PATH_DISABLED_MSG =
  'プランの変更は Stripe 決済（または Customer Portal）経由で行います。本番環境ではデモ用の直接変更は無効です。';

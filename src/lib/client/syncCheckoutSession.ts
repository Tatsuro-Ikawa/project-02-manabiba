import type { User } from 'firebase/auth';
import { buildJsonAuthHeaders } from '@/lib/clientAuthHeaders';
import { messageFromApiErrorPayload } from '@/lib/apiErrorMessage';

/** Checkout 成功後、Webhook 未達時のフォールバック同期 */
export async function syncCheckoutSessionFromStripe(
  user: User,
  sessionId: string
): Promise<{ ok: true; plan: string }> {
  const authHeaders = await buildJsonAuthHeaders(user);
  const res = await fetch('/api/stripe/sync-checkout-session', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });

  const raw = await res.text();
  let json: { ok?: boolean; plan?: string; error?: string | { message?: string } } = {};
  if (raw.trim()) {
    try {
      json = JSON.parse(raw) as typeof json;
    } catch {
      throw new Error('申込内容の同期に失敗しました（サーバー応答の解析に失敗）。');
    }
  }

  if (!res.ok || !json.ok) {
    throw new Error(messageFromApiErrorPayload(json) || '申込内容の同期に失敗しました。');
  }

  return { ok: true, plan: typeof json.plan === 'string' ? json.plan : '' };
}

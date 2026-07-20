import type { User } from 'firebase/auth';
import { buildJsonAuthHeaders } from '@/lib/clientAuthHeaders';
import { messageFromApiErrorPayload } from '@/lib/apiErrorMessage';

/** Stripe Customer Portal へ遷移（B-4: プラン変更・解約・支払い方法） */
export async function openStripeCustomerPortal(
  user: User,
  returnPath = '/courses/change'
): Promise<void> {
  const authHeaders = await buildJsonAuthHeaders(user);
  const res = await fetch('/api/stripe/customer-portal', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnPath }),
  });

  const raw = await res.text();
  let json: { url?: string; error?: string | { message?: string } } = {};
  if (raw.trim()) {
    try {
      json = JSON.parse(raw) as typeof json;
    } catch {
      throw new Error('Customer Portal の準備に失敗しました（サーバー応答の解析に失敗）。');
    }
  }

  if (!res.ok) {
    throw new Error(messageFromApiErrorPayload(json) || 'Customer Portal の準備に失敗しました。');
  }

  if (!json.url || typeof json.url !== 'string') {
    throw new Error('Customer Portal の URL が取得できませんでした。');
  }

  window.location.href = json.url;
}

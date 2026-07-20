import type { User } from 'firebase/auth';
import { buildJsonAuthHeaders } from '@/lib/clientAuthHeaders';
import { messageFromApiErrorPayload } from '@/lib/apiErrorMessage';
import type { CheckoutPlan } from '@/lib/stripe/planPrices';

export type ChangePlanResult = {
  ok: true;
  mode: 'upgrade_immediate' | 'downgrade_at_period_end';
  plan: CheckoutPlan;
  openPricing?: boolean;
  effectiveAt?: string;
};

/** STD ↔ PRE のプラン変更（オープン期間中は Coupon 適用） */
export async function changeStripePlan(
  user: User,
  plan: CheckoutPlan
): Promise<ChangePlanResult> {
  const authHeaders = await buildJsonAuthHeaders(user);
  const res = await fetch('/api/stripe/change-plan', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });

  const raw = await res.text();
  let json: ChangePlanResult & { error?: string | { message?: string } } = {
    ok: true,
    mode: 'upgrade_immediate',
    plan,
  };
  if (raw.trim()) {
    try {
      json = JSON.parse(raw) as typeof json;
    } catch {
      throw new Error('プラン変更の準備に失敗しました（サーバー応答の解析に失敗）。');
    }
  }

  if (!res.ok) {
    throw new Error(messageFromApiErrorPayload(json) || 'プラン変更に失敗しました。');
  }

  if (!json.ok) {
    throw new Error('プラン変更に失敗しました。');
  }

  return json;
}

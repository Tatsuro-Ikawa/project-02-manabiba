/**
 * オープン期間限定価格（Coupon）の期間判定。
 * 既定終了: 2026-12-31 23:59:59 JST（特商法・LP と整合）
 * 延長時は OPEN_PRICING_ENDS_AT / NEXT_PUBLIC_OPEN_PRICING_ENDS_AT（ISO）を更新。
 */
export const DEFAULT_OPEN_PRICING_ENDS_AT = '2026-12-31T23:59:59+09:00';

export function resolveOpenPricingEndsAtMs(): number {
  const raw =
    (typeof process !== 'undefined' &&
      (process.env.NEXT_PUBLIC_OPEN_PRICING_ENDS_AT?.trim() ||
        process.env.OPEN_PRICING_ENDS_AT?.trim())) ||
    '';
  if (raw) {
    const ms = Date.parse(raw);
    if (Number.isFinite(ms)) return ms;
  }
  return Date.parse(DEFAULT_OPEN_PRICING_ENDS_AT);
}

/** オープン期間内なら true（初回・再申込・アップ／ダウンとも期間限定価格の対象） */
export function isOpenPricingPeriodActive(nowMs: number = Date.now()): boolean {
  return nowMs <= resolveOpenPricingEndsAtMs();
}

'use client';

/**
 * 保存結果メッセージ用。非表示時も1行分の高さを確保し、下のコンテンツが縦に動かないようにする。
 * aria-live でスクリーンリーダーにも保存完了を通知。
 */
export default function TrialSaveStatusLine({
  message,
  saving,
  variant = 'default',
}: {
  message: string | null;
  saving?: boolean;
  /** 月次などインラインスタイルに近い見た目 */
  variant?: 'default' | 'compact-secondary';
}) {
  const showContent = Boolean(message) || Boolean(saving);
  const inner =
    showContent && message ? (
      <>
        {message}
        {saving ? '（保存中）' : null}
      </>
    ) : showContent && saving ? (
      <>保存中…</>
    ) : (
      '\u00a0'
    );

  const baseClass =
    variant === 'compact-secondary'
      ? 'mb-3 min-h-[1.25rem] flex items-start text-[12px] leading-normal'
      : 'mb-3 min-h-[1.375rem] flex items-start';

  const textClass =
    variant === 'compact-secondary'
      ? `m-0 ${showContent ? '' : 'invisible'}`
      : `text-sm text-gray-700 m-0 leading-normal ${showContent ? '' : 'invisible'}`;

  const style =
    variant === 'compact-secondary' && showContent
      ? { color: 'var(--color-text-secondary)' }
      : undefined;

  return (
    <div className={baseClass} role="status" aria-live="polite" aria-atomic="true">
      <p className={textClass} style={style}>
        {inner}
      </p>
    </div>
  );
}

'use client';

type JournalCoachShareHeaderProps = {
  /** パーソナルコーチ機能（プレミアム等）が有効か */
  enabled: boolean;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  /** スクリーンリーダー用（例: 「今週の学び帳をコーチに共有」） */
  ariaLabel?: string;
  /** コーチ閲覧時: トグルではなく状態表示のみ */
  readOnly?: boolean;
};

/** 週・月タブ見出し右上: コーチ共有の状態表示＋トグル（行動宣言タイトルバーと同趣旨） */
export function JournalCoachShareHeader({
  enabled,
  checked,
  disabled = false,
  onChange,
  ariaLabel = 'コーチに共有する',
  readOnly = false,
}: JournalCoachShareHeaderProps) {
  if (!enabled) return null;

  if (readOnly) {
    return (
      <span
        className={`journal-coach-share-header journal-coach-share-header--readonly${checked ? ' is-shared' : ''}`}
        title={checked ? 'クライアントがコーチ共有 ON' : 'クライアントがコーチ共有 OFF'}
      >
        {checked ? 'コーチ共有中' : '未共有'}
      </span>
    );
  }

  return (
    <label className="journal-coach-share-header" title="コーチに閲覧共有します">
      <input
        type="checkbox"
        className="journal-coach-share-header-input"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="journal-coach-share-header-text" aria-hidden="true">
        コーチと共有
      </span>
    </label>
  );
}

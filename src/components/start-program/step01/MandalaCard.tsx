'use client';

import {
  type MandalaDomainDef,
  type MandalaEntryLocal,
  countUnicodeChars,
} from '@/lib/startProgram/mandalaConstants';

type MandalaCardProps = {
  domain: MandalaDomainDef;
  entries: MandalaEntryLocal[];
  onOpen: () => void;
};

/** 領域カード（プレビュー＋クリックでモーダル） */
export default function MandalaCard({ domain, entries, onOpen }: MandalaCardProps) {
  const previewLines = entries.map((e) => e.text.trim()).filter(Boolean);
  const overflow = Math.max(0, previewLines.length - 5);

  return (
    <button
      type="button"
      className="mandala-card"
      onClick={onOpen}
      aria-label={`${domain.label}を編集（${entries.length}件）`}
    >
      <span className="mandala-card-icon material-symbols-outlined" aria-hidden>
        {domain.icon}
      </span>
      <span className="mandala-card-label">{domain.label}</span>
      <span className="mandala-card-subtitle">{domain.subtitle}</span>
      <span className="mandala-card-preview" aria-hidden={previewLines.length === 0}>
        {previewLines.length === 0 ? (
          <span className="mandala-card-preview-empty">クリックして入力</span>
        ) : (
          <>
            <ul className="mandala-card-preview-list">
              {previewLines.slice(0, 5).map((text, i) => (
                <li key={`${domain.id}-pv-${i}`}>
                  {countUnicodeChars(text) > 40 ? `${[...text].slice(0, 40).join('')}…` : text}
                </li>
              ))}
            </ul>
            {overflow > 0 ? <span className="mandala-card-preview-more">+{overflow}件</span> : null}
          </>
        )}
      </span>
    </button>
  );
}

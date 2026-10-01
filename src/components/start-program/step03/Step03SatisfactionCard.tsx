'use client';

import {
  type MandalaDomainDef,
  type MandalaEntryLocal,
  countUnicodeChars,
} from '@/lib/startProgram/mandalaConstants';
import type { DomainSatisfaction } from '@/lib/startProgram/step03Constants';

type Step03SatisfactionCardProps = {
  domain: MandalaDomainDef;
  step01Entries: MandalaEntryLocal[];
  satisfaction: DomainSatisfaction;
  onOpen: () => void;
};

/** Step3 領域カード（表示のみ・タップで点数モーダル） */
export default function Step03SatisfactionCard({
  domain,
  step01Entries,
  satisfaction,
  onOpen,
}: Step03SatisfactionCardProps) {
  const previewLines = step01Entries.map((e) => e.text.trim()).filter(Boolean);
  const overflow = Math.max(0, previewLines.length - 4);
  const scored = satisfaction.score != null;

  return (
    <button
      type="button"
      className={`mandala-card step03-sat-card${scored ? ' is-scored' : ' is-unscored'}`}
      onClick={onOpen}
      aria-label={`${domain.label}の満足度を入力${scored ? `（現在${satisfaction.score}/10）` : '（未評価）'}`}
    >
      <span className="mandala-card-icon material-symbols-outlined" aria-hidden>
        {domain.icon}
      </span>
      <span className="mandala-card-label">{domain.label}</span>
      <span className="mandala-card-subtitle">{domain.subtitle}</span>

      <span className={`step03-sat-scorebox${scored ? ' is-scored' : ''}`}>
        <span className="step03-sat-scorebox-label">満足度</span>
        <span className="step03-sat-scorebox-value">
          {scored ? satisfaction.score : '—'}
        </span>
      </span>

      <span className="mandala-card-preview" aria-hidden={previewLines.length === 0}>
        {previewLines.length === 0 ? (
          <span className="mandala-card-preview-empty">Step1 の願望なし</span>
        ) : (
          <>
            <ul className="mandala-card-preview-list">
              {previewLines.slice(0, 4).map((text, i) => (
                <li key={`${domain.id}-pv-${i}`}>
                  {countUnicodeChars(text) > 36 ? `${[...text].slice(0, 36).join('')}…` : text}
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

'use client';

import { useEffect, useId, useMemo } from 'react';
import { MANDALA_DOMAINS, type MandalaDomainId } from '@/lib/startProgram/mandalaConstants';
import { isValidSatisfactionScore, type Step03SatisfactionStore } from '@/lib/startProgram/step03Constants';
import { step04Progress, type Step04Store } from '@/lib/startProgram/step04Constants';

type Step04ThemeModalProps = {
  step03: Step03SatisfactionStore;
  store: Step04Store;
  reasonMin: number;
  onSelect: (domainId: MandalaDomainId) => void;
  onClose: () => void;
};

type DomainRow = {
  id: MandalaDomainId;
  label: string;
  score: number | null;
  isFocus: boolean;
  isCandidate: boolean;
};

export default function Step04ThemeModal({ step03, store, reasonMin, onSelect, onClose }: Step04ThemeModalProps) {
  const titleId = useId();
  const focusId = step03.focusDomainId;

  /** Step3 の取組領域 → 候補 → その他（満足度の低い順） */
  const rows = useMemo<DomainRow[]>(() => {
    const list = MANDALA_DOMAINS.map((d) => {
      const s = step03.domains[d.id]?.score;
      return {
        id: d.id,
        label: d.label,
        score: isValidSatisfactionScore(s) ? s : null,
        isFocus: d.id === focusId,
        isCandidate: step03.candidateDomainIds.includes(d.id),
      };
    });
    const rank = (r: DomainRow) => (r.isFocus ? 0 : r.isCandidate ? 1 : 2);
    return list.sort((a, b) => {
      const byRank = rank(a) - rank(b);
      if (byRank !== 0) return byRank;
      return (a.score ?? 99) - (b.score ?? 99);
    });
  }, [focusId, step03.candidateDomainIds, step03.domains]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="mandala-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mandala-modal step04-theme-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="mandala-modal-header">
          <h3 id={titleId} className="mandala-modal-title">
            テーマにする領域を選択してください。
          </h3>
          <button type="button" className="mandala-modal-close" onClick={onClose} aria-label="閉じる">
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </header>

        <ul className="step04-theme-list" aria-label="領域一覧">
          {rows.map((row) => {
            const theme = store.themes[row.id];
            const progress = theme ? step04Progress(theme, reasonMin) : null;
            const isActive = store.activeDomainId === row.id;
            const status = !theme
              ? null
              : progress?.completed
                ? '完了'
                : `取組中（理由 ${progress?.reasonCount ?? 0}件）`;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className={`step04-theme-item${isActive ? ' is-active' : ''}`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => onSelect(row.id)}
                >
                  <span className="step04-theme-item-name">{row.label}</span>
                  <span className="step04-theme-item-score">
                    満足度 {row.score != null ? `${row.score}/10` : '—'}
                  </span>
                  {row.isFocus ? <span className="step04-badge step04-badge--focus">Step3の取組領域</span> : null}
                  {!row.isFocus && row.isCandidate ? <span className="step04-badge">Step3の候補</span> : null}
                  {status ? (
                    <span className={`step04-badge${progress?.completed ? ' step04-badge--done' : ' step04-badge--wip'}`}>
                      {status}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="step03-sat-modal-done">
          <button type="button" className="mandala-modal-btn mandala-modal-btn--primary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

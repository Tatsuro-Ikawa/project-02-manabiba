'use client';

import { getMandalaDomain } from '@/lib/startProgram/mandalaConstants';
import {
  truncatePillLabel,
  type InterestOption,
  type MandalaWishRef,
} from '@/lib/startProgram/step02Constants';

type Step02InterestDeepDiveProps = {
  wishes: MandalaWishRef[];
  optionsByWish: Record<string, InterestOption[]>;
  onOpenWish: (entryId: string) => void;
};

export default function Step02InterestDeepDive({
  wishes,
  optionsByWish,
  onOpenWish,
}: Step02InterestDeepDiveProps) {
  if (wishes.length === 0) {
    return (
      <p className="step02-empty-hint">
        興味・関心に分類された願望がありません。Step1 で願望に「A. 興味・関心」を選んでください。
      </p>
    );
  }

  return (
    <div className="step02-interest-dig">
      <h3 className="seven-steps-worksheet-subheading">興味・関心をまとめてみよう</h3>
      <p className="seven-steps-worksheet-body">
        下記の項目を選択して、どのようなところに興味・関心があるのかを探っていきましょう。
      </p>

      <ol className="step02-interest-wish-list">
        {wishes.map((wish, i) => {
          const domain = getMandalaDomain(wish.domainId);
          const selected = (optionsByWish[wish.entryId] ?? []).filter((o) => o.selected);
          return (
            <li key={wish.entryId}>
              <button
                type="button"
                className="step02-interest-wish-card"
                onClick={() => onOpenWish(wish.entryId)}
              >
                <span className="step02-interest-wish-top">
                  <span className="step02-interest-wish-num">{i + 1}.</span>
                  <span className="step02-interest-wish-text">{wish.text}</span>
                  {domain ? (
                    <span className="step02-interest-domain-pill">
                      <span className="material-symbols-outlined" aria-hidden>
                        {domain.icon}
                      </span>
                      {domain.label}
                    </span>
                  ) : null}
                </span>
                {selected.length > 0 ? (
                  <span className="step02-interest-selected-pills">
                    {selected.map((o) => (
                      <span
                        key={o.id}
                        className="step02-interest-mini-pill"
                        title={o.label}
                      >
                        {truncatePillLabel(o.label)}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="step02-interest-selected-empty">タップして掘り下げる</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

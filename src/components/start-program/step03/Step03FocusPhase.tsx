'use client';

import { useEffect, useMemo } from 'react';
import { Step03RadarChartBlock } from '@/components/start-program/step03/Step03RadarPhase';
import { useStep03CandidateMax } from '@/hooks/useStep03CandidateMax';
import {
  getMandalaDomain,
  type MandalaDomainId,
} from '@/lib/startProgram/mandalaConstants';
import {
  STEP03_SCORE_MAX,
  STEP03_SCORE_MIN,
  criteriaTotal,
  domainsSortedBySatisfactionAsc,
  lowestScoreDomainIds,
  suggestFocusDomainId,
  type FocusCriteria,
  type Step03SatisfactionStore,
} from '@/lib/startProgram/step03Constants';

type Step03FocusPhaseProps = {
  store: Step03SatisfactionStore;
  onCandidatesChange: (ids: MandalaDomainId[]) => void;
  onCriteriaChange: (domainId: MandalaDomainId, patch: Partial<FocusCriteria>) => void;
  onFocusChange: (id: MandalaDomainId | null) => void;
};

type CriteriaKey = keyof FocusCriteria;

function parseScoreInput(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.min(STEP03_SCORE_MAX, Math.max(STEP03_SCORE_MIN, Math.round(n)));
}

function ScoreCell({
  value,
  disabled,
  ariaLabel,
  onChange,
}: {
  value: number | null;
  disabled: boolean;
  ariaLabel: string;
  onChange: (n: number | null) => void;
}) {
  return (
    <input
      type="number"
      className="step03-focus-table-input"
      inputMode="numeric"
      min={STEP03_SCORE_MIN}
      max={STEP03_SCORE_MAX}
      step={1}
      disabled={disabled}
      aria-label={ariaLabel}
      value={value ?? ''}
      placeholder={disabled ? '' : '0〜10'}
      onChange={(e) => onChange(parseScoreInput(e.target.value))}
    />
  );
}

export default function Step03FocusPhase({
  store,
  onCandidatesChange,
  onCriteriaChange,
  onFocusChange,
}: Step03FocusPhaseProps) {
  const { candidateMax } = useStep03CandidateMax();
  const suggestedLow = useMemo(
    () => new Set(lowestScoreDomainIds(store.domains, 3)),
    [store.domains]
  );
  const sortedRows = useMemo(
    () => domainsSortedBySatisfactionAsc(store.domains),
    [store.domains]
  );
  const { bestId, tied } = suggestFocusDomainId(
    store.candidateDomainIds,
    store.criteriaByDomain
  );

  useEffect(() => {
    if (store.candidateDomainIds.length > candidateMax) {
      onCandidatesChange(store.candidateDomainIds.slice(0, candidateMax));
    }
  }, [candidateMax, onCandidatesChange, store.candidateDomainIds]);

  const toggleCandidate = (id: MandalaDomainId) => {
    const has = store.candidateDomainIds.includes(id);
    if (has) {
      onCandidatesChange(store.candidateDomainIds.filter((x) => x !== id));
      if (store.focusDomainId === id) onFocusChange(null);
      return;
    }
    if (store.candidateDomainIds.length >= candidateMax) return;
    onCandidatesChange([...store.candidateDomainIds, id]);
  };

  const setCriterion = (id: MandalaDomainId, key: CriteriaKey, n: number | null) => {
    onCriteriaChange(id, { [key]: n });
  };

  const applySuggestedFocus = () => {
    if (bestId) onFocusChange(bestId);
  };

  const focusDef = store.focusDomainId ? getMandalaDomain(store.focusDomainId) : undefined;

  return (
    <div className="step03-focus">
      <h2 className="seven-steps-worksheet-heading">取り組みたい領域を決める</h2>
      <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
        レーダーを見ながら、満足度の低い順の表で候補を最大{candidateMax}
        つ選び、重要度・ワクワク度・変化可能性（各0〜10）を記入してください。合計が最大の領域を最優先にします（同点は明示選択）。上限は設定画面で変更できます。
      </p>

      <Step03RadarChartBlock domains={store.domains} />

      <section className="step03-focus-guide" aria-label="選ぶときの視点">
        <ul>
          <li>人生のバランス（レーダーの偏り）</li>
          <li>重要度（人生にとって大切か）</li>
          <li>ワクワク度（満足度が上がるとワクワクするか）</li>
          <li>変化可能性（いま取り組めそうか）</li>
        </ul>
      </section>

      <section className="step03-focus-table-section" aria-label="領域の三点評価表">
        <h3 className="step03-sat-section-label">
          候補を選んで評価する（最大{candidateMax}）
          <span className="step03-sat-section-hint">
            低満足トップ3をハイライト（強制ではありません）
          </span>
        </h3>
        <p className="step03-focus-table-count" aria-live="polite">
          選択中 {store.candidateDomainIds.length}/{candidateMax}
        </p>

        <div className="step03-focus-table-wrap">
          <table className="step03-focus-table">
            <thead>
              <tr>
                <th scope="col" className="step03-focus-table-col-check">
                  選択
                </th>
                <th scope="col">人生の領域</th>
                <th scope="col" className="step03-focus-table-col-num">
                  満足度
                </th>
                <th scope="col" className="step03-focus-table-col-num">
                  重要度
                </th>
                <th scope="col" className="step03-focus-table-col-num">
                  ワクワク度
                </th>
                <th scope="col" className="step03-focus-table-col-num">
                  変化可能性
                </th>
                <th scope="col" className="step03-focus-table-col-num">
                  合計
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(({ id, score }) => {
                const def = getMandalaDomain(id);
                const checked = store.candidateDomainIds.includes(id);
                const low = suggestedLow.has(id);
                const disabledSelect =
                  !checked && store.candidateDomainIds.length >= candidateMax;
                const crit = store.criteriaByDomain[id];
                const total = checked ? criteriaTotal(crit) : null;
                const label = def?.label ?? id;

                return (
                  <tr
                    key={id}
                    className={`${checked ? 'is-checked' : ''}${low ? ' is-suggested' : ''}${
                      disabledSelect ? ' is-disabled' : ''
                    }`}
                  >
                    <td className="step03-focus-table-col-check">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabledSelect}
                        aria-label={`${label}を候補にする`}
                        onChange={() => toggleCandidate(id)}
                      />
                    </td>
                    <td>
                      <span className="step03-focus-table-domain">{label}</span>
                      {low ? <span className="step03-focus-candidate-tag">低満足</span> : null}
                    </td>
                    <td className="step03-focus-table-col-num step03-focus-table-sat">
                      {score != null ? score : '—'}
                    </td>
                    <td className="step03-focus-table-col-num">
                      <ScoreCell
                        value={checked ? (crit?.importance ?? null) : null}
                        disabled={!checked}
                        ariaLabel={`${label}の重要度`}
                        onChange={(n) => setCriterion(id, 'importance', n)}
                      />
                    </td>
                    <td className="step03-focus-table-col-num">
                      <ScoreCell
                        value={checked ? (crit?.excitement ?? null) : null}
                        disabled={!checked}
                        ariaLabel={`${label}のワクワク度`}
                        onChange={(n) => setCriterion(id, 'excitement', n)}
                      />
                    </td>
                    <td className="step03-focus-table-col-num">
                      <ScoreCell
                        value={checked ? (crit?.feasibility ?? null) : null}
                        disabled={!checked}
                        ariaLabel={`${label}の変化可能性`}
                        onChange={(n) => setCriterion(id, 'feasibility', n)}
                      />
                    </td>
                    <td className="step03-focus-table-col-num step03-focus-table-total">
                      {total != null ? total : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {store.candidateDomainIds.length > 0 ? (
        <section className="step03-focus-decide" aria-label="取組領域の決定">
          {tied ? (
            <p className="step03-focus-tie-note" role="status">
              合計が同点の候補があります。下から「最初に取り組む領域」を選んでください。
            </p>
          ) : bestId ? (
            <p className="step03-focus-suggest-note" role="status">
              合計最大の候補: <strong>{getMandalaDomain(bestId)?.label}</strong>
              <button
                type="button"
                className="mandala-modal-btn mandala-modal-btn--secondary"
                onClick={applySuggestedFocus}
              >
                これを選ぶ
              </button>
            </p>
          ) : (
            <p className="step03-focus-tie-note">
              選択した行に三点をすべて記入すると、合計からおすすめが出せます。
            </p>
          )}

          <label className="step03-focus-select-label">
            最初に取り組む領域
            <select
              value={store.focusDomainId ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                onFocusChange(v ? (v as MandalaDomainId) : null);
              }}
            >
              <option value="">（未選択）</option>
              {store.candidateDomainIds.map((id) => (
                <option key={id} value={id}>
                  {getMandalaDomain(id)?.label ?? id}
                  {criteriaTotal(store.criteriaByDomain[id]) != null
                    ? `（合計 ${criteriaTotal(store.criteriaByDomain[id])}）`
                    : ''}
                </option>
              ))}
            </select>
          </label>
        </section>
      ) : null}

      {focusDef ? (
        <section className="step03-focus-done" aria-live="polite">
          <h3 className="step03-sat-section-label">Step3 の決定</h3>
          <p>
            取組領域: <strong>{focusDef.label}</strong>
          </p>
          <p className="seven-steps-worksheet-hint">
            次の Step4 で、この領域の「なぜこの点数か／何が引っかかっているか」からこころのブレーキを探ります。
          </p>
        </section>
      ) : null}
    </div>
  );
}

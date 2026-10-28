'use client';

import type { AiControls } from '@/components/start-program/step05/Step05LayersPhase';
import { AiSuggestions } from '@/components/start-program/step05/Step05Parts';
import { clipStep05 } from '@/hooks/useStep05DesiredStateStore';
import { getStep05Layer, type Step05Theme } from '@/lib/startProgram/step05Constants';
import {
  MARKER_CADENCES,
  MARKER_KINDS,
  MARKER_ROLES,
  STEP05_MARKER_MAX,
  createPlanId,
  focusItemIds,
  markerValueLabel,
  satisfactionMarker,
  type MarkerKind,
  type MarkerSuggestion,
  type Step05Marker,
  type Step05PlanDraft,
  type Step05PlanProgress,
} from '@/lib/startProgram/step05PlanConstants';

type Step05MarkersPhaseProps = {
  theme: Step05Theme;
  progress: Step05PlanProgress;
  patchPlan: (fn: (p: Step05PlanDraft) => Step05PlanDraft) => void;
  markersAi: AiControls;
  onNext: () => void;
};

const KIND_DEFAULTS: Record<MarkerKind, Pick<Step05Marker, 'baseline' | 'target' | 'unit'>> = {
  count: { baseline: '0', target: '', unit: '回' },
  scale10: { baseline: '', target: '', unit: '' },
  yesno: { baseline: 'no', target: 'yes', unit: '' },
  words: { baseline: '', target: '', unit: '' },
};

function ValueInput({
  marker,
  value,
  label,
  onChange,
}: {
  marker: Step05Marker;
  value: string;
  label: string;
  onChange: (v: string) => void;
}) {
  if (marker.kind === 'scale10') {
    return (
      <label className="step05-marker-value">
        <span>{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {Array.from({ length: 11 }, (_, n) => (
            <option key={n} value={String(n)}>
              {n}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (marker.kind === 'yesno') {
    return (
      <label className="step05-marker-value">
        <span>{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="no">まだ</option>
          <option value="yes">できた</option>
        </select>
      </label>
    );
  }
  if (marker.kind === 'count') {
    return (
      <label className="step05-marker-value">
        <span>{label}</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(clipStep05(e.target.value, 'markerValue'))}
        />
        <span className="step05-marker-unit">{marker.unit || '回'}</span>
      </label>
    );
  }
  return (
    <label className="step05-marker-value is-words">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        placeholder={label === '今' ? '今の状態を一文で' : '目指す状態を一文で'}
        onChange={(e) => onChange(clipStep05(e.target.value, 'markerValue'))}
      />
    </label>
  );
}

function MarkerEditor({
  marker,
  onChange,
  onRemove,
}: {
  marker: Step05Marker;
  onChange: (m: Step05Marker) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="step05-marker">
      <div className="step05-marker-row">
        <input
          type="text"
          className="step05-marker-label"
          value={marker.label}
          placeholder="しるしの名前（例：月の出店回数）"
          onChange={(e) => onChange({ ...marker, label: clipStep05(e.target.value, 'markerLabel') })}
        />
        {onRemove ? (
          <button type="button" className="step04-dd-link" onClick={onRemove}>
            削除
          </button>
        ) : null}
      </div>
      <div className="step05-marker-row">
        <span className="step05-marker-key">種類</span>
        {MARKER_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            className={`step04-dd-pill step05-marker-pill${marker.kind === k.id ? ' is-selected' : ''}`}
            title={k.hint || undefined}
            onClick={() => {
              if (marker.kind !== k.id) onChange({ ...marker, kind: k.id, ...KIND_DEFAULTS[k.id] });
            }}
          >
            {k.label}
          </button>
        ))}
      </div>
      <div className="step05-marker-row">
        <ValueInput
          marker={marker}
          value={marker.baseline}
          label="今"
          onChange={(v) => onChange({ ...marker, baseline: v })}
        />
        <span className="step05-marker-arrow" aria-hidden>
          →
        </span>
        <ValueInput
          marker={marker}
          value={marker.target}
          label="目指す"
          onChange={(v) => onChange({ ...marker, target: v })}
        />
        {marker.kind === 'count' ? (
          <label className="step05-marker-value">
            <span>単位</span>
            <input
              type="text"
              className="step05-marker-unit-input"
              value={marker.unit}
              onChange={(e) => onChange({ ...marker, unit: e.target.value.slice(0, 8) })}
            />
          </label>
        ) : null}
      </div>
      <div className="step05-marker-row">
        <span className="step05-marker-key">確かめる</span>
        {MARKER_CADENCES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`step04-dd-pill step05-marker-pill${marker.cadence === c.id ? ' is-selected' : ''}`}
            onClick={() => onChange({ ...marker, cadence: c.id })}
          >
            {c.label}
          </button>
        ))}
        <span className="step05-marker-key">区分</span>
        {MARKER_ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`step04-dd-pill step05-marker-pill${marker.role === r.id ? ' is-selected' : ''}`}
            onClick={() => onChange({ ...marker, role: r.id })}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function suggestionText(s: MarkerSuggestion): string {
  const kind = MARKER_KINDS.find((k) => k.id === s.kind)?.label ?? '';
  return `${s.label}（${kind}・${markerValueLabel(s, s.baseline)} → ${markerValueLabel(s, s.target)}）`;
}

/** ⑦ 到達のしるし：重点ごとに「たどり着いたと分かるしるし」を決める */
export default function Step05MarkersPhase({ theme, progress, patchPlan, markersAi, onNext }: Step05MarkersPhaseProps) {
  const plan = theme.plan;
  const slot = theme.ai.markers;
  const focusIds = focusItemIds(theme);
  const sat = satisfactionMarker(plan);
  const full = plan.markers.length >= STEP05_MARKER_MAX;
  const orphans = plan.markers.filter((m) => m.itemId != null && !focusIds.includes(m.itemId));

  const update = (m: Step05Marker) =>
    patchPlan((p) => ({ ...p, markers: p.markers.map((x) => (x.id === m.id ? m : x)) }));
  const remove = (id: string) => patchPlan((p) => ({ ...p, markers: p.markers.filter((x) => x.id !== id) }));
  const add = (itemId: string, s?: MarkerSuggestion) =>
    patchPlan((p) =>
      p.markers.length >= STEP05_MARKER_MAX
        ? p
        : {
            ...p,
            markers: [
              ...p.markers,
              {
                id: createPlanId('m'),
                itemId,
                role: 'arrival',
                label: '',
                kind: 'scale10',
                cadence: 'monthly',
                ...KIND_DEFAULTS.scale10,
                ...s,
              },
            ],
          }
    );

  return (
    <div className="step05-markers">
      <h2 className="seven-steps-worksheet-heading">目標にたどり着いたと、何で分かりますか？</h2>
      <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
        重点ごとに「しるし」を決めましょう。数で表せないものは、無理に数にせず「10段階」や「ことば」で大丈夫です。
        途中で動き始める「手応えのしるし」も入れられます。しるしは満足度を含めて {STEP05_MARKER_MAX} 個までです。
      </p>

      {sat ? (
        <section className="step05-marker-card is-overall" aria-label="全体のしるし">
          <p className="step05-marker-card-head">
            <span className="step05-current-tag is-target">全体</span>
            {sat.label}
          </p>
          <p className="step05-marker-fixed">
            10段階　今 {markerValueLabel(sat, sat.baseline)} → 目指す {markerValueLabel(sat, sat.target)}　毎月
            <span className="step05-marker-note">（Step3 と前半の目標から自動で入ります）</span>
          </p>
        </section>
      ) : null}

      {focusIds.map((id) => {
        const item = theme.items.find((i) => i.id === id);
        if (!item) return null;
        const layer = getStep05Layer(item.layer);
        const mine = plan.markers.filter((m) => m.itemId === id);
        const suggestions = slot.data?.[id] ?? [];
        return (
          <section
            key={id}
            className={`step05-marker-card step05-marker-card--${item.layer}`}
            aria-label={`${layer.name}のしるし`}
          >
            <p className="step05-marker-card-head">
              <span className="step05-current-tag is-target">◎ {layer.name}</span>
              {item.target}
            </p>
            {plan.gaps[id] ? <p className="step05-marker-gap">違い：{plan.gaps[id]}</p> : null}

            {mine.map((m) => (
              <MarkerEditor key={m.id} marker={m} onChange={update} onRemove={() => remove(m.id)} />
            ))}

            <AiSuggestions
              slot={slot}
              label="しるしの候補"
              onRetry={markersAi.retry}
              onRefresh={markersAi.refresh}
              onDismissNotice={markersAi.dismissNotice}
            >
              <div className="step04-dd-pills">
                {suggestions.map((s) => {
                  const used = mine.some((m) => m.label === s.label);
                  return (
                    <button
                      key={s.label}
                      type="button"
                      className={`step04-dd-pill${used ? ' is-selected' : ''}`}
                      disabled={used || full}
                      onClick={() => add(id, s)}
                    >
                      ＋ {suggestionText(s)}
                    </button>
                  );
                })}
              </div>
            </AiSuggestions>
            <button type="button" className="step04-dd-link" disabled={full} onClick={() => add(id)}>
              ＋ 自分でしるしを追加
            </button>
          </section>
        );
      })}

      {orphans.length > 0 ? (
        <section className="step05-marker-card" aria-label="重点から外れた項目のしるし">
          <p className="step05-marker-card-head">重点から外れた項目のしるし（不要なら削除してください）</p>
          {orphans.map((m) => (
            <MarkerEditor key={m.id} marker={m} onChange={update} onRemove={() => remove(m.id)} />
          ))}
        </section>
      ) : null}

      <div className="step03-phase-actions">
        <button
          type="button"
          className="mandala-modal-btn mandala-modal-btn--primary"
          disabled={!progress.markersReady}
          onClick={onNext}
        >
          いつまでにへ
        </button>
        {!progress.markersReady ? (
          <p className="step03-phase-actions-hint">各重点にしるしを1つ以上決め、今と目指す値を入れてください</p>
        ) : (
          <p className="step03-phase-actions-hint">しるし {plan.markers.length} 個</p>
        )}
      </div>
    </div>
  );
}

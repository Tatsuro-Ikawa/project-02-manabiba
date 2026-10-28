'use client';

import { clipStep05 } from '@/hooks/useStep05DesiredStateStore';
import type { Step05Theme } from '@/lib/startProgram/step05Constants';
import type { Step05Context } from '@/lib/startProgram/step05Context';
import {
  STAGES,
  STEP05_NOTE_MAX_CHARS,
  createPlanId,
  isDateKey,
  stageName,
  type BrakeMark,
  type StageKind,
  type Step05PlanDraft,
} from '@/lib/startProgram/step05PlanConstants';

type Step05RiskPhaseProps = {
  ctx: Step05Context;
  theme: Step05Theme;
  patchPlan: (fn: (p: Step05PlanDraft) => Step05PlanDraft) => void;
  onNext: () => void;
};

/** ⑨ 振れ幅：うまくいかない時期がある前提で、計画に余白を持たせる（入力は任意） */
export default function Step05RiskPhase({ ctx, theme, patchPlan, onNext }: Step05RiskPhaseProps) {
  const plan = theme.plan;
  const start = plan.period?.startDate ?? '';
  const brakeSuggestions = theme.ai.milestones.data?.brakes ?? [];
  const scenes = ctx.insights.flatMap((ins) => ins.scenes.map((scene) => ({ ins, scene })));

  const findBrake = (reasonId: string, scene: string) =>
    plan.brakeMarks.find((b) => b.reasonId === reasonId && b.scene === scene);

  const setBrake = (reasonId: string, scene: string, patch: Partial<Omit<BrakeMark, 'id' | 'reasonId' | 'scene'>>) =>
    patchPlan((p) => {
      const cur = p.brakeMarks.find((b) => b.reasonId === reasonId && b.scene === scene);
      const next: BrakeMark = {
        id: cur?.id ?? createPlanId('b'),
        reasonId,
        scene,
        stageKind: null,
        note: '',
        ...cur,
        ...patch,
      };
      const rest = p.brakeMarks.filter((b) => b !== cur);
      return { ...p, brakeMarks: next.stageKind == null && !next.note.trim() ? rest : [...rest, next] };
    });

  const situation = (reasonId: string) => plan.situationMarks.find((s) => s.reasonId === reasonId);

  return (
    <div className="step05-risk">
      <h2 className="seven-steps-worksheet-heading">うまくいかない時期があるとしたら、いつ頃ですか？</h2>
      <p className="seven-steps-worksheet-body seven-steps-worksheet-hint">
        計画どおりに進まない時期があるのは自然なことです。先に余白を持たせておくと、ゆっくりになっても「見直しどき」として落ち着いて立て直せます。
        ここでの入力は任意です。
      </p>

      <section className="step05-risk-section" aria-label="忙しくなりそうな時期">
        <h3 className="step05-risk-title">忙しくなりそうな時期</h3>
        <p className="step05-risk-hint">
          例：子どもの冬休み、決算期。この期間は行動のめやすを下げる予定にします（Step6）。
        </p>
        {plan.busyPeriods.map((b) => (
          <div key={b.id} className="step05-busy-row">
            <input
              type="date"
              value={b.startDate}
              aria-label="開始"
              onChange={(e) =>
                isDateKey(e.target.value) &&
                patchPlan((p) => ({
                  ...p,
                  busyPeriods: p.busyPeriods.map((x) => (x.id === b.id ? { ...x, startDate: e.target.value } : x)),
                }))
              }
            />
            <span aria-hidden>〜</span>
            <input
              type="date"
              value={b.endDate}
              aria-label="終わり"
              onChange={(e) =>
                isDateKey(e.target.value) &&
                patchPlan((p) => ({
                  ...p,
                  busyPeriods: p.busyPeriods.map((x) => (x.id === b.id ? { ...x, endDate: e.target.value } : x)),
                }))
              }
            />
            <input
              type="text"
              className="step05-busy-reason"
              value={b.reason}
              maxLength={STEP05_NOTE_MAX_CHARS}
              placeholder="理由（例：子どもの冬休み）"
              onChange={(e) =>
                patchPlan((p) => ({
                  ...p,
                  busyPeriods: p.busyPeriods.map((x) =>
                    x.id === b.id ? { ...x, reason: clipStep05(e.target.value, 'note') } : x
                  ),
                }))
              }
            />
            <button
              type="button"
              className="step04-dd-link"
              onClick={() => patchPlan((p) => ({ ...p, busyPeriods: p.busyPeriods.filter((x) => x.id !== b.id) }))}
            >
              削除
            </button>
          </div>
        ))}
        <button
          type="button"
          className="step04-dd-link"
          disabled={!start}
          onClick={() =>
            patchPlan((p) => ({
              ...p,
              busyPeriods: [
                ...p.busyPeriods,
                { id: createPlanId('busy'), startDate: start, endDate: start, reason: '' },
              ],
            }))
          }
        >
          ＋ 時期を追加
        </button>
      </section>

      <section className="step05-risk-section" aria-label="余白の週">
        <h3 className="step05-risk-title">余白の週</h3>
        <label className="step05-focus-radio">
          <input
            type="checkbox"
            checked={plan.bufferWeekPerStage}
            onChange={(e) => patchPlan((p) => ({ ...p, bufferWeekPerStage: e.target.checked }))}
          />
          各段階の終わりに、1週の余白を置く（おすすめ）
        </label>
      </section>

      <section className="step05-risk-section" aria-label="ブレーキが出そうな節目">
        <h3 className="step05-risk-title">ブレーキが出そうな節目</h3>
        <p className="step05-risk-hint">
          Step4 で見つけた場面は、道のりのどこで出てきそうですか？ 目印を付けると、Step6 で乗り越え策を考えます。
        </p>
        {scenes.length === 0 ? <p className="step05-ref-empty">Step4 で選んだ場面はありません。</p> : null}
        {scenes.map(({ ins, scene }) => {
          const mark = findBrake(ins.reasonId, scene);
          const sug = brakeSuggestions.find((b) => b.reasonId === ins.reasonId && b.scene === scene);
          return (
            <div key={`${ins.reasonId}-${scene}`} className="step05-brake-row">
              <p className="step05-brake-scene">
                <span className="step05-current-tag is-now">場面</span>
                {scene}
                {ins.ownWords ? <span className="step05-brake-voice">こころの声：{ins.ownWords}</span> : null}
              </p>
              <div className="step05-marker-row">
                <span className="step05-marker-key">出そうな段階</span>
                {STAGES.map((s) => (
                  <button
                    key={s.kind}
                    type="button"
                    className={`step04-dd-pill step05-marker-pill${mark?.stageKind === s.kind ? ' is-selected' : ''}`}
                    onClick={() =>
                      setBrake(ins.reasonId, scene, {
                        stageKind: mark?.stageKind === s.kind ? null : (s.kind as StageKind),
                      })
                    }
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <input
                type="text"
                className="step05-busy-reason"
                value={mark?.note ?? ''}
                maxLength={STEP05_NOTE_MAX_CHARS}
                placeholder="どんな時？（例：初めて出店を申し込む前）"
                onChange={(e) => setBrake(ins.reasonId, scene, { note: clipStep05(e.target.value, 'note') })}
              />
              {sug ? (
                <button
                  type="button"
                  className={`step04-dd-pill step05-draft${mark?.note === sug.note ? ' is-selected' : ''}`}
                  onClick={() => setBrake(ins.reasonId, scene, { stageKind: sug.stageKind, note: sug.note })}
                >
                  提案：{stageName(sug.stageKind)} ― {sug.note}
                </button>
              ) : null}
            </div>
          );
        })}
      </section>

      <section className="step05-risk-section" aria-label="状況の阻害">
        <h3 className="step05-risk-title">状況の阻害（保留中の課題）</h3>
        <p className="step05-risk-hint">
          今は変えにくい課題のうち、計画に影響しそうなものに印を付けます。Step6 で別枠として扱います。
        </p>
        {ctx.deferred.length === 0 ? <p className="step05-ref-empty">保留中の課題はありません。</p> : null}
        {ctx.deferred.map((r) => {
          const mark = situation(r.id);
          return (
            <div key={r.id} className="step05-brake-row">
              <label className="step05-focus-radio">
                <input
                  type="checkbox"
                  checked={mark != null}
                  onChange={(e) =>
                    patchPlan((p) => ({
                      ...p,
                      situationMarks: e.target.checked
                        ? [...p.situationMarks, { reasonId: r.id, note: '' }]
                        : p.situationMarks.filter((s) => s.reasonId !== r.id),
                    }))
                  }
                />
                {r.text}
              </label>
              {mark ? (
                <input
                  type="text"
                  className="step05-busy-reason"
                  value={mark.note}
                  maxLength={STEP05_NOTE_MAX_CHARS}
                  placeholder="どう影響しそうか（任意）"
                  onChange={(e) =>
                    patchPlan((p) => ({
                      ...p,
                      situationMarks: p.situationMarks.map((s) =>
                        s.reasonId === r.id ? { ...s, note: clipStep05(e.target.value, 'note') } : s
                      ),
                    }))
                  }
                />
              ) : null}
            </div>
          );
        })}
      </section>

      <div className="step03-phase-actions">
        <button
          type="button"
          className="mandala-modal-btn mandala-modal-btn--primary"
          onClick={() => {
            patchPlan((p) => ({ ...p, riskReviewedAt: p.riskReviewedAt ?? Date.now() }));
            onNext();
          }}
        >
          確認した（道のりへ）
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { LayerModal, type AiControls } from '@/components/start-program/step05/Step05LayersPhase';
import { clipStep05 } from '@/hooks/useStep05DesiredStateStore';
import {
  STEP05_GOAL_MAX_CHARS,
  STEP05_PERIOD_MAX_CHARS,
  answerOf,
  answerSlots,
  toHaveContent,
  type Step05Theme,
} from '@/lib/startProgram/step05Constants';
import type { Step05Context } from '@/lib/startProgram/step05Context';

type Step05SummaryPhaseProps = {
  ctx: Step05Context;
  theme: Step05Theme;
  goalsAi: AiControls;
  onChange: (fn: (t: Step05Theme) => Step05Theme) => void;
};

export default function Step05SummaryPhase({ ctx, theme, goalsAi, onChange }: Step05SummaryPhaseProps) {
  const [editing, setEditing] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const goals = theme.ai.goals;
  const lines = answerSlots(ctx.reasons, 'have')
    .map((slot) => answerOf(theme, slot.reasonId, slot.tagId)?.target.trim() ?? '')
    .filter(Boolean);
  const loading = goals.status === 'loading';

  const askGoals = () => {
    setShowGoals(true);
    if (goals.status === 'idle' || goals.status === 'error' || goalsAi.stale) goalsAi.retry();
  };

  return (
    <div className="step05-summary">
      <section className="step05-have-card" aria-label="持ち方をまとめる">
        <h2 className="seven-steps-worksheet-heading">
          満足度が {theme.targetScore} の「持ち方」についてまとめてみましょう。
        </h2>
        <p className="seven-steps-worksheet-body">
          前ページで設定した内容を、下記に示しました。整合を見ながら、整えたい項目があれば編集できます。問題なければ、そのままでも進めます。
        </p>

        <div className="step05-have-list-row">
          <div>
            <h3 className="step05-summary-layer-title">持ち方／結果</h3>
            {lines.length === 0 ? (
              <p className="step05-summary-empty">持ち方は、まだ書かれていません。</p>
            ) : (
              <ul className="step05-summary-lines">
                {lines.map((line, index) => (
                  <li key={`${index}-${line}`}>{line}</li>
                ))}
              </ul>
            )}
          </div>
          <button type="button" className="step05-have-edit" onClick={() => setEditing(true)}>
            編集
          </button>
        </div>

        <h3 className="step05-have-heading">持ち方の目標</h3>
        <p className="seven-steps-worksheet-body">
          達成しやすさ、重要性、ワクワク感などの優先を考えながら、1から2文程度にまとめてください。
        </p>

        <section className="step05-have-ai" aria-label="Aiでまとめてみる">
          <h3 className="step05-have-heading">Aiでまとめてみる</h3>
          <div className="step05-have-ai-row">
            <p>Ai選択ボタンを押すと自動で選択肢候補が示されます。</p>
            <button type="button" className="step05-have-ai-btn" disabled={loading} onClick={askGoals}>
              Ai選択ボタン
            </button>
          </div>
          {showGoals && loading ? <p className="step05-summary-empty">候補を作っています…</p> : null}
          {showGoals && goals.status === 'error' ? (
            <p className="step05-summary-empty">候補を準備できませんでした。もう一度 Ai選択ボタンを押してください。</p>
          ) : null}
          {showGoals && !loading && (goals.data?.length ?? 0) > 0 ? (
            <ul className="step05-have-ai-list">
              {(goals.data ?? []).map((goal, index) => {
                const text = toHaveContent(goal);
                return (
                  <li key={`${index}-${text}`}>
                    <button
                      type="button"
                      className={theme.goal.statement === text ? 'is-selected' : undefined}
                      onClick={() =>
                        onChange((current) => ({
                          ...current,
                          goal: { ...current.goal, statement: clipStep05(text, 'goal') },
                        }))
                      }
                    >
                      ・{text}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        <textarea
          className="step04-reason-input step05-goal-input"
          rows={2}
          value={theme.goal.statement}
          maxLength={STEP05_GOAL_MAX_CHARS}
          placeholder="例：必要な知識を身につけている"
          aria-label="持ち方の目標"
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              goal: { ...current.goal, statement: clipStep05(event.target.value, 'goal') },
            }))
          }
        />

        <section className="step05-have-period" aria-label="実現時期">
          <h3 className="step05-have-heading">実現時期</h3>
          <p className="seven-steps-worksheet-body">
            「持ち方」を設定したら、実現時期も設定してみましょう。
            書き方は自由ですが、およその時期が分かる程度まで検討してみましょう。
            （〇年〇月、〇年〇月〇日、年ごろ、年末、年中旬など、西暦、元号どちらでも構いません。）
          </p>
          <input
            type="text"
            value={theme.goal.expressionPeriod}
            maxLength={STEP05_PERIOD_MAX_CHARS}
            placeholder="例：2027年3月、令和8年末"
            aria-label="実現時期"
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                goal: { ...current.goal, expressionPeriod: clipStep05(event.target.value, 'period') },
              }))
            }
          />
        </section>

      </section>

      <p className="step05-summary-next">なし方・あり方は、次のステップでまとめます。</p>

      {editing ? (
        <LayerModal
          layer="have"
          slots={answerSlots(ctx.reasons, 'have')}
          theme={theme}
          onChange={onChange}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </div>
  );
}

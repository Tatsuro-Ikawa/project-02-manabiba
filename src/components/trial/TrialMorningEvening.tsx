'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  addDaysDateKey,
  getTrial4wDailyPlain,
  saveTrial4wDailyPlain,
  type Trial4wEveningBrake,
  type Trial4wEveningExecution,
  type Trial4wMorningAffirmationDeclaration,
  type Trial4wDailyPlain,
} from '@/lib/firestore';

function formatDateLabelJa(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map((x) => Number(x));
  if (!y || !m || !d) return dateKey;
  return `${m}月${d}日 朝・晩のアクション`;
}

function InfoDetails({ title, body }: { title: string; body: string }) {
  return (
    <details className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-2 py-1">
      <summary className="cursor-pointer select-none">{title}</summary>
      <div className="mt-2 whitespace-pre-wrap leading-relaxed">{body}</div>
    </details>
  );
}

export default function TrialMorningEvening() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date'); // YYYY-MM-DD

  const [dateKey, setDateKey] = useState<string>(dateParam ?? '');
  const [data, setData] = useState<Trial4wDailyPlain | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (dateParam) setDateKey(dateParam);
  }, [dateParam]);

  const effectiveDateKey = useMemo(() => dateKey || dateParam || '', [dateKey, dateParam]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const doc = await getTrial4wDailyPlain(user.uid, effectiveDateKey || null);
      setData(doc);
    } catch (e) {
      console.error(e);
      setMsg(
        '読み込みに失敗しました。Firestore ルールのデプロイ（journal_daily）とログイン状態を確認してください。'
      );
      // 画面が止まらないように空の初期値で継続
      setData({
        dateKey: effectiveDateKey || '',
        tz: 'Asia/Tokyo',
        morningAffirmationDeclaration: null,
        morningTodayActionText: null,
        morningImagingDone: null,
        eveningExecution: null,
        eveningSpecificActionsText: null,
        eveningResultText: null,
        eveningSatisfaction: null,
        eveningEmotionThoughtText: null,
        eveningBrake: null,
        eveningRebuttalText: null,
        eveningInsightText: null,
        eveningMessageToSelfText: null,
        eveningTomorrowActionSeedText: null,
      });
    }
  }, [user, effectiveDateKey]);

  useEffect(() => {
    if (!loading && user) void load();
  }, [loading, user, load]);

  const savePatch = useCallback(
    async (patch: Partial<Trial4wDailyPlain>) => {
      if (!user || !data) return;
      setSaving(true);
      setMsg(null);
      try {
        await saveTrial4wDailyPlain({ uid: user.uid, dateKey: data.dateKey, patch });
        await load();
        setMsg('保存しました。');
        setTimeout(() => setMsg(null), 2500);
      } catch (e) {
        console.error(e);
        setMsg(e instanceof Error ? e.message : '保存に失敗しました。');
      } finally {
        setSaving(false);
      }
    },
    [user, data, load]
  );

  const gotoDate = useCallback((nextKey: string) => {
    setDateKey(nextKey);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'morning_evening');
    url.searchParams.set('date', nextKey);
    window.history.replaceState({}, '', url.pathname + url.search);
  }, []);

  if (!user && !loading) {
    return (
      <div className="trial-tab-content">
        <div className="morning-evening-container">
          <div className="trial-tab-heading-row">
            <h2 id="morning-evening-section-title">朝・晩</h2>
          </div>
          <p className="text-sm text-gray-600">ログインすると日次記録を保存できます。</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="trial-tab-content">
        <div className="morning-evening-container">
          <div className="trial-tab-heading-row">
            <h2 id="morning-evening-section-title">朝・晩</h2>
          </div>
          <p className="text-sm text-gray-500">読み込み中…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trial-tab-content">
      <div className="morning-evening-container">
        <div className="trial-tab-heading-row">
          <h2 id="morning-evening-section-title">朝・晩</h2>
        </div>
        <div className="date-nav">
          <button
            type="button"
            className="date-nav-btn"
            aria-label="前の日"
            onClick={() => gotoDate(addDaysDateKey(data.dateKey, -1))}
          >
            ‹
          </button>
          <span className="date-nav-label">{formatDateLabelJa(data.dateKey)}</span>
          <button
            type="button"
            className="date-nav-btn"
            aria-label="次の日"
            onClick={() => gotoDate(addDaysDateKey(data.dateKey, 1))}
          >
            ›
          </button>
        </div>

        {msg && <p className="text-sm text-gray-700 mb-3">{msg}</p>}

        {/* 朝コンテナ */}
        <div className="action-sub-section" data-section="morning">
          <h3>朝のアクション</h3>

          <div className="form-row">
            <div className="label-wrap">
              <span>アファメーションの宣言</span>
            </div>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={data.morningAffirmationDeclaration === 'done'}
                  disabled={saving}
                  onChange={(e) =>
                    void savePatch({
                      morningAffirmationDeclaration: (e.target.checked
                        ? 'done'
                        : 'undone') as Trial4wMorningAffirmationDeclaration,
                    })
                  }
                />{' '}
                完了
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="label-wrap">
              <span>今日の行動内容（目標）</span>
            </div>
            <InfoDetails
              title="補足（クリックで表示）"
              body={`昨日と同様の行動であっても、昨日の改善点やうまくできたことなどを踏まえた行動内容にすることが重要です。\n○○を◇◇にかえて行ってみる。\n昨日うまくできた○○を今日もできるようにする\nなど。`}
            />
            <textarea
              className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
              value={data.morningTodayActionText ?? ''}
              disabled={saving}
              onChange={(e) => setData((prev) => (prev ? { ...prev, morningTodayActionText: e.target.value } : prev))}
              onBlur={() => void savePatch({ morningTodayActionText: data.morningTodayActionText })}
              placeholder="入力してください"
            />
          </div>

          <div className="form-row">
            <div className="label-wrap">
              <span>今日の行動のイメージング</span>
            </div>
            <InfoDetails
              title="補足（クリックで表示）"
              body={`今日の行動内容を実際に行う場面を想定し、うまくできるようにイメージングします。\nどのように体を動かすのか、どのように話をするなど、より具体的にイメージしあたまの中でシミュレーションすることが大切です。`}
            />
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={data.morningImagingDone === true}
                  disabled={saving}
                  onChange={(e) => void savePatch({ morningImagingDone: e.target.checked })}
                />{' '}
                完了
              </label>
            </div>
          </div>
        </div>

        {/* 晩コンテナ */}
        <div className="action-sub-section" data-section="evening">
          <h3>晩のアクション</h3>

          <div className="form-row">
            <div className="label-wrap">
              <span>今日の行動内容（目標）の実行</span>
            </div>
            <div className="radio-group">
              {(
                [
                  ['done', '実行できた'],
                  ['partial', '一部できた'],
                  ['none', 'できなかった'],
                ] as const
              ).map(([v, label]) => (
                <label key={v}>
                  <input
                    type="radio"
                    name="eveningExecution"
                    value={v}
                    checked={data.eveningExecution === v}
                    disabled={saving}
                    onChange={() => void savePatch({ eveningExecution: v as Trial4wEveningExecution })}
                  />{' '}
                  {label}
                </label>
              ))}
            </div>
          </div>

          {(data.eveningExecution === 'done' || data.eveningExecution === 'partial') && (
            <div className="form-row">
              <div className="label-wrap">
                <span>具体的な行動内容</span>
              </div>
              <textarea
                className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
                value={data.eveningSpecificActionsText ?? ''}
                disabled={saving}
                onChange={(e) =>
                  setData((prev) =>
                    prev ? { ...prev, eveningSpecificActionsText: e.target.value } : prev
                  )
                }
                onBlur={() => void savePatch({ eveningSpecificActionsText: data.eveningSpecificActionsText })}
                placeholder="入力してください"
              />
            </div>
          )}

          <div className="form-row">
            <div className="label-wrap">
              <span>行動の成果への振り返り</span>
            </div>
            <InfoDetails
              title="補足（クリックで表示）"
              body={`行動の成果とは、実際に行ってみてどの程度達成できたか\nあるいは、最終目標にどの程度近づいたかを振り返ります。\n行動のし方に焦点をあてます。\n具体的に言語化することで、現在の行動のし方がどの程度\n成果につながっていけるかのヒントになります。`}
            />
            <textarea
              className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
              value={data.eveningResultText ?? ''}
              disabled={saving}
              onChange={(e) => setData((prev) => (prev ? { ...prev, eveningResultText: e.target.value } : prev))}
              onBlur={() => void savePatch({ eveningResultText: data.eveningResultText })}
              placeholder="入力してください"
            />
          </div>

          <div className="form-row">
            <div className="label-wrap">
              <span>満足度</span>
            </div>
            <div className="satisfaction-input">
              <input
                type="number"
                min={0}
                max={10}
                step={1}
                value={data.eveningSatisfaction ?? ''}
                disabled={saving}
                onChange={(e) =>
                  setData((prev) =>
                    prev
                      ? { ...prev, eveningSatisfaction: e.target.value === '' ? null : Number(e.target.value) }
                      : prev
                  )
                }
                onBlur={() => void savePatch({ eveningSatisfaction: data.eveningSatisfaction })}
                aria-label="満足度"
              />
              <span>点/10点</span>
            </div>
          </div>

          <div className="form-row">
            <div className="label-wrap">
              <span>行動時の感情・思考</span>
            </div>
            <textarea
              className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
              value={data.eveningEmotionThoughtText ?? ''}
              disabled={saving}
              onChange={(e) =>
                setData((prev) =>
                  prev ? { ...prev, eveningEmotionThoughtText: e.target.value } : prev
                )
              }
              onBlur={() => void savePatch({ eveningEmotionThoughtText: data.eveningEmotionThoughtText })}
              placeholder="入力してください"
            />
          </div>

          <div className="form-row">
            <div className="label-wrap">
              <span>こころのブレーキの作動</span>
            </div>
            <div className="radio-group">
              {(
                [
                  ['yes', 'あった'],
                  ['partial', '一部あった'],
                  ['no', 'なかった'],
                ] as const
              ).map(([v, label]) => (
                <label key={v}>
                  <input
                    type="radio"
                    name="eveningBrake"
                    value={v}
                    checked={data.eveningBrake === v}
                    disabled={saving}
                    onChange={() => void savePatch({ eveningBrake: v as Trial4wEveningBrake })}
                  />{' '}
                  {label}
                </label>
              ))}
            </div>
          </div>

          {(data.eveningBrake === 'yes' || data.eveningBrake === 'partial') && (
            <div className="form-row">
              <div className="label-wrap">
                <span>その時に反論できたか？　できた時の反論の言葉は何か</span>
              </div>
              <textarea
                className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
                value={data.eveningRebuttalText ?? ''}
                disabled={saving}
                onChange={(e) =>
                  setData((prev) =>
                    prev ? { ...prev, eveningRebuttalText: e.target.value } : prev
                  )
                }
                onBlur={() => void savePatch({ eveningRebuttalText: data.eveningRebuttalText })}
                placeholder="入力してください"
              />
            </div>
          )}

          <div className="form-row">
            <div className="label-wrap">
              <span>今日の気づき・感動・学び</span>
            </div>
            <textarea
              className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
              value={data.eveningInsightText ?? ''}
              disabled={saving}
              onChange={(e) => setData((prev) => (prev ? { ...prev, eveningInsightText: e.target.value } : prev))}
              onBlur={() => void savePatch({ eveningInsightText: data.eveningInsightText })}
              placeholder="入力してください"
            />
          </div>

          <div className="form-row">
            <div className="label-wrap">
              <span>今日の自分へのねぎらいの一言</span>
            </div>
            <textarea
              className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
              value={data.eveningMessageToSelfText ?? ''}
              disabled={saving}
              onChange={(e) =>
                setData((prev) =>
                  prev ? { ...prev, eveningMessageToSelfText: e.target.value } : prev
                )
              }
              onBlur={() => void savePatch({ eveningMessageToSelfText: data.eveningMessageToSelfText })}
              placeholder="入力してください"
            />
          </div>

          <div className="form-row">
            <div className="label-wrap">
              <span>今日の振り返りを踏まえた あすの行動内容（目標）</span>
            </div>
            <textarea
              className="w-full text-sm border border-gray-300 rounded p-2 min-h-[100px]"
              value={data.eveningTomorrowActionSeedText ?? ''}
              disabled={saving}
              onChange={(e) =>
                setData((prev) =>
                  prev ? { ...prev, eveningTomorrowActionSeedText: e.target.value } : prev
                )
              }
              onBlur={() => void savePatch({ eveningTomorrowActionSeedText: data.eveningTomorrowActionSeedText })}
              placeholder="入力してください（保存すると翌日の朝「今日の行動内容（目標）」に反映されます）"
            />
            <p className="text-xs text-gray-600">
              保存時、翌日の「今日の行動内容（目標）」が未入力なら自動でコピーします。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

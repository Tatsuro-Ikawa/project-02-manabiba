'use client';

import { useCallback, useMemo, useState } from 'react';
import { STEP00_MAX_CHARS, STEP00_QUESTIONS } from '@/lib/startProgram/sevenStepsConstants';

function countChars(s: string): number {
  return [...s].length;
}

/** Step0 ワークシート（7問・ローカル state。P2 で Firestore） */
export default function Step00WorksheetPane() {
  const initial = useMemo(
    () => Object.fromEntries(STEP00_QUESTIONS.map((q) => [q.id, ''])) as Record<string, string>,
    []
  );
  const [answers, setAnswers] = useState<Record<string, string>>(initial);

  const setAnswer = useCallback((id: string, value: string) => {
    if (countChars(value) > STEP00_MAX_CHARS) return;
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  return (
    <div className="seven-steps-worksheet seven-steps-worksheet--step00">
      <h2 className="seven-steps-worksheet-heading">自分の声、聴いていますか？</h2>
      <p className="seven-steps-worksheet-lead">まずは、あなたの声を聴いてみましょう</p>
      <p className="seven-steps-worksheet-body">
        Step0は、あなた自身をより深く理解し、望む人生へ踏み出すための“ウォーミングアップ”です。
        ここではまだ「完璧な答え」は必要ありません。まずは、あなた自身の“いまの気持ち”に耳を傾けることから始めましょう。
      </p>
      <h3 className="seven-steps-worksheet-subheading">あなたへの質問</h3>
      <p className="seven-steps-worksheet-body">
        次の質問に、素直に答えてみてください。深く考えないで直感的に書いていただいて構いません。あなたの“現時点の気持ち”を知るためのワークです。
      </p>

      <ol className="seven-steps-question-list">
        {STEP00_QUESTIONS.map((q, i) => {
          const value = answers[q.id] ?? '';
          const chars = countChars(value);
          return (
            <li key={q.id} className="seven-steps-question-item">
              <label className="seven-steps-question-label" htmlFor={`step00-${q.id}`}>
                <span className="seven-steps-question-num">{i + 1}.</span>
                {q.label}
              </label>
              <textarea
                id={`step00-${q.id}`}
                className="seven-steps-question-input"
                rows={3}
                value={value}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                aria-describedby={`step00-${q.id}-count`}
              />
              <p id={`step00-${q.id}-count`} className="seven-steps-char-count" aria-live="polite">
                {chars}/{STEP00_MAX_CHARS}
              </p>
            </li>
          );
        })}
      </ol>

      <p className="seven-steps-worksheet-footer">
        今の質問に答える中で「もう少し自分を深めてみたい」という気持ちが沸き起こって来たら、このプログラムはそのための時間になります。
        まだ答えがなくても大丈夫です。ここから一緒に、見つけていきましょう。
      </p>
    </div>
  );
}

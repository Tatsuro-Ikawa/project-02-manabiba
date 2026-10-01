'use client';

import { useEffect, useId, useState } from 'react';
import { countUnicodeChars } from '@/lib/startProgram/mandalaConstants';
import {
  VALUES_EMOTION_MAX_CHARS,
  VALUES_EPISODE_MAX_CHARS,
  VALUES_OPTION_MAX_CHARS,
  createValueOptionId,
  type MovingEpisode,
  type ValueOption,
} from '@/lib/startProgram/step02ValuesConstants';

type Props = {
  episode: MovingEpisode;
  onClose: () => void;
  onSave: (episode: MovingEpisode) => void;
  onFetchAiCandidates: (episode: string, emotion: string) => Promise<string[]>;
};

export default function Step02ValuesEpisodeModal({
  episode,
  onClose,
  onSave,
  onFetchAiCandidates,
}: Props) {
  const titleId = useId();
  const [local, setLocal] = useState(episode);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setLocal(episode);
    setAdding(false);
    setDraft('');
    setMsg(null);
  }, [episode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const persistAnd = (fn: () => void) => {
    onSave(local);
    fn();
  };

  const canFetchAi = local.episode.trim().length > 0 && local.emotion.trim().length > 0;

  const commitAdd = () => {
    const text = draft.trim();
    if (!text) {
      setMsg('文字を入力してください。');
      return;
    }
    if (countUnicodeChars(text) > VALUES_OPTION_MAX_CHARS) {
      setMsg(`${VALUES_OPTION_MAX_CHARS}文字以内で入力してください。`);
      return;
    }
    if (local.options.some((o) => o.label === text)) {
      setMsg('同じ候補がすでにあります。');
      return;
    }
    const opt: ValueOption = {
      id: createValueOptionId(),
      sourceId: local.id,
      sourceType: 'episode',
      label: text,
      source: 'manual',
      selected: true,
    };
    setLocal((prev) => ({ ...prev, options: [...prev.options, opt] }));
    setDraft('');
    setAdding(false);
    setMsg(null);
  };

  const handleFetchAi = async () => {
    if (!canFetchAi) {
      setMsg('出来事と感情を先に書いてください。');
      return;
    }
    setAiLoading(true);
    setMsg(null);
    try {
      const labels = await onFetchAiCandidates(local.episode.trim(), local.emotion.trim());
      if (labels.length === 0) {
        setMsg('候補を取得できませんでした。「＋追加」で書いてください。');
        return;
      }
      const existing = new Set(local.options.map((o) => o.label));
      const incoming = labels
        .filter((l) => !existing.has(l))
        .map(
          (label): ValueOption => ({
            id: createValueOptionId(),
            sourceId: local.id,
            sourceType: 'episode',
            label,
            source: 'dummy',
            selected: false,
          })
        );
      if (incoming.length === 0) setMsg('新しい候補はありません。');
      else {
        setLocal((prev) => ({ ...prev, options: [...prev.options, ...incoming] }));
        setMsg(`${incoming.length}件の価値観候補を追加しました。選んでください。`);
      }
    } catch {
      setMsg('候補の取得に失敗しました。');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div
      className="step02-interest-modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) persistAnd(onClose);
      }}
    >
      <div
        className="step02-interest-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="step02-interest-modal-header">
          <h3 id={titleId} className="step02-interest-modal-title">
            感動した出来事から価値観を見つける
          </h3>
          <button
            type="button"
            className="mandala-modal-close"
            aria-label="閉じる"
            onClick={() => persistAnd(onClose)}
          >
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </header>
        <div className="step02-interest-modal-body">
          <label className="step02-sentence-field-label">
            1. 感動した出来事
            <textarea
              className="step02-sentence-textarea"
              rows={3}
              value={local.episode}
              placeholder="心が動いた・感動したできごとを書いてください"
              maxLength={VALUES_EPISODE_MAX_CHARS}
              onChange={(e) => {
                if (countUnicodeChars(e.target.value) <= VALUES_EPISODE_MAX_CHARS) {
                  setLocal((prev) => ({ ...prev, episode: e.target.value }));
                }
              }}
            />
          </label>
          <label className="step02-sentence-field-label">
            そのときどんな感情・気持ち・感覚でしたか
            <textarea
              className="step02-sentence-textarea"
              rows={2}
              value={local.emotion}
              placeholder="例: 優しい気持ち、安心、誇らしい…"
              maxLength={VALUES_EMOTION_MAX_CHARS}
              onChange={(e) => {
                if (countUnicodeChars(e.target.value) <= VALUES_EMOTION_MAX_CHARS) {
                  setLocal((prev) => ({ ...prev, emotion: e.target.value }));
                }
              }}
            />
          </label>

          <p className="step02-interest-modal-lead">
            2. 出来事と感情から見える「価値観」を選んでください（複数可）
          </p>
          <p className="step02-interest-ai-row">
            <button
              type="button"
              className="step02-auto-draft-btn"
              disabled={aiLoading || !canFetchAi}
              onClick={handleFetchAi}
            >
              {aiLoading ? '取得中…' : 'Aiで価値観をリストアップ'}
            </button>
          </p>

          <div className="step02-interest-option-list" role="group">
            {local.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`step02-interest-option-pill${opt.selected ? ' is-selected' : ''}`}
                aria-pressed={opt.selected}
                onClick={() =>
                  setLocal((prev) => ({
                    ...prev,
                    options: prev.options.map((o) =>
                      o.id === opt.id ? { ...o, selected: !o.selected } : o
                    ),
                  }))
                }
              >
                {opt.label}
              </button>
            ))}
            {!adding ? (
              <button
                type="button"
                className="step02-interest-option-pill step02-interest-option-pill--add"
                onClick={() => setAdding(true)}
              >
                ＋追加
              </button>
            ) : null}
          </div>
          {adding ? (
            <div className="step02-interest-add-row">
              <input
                className="step02-interest-add-input"
                value={draft}
                placeholder="価値観を入力"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitAdd();
                  }
                }}
                autoFocus
              />
              <button type="button" className="step02-section-next-btn" onClick={commitAdd}>
                追加
              </button>
              <button
                type="button"
                className="step02-section-next-btn step02-section-next-btn--secondary"
                onClick={() => {
                  setAdding(false);
                  setDraft('');
                }}
              >
                キャンセル
              </button>
            </div>
          ) : null}
          {msg ? (
            <p className="mandala-modal-msg" role="status">
              {msg}
            </p>
          ) : null}
        </div>
        <footer className="step02-interest-modal-footer">
          <button
            type="button"
            className="step02-section-next-btn"
            onClick={() => persistAnd(onClose)}
          >
            保存して閉じる
          </button>
        </footer>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useId, useState } from 'react';
import { countUnicodeChars } from '@/lib/startProgram/mandalaConstants';
import {
  STRENGTH_EMOTION_MAX_CHARS,
  STRENGTH_EPISODE_MAX_CHARS,
  STRENGTH_OPTION_MAX_CHARS,
  createStrengthOptionId,
  type StrengthEpisode,
  type StrengthOption,
} from '@/lib/startProgram/step02StrengthConstants';

type Props = {
  episode: StrengthEpisode;
  onClose: () => void;
  onSave: (episode: StrengthEpisode) => void;
  onFetchAiCandidates: (
    kind: StrengthEpisode['kind'],
    episode: string,
    emotion: string
  ) => Promise<string[]>;
};

export default function Step02StrengthEpisodeModal({
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

  const isPraise = local.kind === 'praise';

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
    if (countUnicodeChars(text) > STRENGTH_OPTION_MAX_CHARS) {
      setMsg(`${STRENGTH_OPTION_MAX_CHARS}文字以内で入力してください。`);
      return;
    }
    if (local.options.some((o) => o.label === text)) {
      setMsg('同じ候補がすでにあります。');
      return;
    }
    const opt: StrengthOption = {
      id: createStrengthOptionId(),
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
      setMsg('場面と感情を先に書いてください。');
      return;
    }
    setAiLoading(true);
    setMsg(null);
    try {
      const labels = await onFetchAiCandidates(
        local.kind,
        local.episode.trim(),
        local.emotion.trim()
      );
      if (labels.length === 0) {
        setMsg('候補を取得できませんでした。「＋追加」で書いてください。');
        return;
      }
      const existing = new Set(local.options.map((o) => o.label));
      const incoming = labels
        .filter((l) => !existing.has(l))
        .map(
          (label): StrengthOption => ({
            id: createStrengthOptionId(),
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
        setMsg(`${incoming.length}件の得意・強み候補を追加しました。選んでください。`);
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
            {isPraise
              ? '他者からの言葉から得意・強みを見つける'
              : '自然とできた体験から得意・強みを見つける'}
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
            {isPraise
              ? '1. いつ・誰から・何と言われたか（場面）'
              : '1. 自然とできた／没頭できた場面'}
            <textarea
              className="step02-sentence-textarea"
              rows={3}
              value={local.episode}
              placeholder={
                isPraise
                  ? '例: ママ友に「段取り上手だね」と言われた'
                  : '例: 子どもの予定を立てて、無理なく回せた'
              }
              maxLength={STRENGTH_EPISODE_MAX_CHARS}
              onChange={(e) => {
                if (countUnicodeChars(e.target.value) <= STRENGTH_EPISODE_MAX_CHARS) {
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
              placeholder="例: 嬉しい、誇らしい、すっと動けた感じ…"
              maxLength={STRENGTH_EMOTION_MAX_CHARS}
              onChange={(e) => {
                if (countUnicodeChars(e.target.value) <= STRENGTH_EMOTION_MAX_CHARS) {
                  setLocal((prev) => ({ ...prev, emotion: e.target.value }));
                }
              }}
            />
          </label>

          <p className="step02-interest-modal-lead">
            2. 場面と感情から見える「得意・強み」を選んでください（複数可）
          </p>
          <p className="step02-interest-ai-row">
            <button
              type="button"
              className="step02-auto-draft-btn"
              disabled={aiLoading || !canFetchAi}
              onClick={handleFetchAi}
            >
              {aiLoading ? '取得中…' : 'Aiで得意・強みをリストアップ'}
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
                placeholder="得意・強みを入力"
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

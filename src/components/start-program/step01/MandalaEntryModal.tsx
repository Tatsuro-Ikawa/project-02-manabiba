'use client';

import { useEffect, useId, useRef, useState } from 'react';
import WishMotivationPicker from '@/components/start-program/WishMotivationPicker';
import {
  MANDALA_DOMAIN_MAX_ENTRIES,
  MANDALA_ENTRY_MAX_CHARS,
  type MandalaDomainDef,
  type MandalaEntryLocal,
  countUnicodeChars,
  createMandalaEntryId,
} from '@/lib/startProgram/mandalaConstants';
import { motivationShortLabel, type WishMotivation } from '@/lib/startProgram/wishMotivation';

type MandalaEntryModalProps = {
  domain: MandalaDomainDef;
  entries: MandalaEntryLocal[];
  onChange: (next: MandalaEntryLocal[]) => void;
  onClose: () => void;
};

type InputMode = 'add' | 'edit';

/**
 * 領域ごとの一覧＋追加／編集／削除モーダル。
 * 願望入力時に動機分類（A/B/C/D）を紐づけ（Step2 深掘りの起点）。
 */
export default function MandalaEntryModal({
  domain,
  entries,
  onChange,
  onClose,
}: MandalaEntryModalProps) {
  const titleId = useId();
  const pickerName = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState('');
  const [draftMotivation, setDraftMotivation] = useState<WishMotivation | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<InputMode>('add');
  const [msg, setMsg] = useState<string | null>(null);

  const draftChars = countUnicodeChars(draft);
  const atMax = entries.length >= MANDALA_DOMAIN_MAX_ENTRIES;
  const isEditing = mode === 'edit';
  const hasSelection = selectedId != null && entries.some((e) => e.id === selectedId);

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, []);

  const setDraftClamped = (value: string) => {
    if (countUnicodeChars(value) > MANDALA_ENTRY_MAX_CHARS) return;
    setDraft(value);
    setMsg(null);
  };

  const resetToAddMode = (clearSelection: boolean) => {
    setDraft('');
    setDraftMotivation(undefined);
    setMode('add');
    setMsg(null);
    if (clearSelection) setSelectedId(null);
  };

  const cancelEdit = () => {
    setDraft('');
    setDraftMotivation(undefined);
    setMode('add');
    setMsg(null);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (mode === 'edit') {
        e.preventDefault();
        setDraft('');
        setDraftMotivation(undefined);
        setMode('add');
        setMsg(null);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, onClose]);

  const selectRow = (entry: MandalaEntryLocal) => {
    if (mode === 'edit') {
      setDraft('');
      setDraftMotivation(undefined);
      setMode('add');
    }
    setSelectedId(entry.id);
    setMsg(null);
  };

  const validateDraft = (): boolean => {
    const text = draft.trim();
    if (!text) {
      setMsg('文字を入力してください。');
      return false;
    }
    if (!draftMotivation) {
      setMsg('「なぜその願望があるのか」を1つ選んでください。');
      return false;
    }
    return true;
  };

  const handleAdd = () => {
    if (isEditing) return;
    if (!validateDraft()) return;
    if (atMax) {
      setMsg(`1つの領域に登録できるのは最大${MANDALA_DOMAIN_MAX_ENTRIES}件です。`);
      return;
    }
    const now = Date.now();
    const next: MandalaEntryLocal = {
      id: createMandalaEntryId(),
      text: draft.trim(),
      domainId: domain.id,
      motivation: draftMotivation,
      createdAt: now,
      updatedAt: now,
      sortOrder: entries.length,
    };
    onChange([...entries, next]);
    resetToAddMode(true);
    inputRef.current?.focus();
  };

  const startEdit = () => {
    if (!selectedId) {
      setMsg('編集する項目を一覧から選んでください。');
      return;
    }
    const entry = entries.find((e) => e.id === selectedId);
    if (!entry) {
      setMsg('選択した項目が見つかりません。');
      setSelectedId(null);
      return;
    }
    setDraft(entry.text);
    setDraftMotivation(entry.motivation);
    setMode('edit');
    setMsg(null);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const saveEdit = () => {
    if (!selectedId) {
      setMsg('編集する項目を一覧から選んでください。');
      return;
    }
    if (!validateDraft()) return;
    onChange(
      entries.map((e) =>
        e.id === selectedId
          ? { ...e, text: draft.trim(), motivation: draftMotivation, updatedAt: Date.now() }
          : e
      )
    );
    resetToAddMode(true);
    inputRef.current?.focus();
  };

  const handleDelete = () => {
    if (!selectedId) {
      setMsg('削除する項目を一覧から選んでください。');
      return;
    }
    onChange(
      entries.filter((e) => e.id !== selectedId).map((e, i) => ({ ...e, sortOrder: i }))
    );
    resetToAddMode(true);
    inputRef.current?.focus();
  };

  return (
    <div
      className="mandala-modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="mandala-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="mandala-modal-header">
          <h2 id={titleId} className="mandala-modal-title">
            <span className="material-symbols-outlined" aria-hidden>
              {domain.icon}
            </span>
            {domain.label}
          </h2>
          <button
            type="button"
            className="mandala-modal-close"
            aria-label="閉じる"
            onClick={onClose}
          >
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </header>

        <div className="mandala-modal-list-wrap" aria-label="一覧">
          {entries.length === 0 ? (
            <p className="mandala-modal-list-empty">
              まだ項目がありません。下の欄に願望と分類を入力して「追加」してください。
            </p>
          ) : (
            <ul className="mandala-modal-list">
              {entries.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className={`mandala-modal-list-item ${e.id === selectedId ? 'is-selected' : ''}`}
                    onClick={() => selectRow(e)}
                  >
                    <span className="mandala-modal-list-badge" aria-label={`分類 ${motivationShortLabel(e.motivation)}`}>
                      {motivationShortLabel(e.motivation)}
                    </span>
                    <span className="mandala-modal-list-text">{e.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mandala-modal-input-wrap">
          <label className="mandala-modal-input-label" htmlFor={`mandala-input-${domain.id}`}>
            {isEditing ? '編集中の項目' : '新しい項目'}
          </label>
          <textarea
            id={`mandala-input-${domain.id}`}
            ref={inputRef}
            className="mandala-modal-input"
            rows={2}
            placeholder="願望を入力してください"
            value={draft}
            onChange={(e) => setDraftClamped(e.target.value)}
            aria-describedby={`mandala-count-${domain.id}`}
          />
          <p id={`mandala-count-${domain.id}`} className="seven-steps-char-count" aria-live="polite">
            {draftChars}/{MANDALA_ENTRY_MAX_CHARS}
          </p>

          <WishMotivationPicker
            name={pickerName}
            value={draftMotivation}
            onChange={(m) => {
              setDraftMotivation(m);
              setMsg(null);
            }}
            compact
          />

          {msg ? (
            <p className="mandala-modal-msg" role="status">
              {msg}
            </p>
          ) : null}
        </div>

        <footer className="mandala-modal-footer">
          <div className="mandala-modal-footer-left">
            <button type="button" className="mandala-modal-btn mandala-modal-btn--ghost" onClick={onClose}>
              閉じる
            </button>
            {isEditing ? (
              <button
                type="button"
                className="mandala-modal-btn mandala-modal-btn--ghost"
                onClick={cancelEdit}
              >
                キャンセル
              </button>
            ) : (
              <button
                type="button"
                className="mandala-modal-btn mandala-modal-btn--primary"
                onClick={handleAdd}
                disabled={atMax}
              >
                追加
              </button>
            )}
          </div>
          <div className="mandala-modal-footer-right">
            <button
              type="button"
              className="mandala-modal-btn mandala-modal-btn--danger"
              onClick={handleDelete}
              disabled={!hasSelection || isEditing}
              title={isEditing ? '編集をキャンセルしてから削除できます' : undefined}
            >
              削除
            </button>
            {isEditing ? (
              <button
                type="button"
                className="mandala-modal-btn mandala-modal-btn--primary"
                onClick={saveEdit}
              >
                保存
              </button>
            ) : (
              <button
                type="button"
                className="mandala-modal-btn mandala-modal-btn--secondary"
                onClick={startEdit}
                disabled={!hasSelection}
              >
                編集
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

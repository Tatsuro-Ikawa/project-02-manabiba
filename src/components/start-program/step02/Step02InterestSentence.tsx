'use client';

import {
  INTEREST_SENTENCE_ACTION_MAX_CHARS,
  INTEREST_SENTENCE_MAX_GROUPS,
  INTEREST_SENTENCE_PHRASE_MAX_CHARS,
  KEY_SENTENCE_PREDICATES,
  colorLabel,
  colorSwatch,
  emptyKeySentence,
  formatKeySentence,
  orderedUsedColorIds,
  type GroupColorId,
  type InterestGroupsByColor,
  type InterestTagColors,
  type KeySentence,
  type KeySentencePredicate,
  type KeySentencesByColor,
} from '@/lib/startProgram/step02Constants';
import { countUnicodeChars } from '@/lib/startProgram/mandalaConstants';

type Step02InterestSentenceProps = {
  tagColors: InterestTagColors;
  groups: InterestGroupsByColor;
  sentences: KeySentencesByColor;
  onChange: (colorId: GroupColorId, patch: Partial<Omit<KeySentence, 'groupColorId'>>) => void;
  onBackToGroup: () => void;
};

export default function Step02InterestSentence({
  tagColors,
  groups,
  sentences,
  onChange,
  onBackToGroup,
}: Step02InterestSentenceProps) {
  const colorIds = orderedUsedColorIds(tagColors).slice(0, INTEREST_SENTENCE_MAX_GROUPS);

  if (colorIds.length === 0) {
    return (
      <p className="step02-empty-hint">
        まとめたグループがありません。先に「まとめる」で色分け・命名してください。
      </p>
    );
  }

  const filledCount = colorIds.filter((id) => {
    const s = sentences[id];
    return s && s.interestPhrase.trim() && s.actionPhrase.trim();
  }).length;

  return (
    <div className="step02-sentence">
      <h3 className="seven-steps-worksheet-subheading">興味を文にしてみよう</h3>
      <p className="seven-steps-worksheet-body">
        まとめた言葉を、いまの行動の源として位置づけます。次の形で文を完成させてください。空欄のまま次に進んでも構いません（目安 1〜3 件）。
      </p>
      <p className="step02-sentence-template" aria-hidden>
        私は、【興味】に興味がある／が好きだ。だから、【行動・選択・ふるまい】のだ。
      </p>

      <p className="step02-group-name-toolbar">
        <button
          type="button"
          className="step02-section-next-btn step02-section-next-btn--secondary"
          onClick={onBackToGroup}
        >
          まとめるに戻る
        </button>
      </p>

      <div className="step02-sentence-list">
        {colorIds.map((colorId) => {
          const title = groups[colorId]?.title?.trim() ?? '';
          const sentence = sentences[colorId] ?? emptyKeySentence(colorId, title);
          const swatch = colorSwatch(colorId);
          return (
            <article
              key={colorId}
              className="step02-sentence-card"
              style={{ borderTopColor: swatch }}
            >
              <header className="step02-sentence-card-header">
                <span
                  className="step02-group-column-dot"
                  style={{ background: swatch }}
                  aria-hidden
                />
                <span className="step02-sentence-card-title">
                  {title || colorLabel(colorId)}
                </span>
              </header>

              <label className="step02-sentence-field-label">
                興味を示す言葉
                <input
                  className="step02-sentence-input"
                  value={sentence.interestPhrase}
                  placeholder="グループ名が入ります（編集可）"
                  maxLength={INTEREST_SENTENCE_PHRASE_MAX_CHARS}
                  onChange={(e) => {
                    if (countUnicodeChars(e.target.value) <= INTEREST_SENTENCE_PHRASE_MAX_CHARS) {
                      onChange(colorId, { interestPhrase: e.target.value });
                    }
                  }}
                />
              </label>

              <fieldset className="step02-sentence-predicates">
                <legend className="step02-sentence-field-label">述語</legend>
                <div className="step02-sentence-predicate-options">
                  {KEY_SENTENCE_PREDICATES.map((p) => (
                    <label key={p.id} className="step02-sentence-predicate-option">
                      <input
                        type="radio"
                        name={`pred-${colorId}`}
                        checked={sentence.predicate === p.id}
                        onChange={() =>
                          onChange(colorId, { predicate: p.id as KeySentencePredicate })
                        }
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
                {sentence.predicate === 'custom' ? (
                  <input
                    className="step02-sentence-input"
                    value={sentence.customPredicate}
                    placeholder="例: を大切にしている"
                    maxLength={INTEREST_SENTENCE_PHRASE_MAX_CHARS}
                    onChange={(e) => {
                      if (countUnicodeChars(e.target.value) <= INTEREST_SENTENCE_PHRASE_MAX_CHARS) {
                        onChange(colorId, { customPredicate: e.target.value });
                      }
                    }}
                  />
                ) : null}
              </fieldset>

              <label className="step02-sentence-field-label">
                行動・選択・ふるまい
                <textarea
                  className="step02-sentence-textarea"
                  rows={2}
                  value={sentence.actionPhrase}
                  placeholder="例: 毎日絵を描く／創作の時間を大切にする"
                  maxLength={INTEREST_SENTENCE_ACTION_MAX_CHARS}
                  onChange={(e) => {
                    if (countUnicodeChars(e.target.value) <= INTEREST_SENTENCE_ACTION_MAX_CHARS) {
                      onChange(colorId, { actionPhrase: e.target.value });
                    }
                  }}
                />
              </label>

              <p className="step02-sentence-preview" aria-live="polite">
                <span className="step02-sentence-preview-label">プレビュー</span>
                {formatKeySentence(sentence)}
              </p>
            </article>
          );
        })}
      </div>

      <p className="step02-progress" role="status">
        記入済み: <strong>{filledCount}</strong> / {colorIds.length}（空でも次へ進めます）
      </p>
    </div>
  );
}

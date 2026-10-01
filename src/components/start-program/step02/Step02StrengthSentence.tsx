'use client';

import {
  STRENGTH_KEY_PREDICATES,
  STRENGTH_SENTENCE_ACTION_MAX,
  STRENGTH_SENTENCE_MAX_GROUPS,
  STRENGTH_SENTENCE_PHRASE_MAX,
  emptyStrengthSentence,
  formatStrengthKeySentence,
  type StrengthKeySentence,
  type StrengthPredicateId,
  type StrengthSentencesByColor,
} from '@/lib/startProgram/step02StrengthConstants';
import {
  colorLabel,
  colorSwatch,
  orderedUsedColorIds,
  type GroupColorId,
  type InterestGroupsByColor,
  type InterestTagColors,
} from '@/lib/startProgram/step02Constants';
import { countUnicodeChars } from '@/lib/startProgram/mandalaConstants';

type Props = {
  tagColors: InterestTagColors;
  groups: InterestGroupsByColor;
  sentences: StrengthSentencesByColor;
  onChange: (
    colorId: GroupColorId,
    patch: Partial<Omit<StrengthKeySentence, 'groupColorId'>>
  ) => void;
  onBackToGroup: () => void;
};

export default function Step02StrengthSentence({
  tagColors,
  groups,
  sentences,
  onChange,
  onBackToGroup,
}: Props) {
  const colorIds = orderedUsedColorIds(tagColors).slice(0, STRENGTH_SENTENCE_MAX_GROUPS);

  if (colorIds.length === 0) {
    return (
      <p className="step02-empty-hint">
        まとめたグループがありません。先に「まとめる」で色分け・命名してください。
      </p>
    );
  }

  const filledCount = colorIds.filter((id) => {
    const s = sentences[id];
    return s && s.strengthPhrase.trim() && s.actionPhrase.trim();
  }).length;

  return (
    <div className="step02-sentence">
      <h3 className="seven-steps-worksheet-subheading">得意・強みを文にしてみよう</h3>
      <p className="seven-steps-worksheet-body">
        得意・強みを、日々のふるまいにつなげます。空欄のまま次に進んでも構いません（目安 1〜3 件）。
      </p>
      <p className="step02-sentence-template" aria-hidden>
        私は、【得意・強み】が得意だ／が強みだ／が自然にできる。だから、【ふるまい】のだ。
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
          const sentence = sentences[colorId] ?? emptyStrengthSentence(colorId, title);
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
                得意・強みを示す言葉
                <input
                  className="step02-sentence-input"
                  value={sentence.strengthPhrase}
                  placeholder="グループ名が入ります（編集可）"
                  maxLength={STRENGTH_SENTENCE_PHRASE_MAX}
                  onChange={(e) => {
                    if (countUnicodeChars(e.target.value) <= STRENGTH_SENTENCE_PHRASE_MAX) {
                      onChange(colorId, { strengthPhrase: e.target.value });
                    }
                  }}
                />
              </label>

              <fieldset className="step02-sentence-predicates">
                <legend className="step02-sentence-field-label">述語</legend>
                <div className="step02-sentence-predicate-options">
                  {STRENGTH_KEY_PREDICATES.map((p) => (
                    <label key={p.id} className="step02-sentence-predicate-option">
                      <input
                        type="radio"
                        name={`spred-${colorId}`}
                        checked={sentence.predicate === p.id}
                        onChange={() =>
                          onChange(colorId, { predicate: p.id as StrengthPredicateId })
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
                    placeholder="例: を活かして動きたい"
                    maxLength={STRENGTH_SENTENCE_PHRASE_MAX}
                    onChange={(e) => {
                      if (countUnicodeChars(e.target.value) <= STRENGTH_SENTENCE_PHRASE_MAX) {
                        onChange(colorId, { customPredicate: e.target.value });
                      }
                    }}
                  />
                ) : null}
              </fieldset>

              <label className="step02-sentence-field-label">
                ふるまい・選択・態度
                <textarea
                  className="step02-sentence-textarea"
                  rows={2}
                  value={sentence.actionPhrase}
                  placeholder="例: 段取りを整える／人の話をよく聴く"
                  maxLength={STRENGTH_SENTENCE_ACTION_MAX}
                  onChange={(e) => {
                    if (countUnicodeChars(e.target.value) <= STRENGTH_SENTENCE_ACTION_MAX) {
                      onChange(colorId, { actionPhrase: e.target.value });
                    }
                  }}
                />
              </label>

              <p className="step02-sentence-preview" aria-live="polite">
                <span className="step02-sentence-preview-label">プレビュー</span>
                {formatStrengthKeySentence(sentence)}
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

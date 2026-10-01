'use client';

import {
  GROUP_COLORS,
  colorSwatch,
  countUsedColors,
  type GroupColorId,
  type InterestTag,
  type InterestTagColors,
} from '@/lib/startProgram/step02Constants';

type Step02InterestGroupColorProps = {
  tags: InterestTag[];
  tagColors: InterestTagColors;
  selectedTagIds: string[];
  activeColorId: Exclude<GroupColorId, 'other'> | null;
  canUndo: boolean;
  heading?: string;
  emptyHint?: string;
  onToggleTag: (tagId: string) => void;
  onSelectColor: (colorId: Exclude<GroupColorId, 'other'>) => void;
  onClearColor: () => void;
  onUndo: () => void;
  onCommit: () => void;
  onAiClassifyStub: () => void;
};

export default function Step02InterestGroupColor({
  tags,
  tagColors,
  selectedTagIds,
  activeColorId,
  canUndo,
  heading = '興味を色分けしましょう',
  emptyHint = '掘り下げで選択したピルがありません。先に「掘り下げ」で候補を選んでください。',
  onToggleTag,
  onSelectColor,
  onClearColor,
  onUndo,
  onCommit,
  onAiClassifyStub,
}: Step02InterestGroupColorProps) {
  const usedColors = countUsedColors(tagColors);
  const selectedSet = new Set(selectedTagIds);
  const uncolored = tags.filter((t) => !t.colorId).length;
  const canClear = selectedTagIds.length > 0;

  if (tags.length === 0) {
    return <p className="step02-empty-hint">{emptyHint}</p>;
  }

  return (
    <div className="step02-group-color">
      <h3 className="seven-steps-worksheet-subheading">{heading}</h3>
      <p className="seven-steps-worksheet-body">
        似た項目を同じ色にしてください（目安 2〜3 件／色）。項目を選んでから色をタップします。「色を外す」で未色分けに戻せます。未色分けは「まとめる」時に「その他」へ入ります。
      </p>

      <div className="step02-group-color-toolbar">
        <div className="step02-group-palette" role="group" aria-label="色パレット">
          {GROUP_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`step02-group-swatch${activeColorId === c.id ? ' is-active' : ''}`}
              style={{ background: c.swatch }}
              title={c.label}
              aria-label={`${c.label}を適用`}
              aria-pressed={activeColorId === c.id}
              onClick={() => onSelectColor(c.id)}
            />
          ))}
          <button
            type="button"
            className="step02-group-swatch step02-group-swatch--clear"
            title="色を外す"
            aria-label="選択中の色を外す"
            disabled={!canClear}
            onClick={onClearColor}
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        <div className="step02-group-color-actions">
          <button
            type="button"
            className="step02-section-next-btn step02-section-next-btn--secondary"
            disabled={!canUndo}
            onClick={onUndo}
          >
            元に戻す
          </button>
          <button type="button" className="step02-section-next-btn" onClick={onCommit}>
            まとめる
          </button>
          <button
            type="button"
            className="step02-auto-draft-btn"
            onClick={onAiClassifyStub}
            title="P2 で実装予定"
          >
            Aiで分類
          </button>
        </div>
      </div>

      <p className="step02-progress" role="status">
        使用色: <strong>{usedColors}</strong> ／ 未色分け: <strong>{uncolored}</strong> 件
        {selectedTagIds.length > 0 ? ` ／ 選択中: ${selectedTagIds.length}` : null}
      </p>

      <div className="step02-group-tag-cloud" role="list" aria-label="興味ピル一覧">
        {tags.map((tag) => {
          const selected = selectedSet.has(tag.id);
          const bg = tag.colorId ? colorSwatch(tag.colorId) : undefined;
          return (
            <button
              key={tag.id}
              type="button"
              role="listitem"
              className={`step02-group-tag${selected ? ' is-selected' : ''}${
                tag.colorId ? ' is-colored' : ''
              }`}
              style={bg ? { background: bg, borderColor: bg } : undefined}
              aria-pressed={selected}
              onClick={() => onToggleTag(tag.id)}
              title={tag.label}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

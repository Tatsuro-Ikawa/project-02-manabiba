'use client';

import { useCallback, useRef, useState, type PointerEvent } from 'react';
import {
  GROUP_COLORS,
  INTEREST_GROUP_COMMENT_MAX_CHARS,
  INTEREST_GROUP_TITLE_MAX_CHARS,
  colorLabel,
  colorSwatch,
  type GroupColorId,
  type InterestGroupsByColor,
  type InterestTag,
} from '@/lib/startProgram/step02Constants';
import { countUnicodeChars } from '@/lib/startProgram/mandalaConstants';

type Step02InterestGroupNameProps = {
  tags: InterestTag[];
  groups: InterestGroupsByColor;
  heading?: string;
  onChangeTitle: (colorId: GroupColorId, title: string) => void;
  onChangeComment: (colorId: GroupColorId, comment: string) => void;
  onMoveTag: (tagId: string, colorId: GroupColorId) => void;
  onBackToColor: () => void;
};

function orderedColorIdsFromTags(tags: InterestTag[]): GroupColorId[] {
  const used = new Set<GroupColorId>();
  for (const t of tags) {
    if (t.colorId) used.add(t.colorId);
  }
  const order: GroupColorId[] = [...GROUP_COLORS.map((c) => c.id), 'other'];
  return order.filter((id) => used.has(id));
}

export default function Step02InterestGroupName({
  tags,
  groups,
  heading = '興味・関心をまとめてみよう',
  onChangeTitle,
  onChangeComment,
  onMoveTag,
  onBackToColor,
}: Step02InterestGroupNameProps) {
  const colorIds = orderedColorIdsFromTags(tags);
  const [commentOpen, setCommentOpen] = useState<GroupColorId | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<GroupColorId | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragOriginColor = useRef<GroupColorId | undefined>(undefined);

  const draggingTag = tags.find((t) => t.id === draggingId) ?? null;

  const findColumnAtPoint = useCallback((x: number, y: number): GroupColorId | null => {
    const el = document.elementFromPoint(x, y);
    const col = el?.closest('[data-group-color]') as HTMLElement | null;
    return (col?.dataset.groupColor as GroupColorId | undefined) ?? null;
  }, []);

  const endDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!draggingId) return;
      const target = findColumnAtPoint(clientX, clientY);
      if (target && target !== dragOriginColor.current) {
        onMoveTag(draggingId, target);
      }
      setDraggingId(null);
      setDropTarget(null);
      setDragPos(null);
      dragOriginColor.current = undefined;
    },
    [draggingId, findColumnAtPoint, onMoveTag]
  );

  if (tags.length === 0) {
    return (
      <p className="step02-empty-hint">色分けされた興味がありません。色分け画面に戻ってください。</p>
    );
  }

  return (
    <div className="step02-group-name">
      <h3 className="seven-steps-worksheet-subheading">{heading}</h3>
      <p className="seven-steps-worksheet-body">
        色ごとのグループに名前を付けてください。項目を<strong>ドラッグ＆ドロップ</strong>して、別のグループへ移動できます。
      </p>

      <p className="step02-group-name-toolbar">
        <button
          type="button"
          className="step02-section-next-btn step02-section-next-btn--secondary"
          onClick={onBackToColor}
        >
          色分けに戻る
        </button>
      </p>

      <div className="step02-group-columns">
        {colorIds.map((colorId) => {
          const meta = groups[colorId] ?? {
            colorId,
            title: colorId === 'other' ? 'その他' : '',
            comment: '',
          };
          const groupTags = tags.filter((t) => t.colorId === colorId);
          const swatch = colorSwatch(colorId);
          const isDropTarget = dropTarget === colorId && draggingId != null;
          return (
            <section
              key={colorId}
              className={`step02-group-column${isDropTarget ? ' is-drop-target' : ''}`}
              style={{ borderTopColor: swatch }}
              data-group-color={colorId}
              aria-label={`${colorLabel(colorId)}グループ`}
            >
              <header className="step02-group-column-header">
                <span
                  className="step02-group-column-dot"
                  style={{ background: swatch }}
                  aria-hidden
                />
                <input
                  className="step02-group-title-input"
                  value={meta.title}
                  placeholder={`${colorLabel(colorId)}のタイトル（例: つながる・分かち合う）`}
                  maxLength={INTEREST_GROUP_TITLE_MAX_CHARS}
                  onChange={(e) => {
                    if (countUnicodeChars(e.target.value) <= INTEREST_GROUP_TITLE_MAX_CHARS) {
                      onChangeTitle(colorId, e.target.value);
                    }
                  }}
                  aria-label={`${colorLabel(colorId)}のグループ名`}
                />
              </header>

              <ul className="step02-group-column-tags">
                {groupTags.map((tag) => (
                  <GroupTagItem
                    key={tag.id}
                    tag={tag}
                    swatch={swatch}
                    isDragging={draggingId === tag.id}
                    onDragStart={(e) => {
                      dragOriginColor.current = tag.colorId;
                      setDraggingId(tag.id);
                      setDragPos({ x: e.clientX, y: e.clientY });
                      setDropTarget(colorId);
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    }}
                    onDragMove={(e) => {
                      setDragPos({ x: e.clientX, y: e.clientY });
                      setDropTarget(findColumnAtPoint(e.clientX, e.clientY));
                    }}
                    onDragEnd={(e) => endDrag(e.clientX, e.clientY)}
                  />
                ))}
                {groupTags.length === 0 ? (
                  <li className="step02-group-column-empty">ここにドロップ</li>
                ) : null}
              </ul>

              <footer className="step02-group-column-footer">
                <button
                  type="button"
                  className="step02-group-comment-btn"
                  onClick={() =>
                    setCommentOpen((prev) => (prev === colorId ? null : colorId))
                  }
                >
                  コメント
                </button>
                {commentOpen === colorId ? (
                  <textarea
                    className="step02-group-comment-input"
                    rows={2}
                    placeholder="本人メモ（任意）"
                    value={meta.comment}
                    maxLength={INTEREST_GROUP_COMMENT_MAX_CHARS}
                    onChange={(e) => {
                      if (countUnicodeChars(e.target.value) <= INTEREST_GROUP_COMMENT_MAX_CHARS) {
                        onChangeComment(colorId, e.target.value);
                      }
                    }}
                  />
                ) : meta.comment ? (
                  <p className="step02-group-comment-preview">{meta.comment}</p>
                ) : null}
              </footer>
            </section>
          );
        })}
      </div>

      {draggingTag && dragPos ? (
        <div
          className="step02-drag-ghost"
          style={{
            left: dragPos.x + 8,
            top: dragPos.y + 8,
            background: colorSwatch(draggingTag.colorId),
          }}
          aria-hidden
        >
          {draggingTag.label}
        </div>
      ) : null}
    </div>
  );
}

function GroupTagItem({
  tag,
  swatch,
  isDragging,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  tag: InterestTag;
  swatch: string;
  isDragging: boolean;
  onDragStart: (e: PointerEvent<HTMLButtonElement>) => void;
  onDragMove: (e: PointerEvent<HTMLButtonElement>) => void;
  onDragEnd: (e: PointerEvent<HTMLButtonElement>) => void;
}) {
  const active = useRef(false);

  return (
    <li>
      <button
        type="button"
        className={`step02-group-column-tag${isDragging ? ' is-dragging' : ''}`}
        style={{ background: swatch }}
        title="ドラッグして別グループへ移動"
        aria-grabbed={isDragging}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          active.current = true;
          onDragStart(e);
        }}
        onPointerMove={(e) => {
          if (!active.current) return;
          onDragMove(e);
        }}
        onPointerUp={(e) => {
          if (!active.current) return;
          active.current = false;
          onDragEnd(e);
        }}
        onPointerCancel={(e) => {
          if (!active.current) return;
          active.current = false;
          onDragEnd(e);
        }}
      >
        <span className="step02-group-column-tag-handle" aria-hidden>
          ⋮⋮
        </span>
        <span className="step02-group-column-tag-label">{tag.label}</span>
      </button>
    </li>
  );
}

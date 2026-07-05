export type AffirmationBlock =
  | { type: 'text'; text: string }
  | { type: 'slot'; slotId: string; maxLength: number; multiline?: boolean; rows?: number };

export interface AffirmationSectionProfile {
  heading: string;
  blocks: AffirmationBlock[];
}

export interface AffirmationProfile {
  id: string;
  name: string;
  sections: AffirmationSectionProfile[];
}

/** 穴埋め各スロットの上限（設計: 04_AFFIRMATION_DESIGN.md の入力フィールド幅） */
export const AFFIRMATION_SLOT_MAX_LENGTH = 150;

/**
 * 現段階: 指定のプロファイル 1 本のみ（将来的に選択・編集へ拡張）。
 * slotId は将来の「他プログラムからの流し込み」「ID紐づけ」に使う。
 *
 * **`type: 'text'` の `text` 内の `\n`**
 * - 作成モーダル: `<br />` で表示。先頭が `\n` のブロックは次の flex 行から始まる（`affirmation-text--row-break`）。
 * - プレビュー／発行本文: Markdown のハード改行（行末2スペース＋改行）に変換して表示。
 */
export const AFFIRMATION_PROFILE_V1: AffirmationProfile = {
  id: 'affirmation-01',
  name: 'アファメーション01',
  sections: [
    {
      heading: '1年後の自分（未来宣言：Have）',
      blocks: [
        { type: 'text', text: '私は、' },
        { type: 'slot', slotId: 'oneYear.self', maxLength: AFFIRMATION_SLOT_MAX_LENGTH },
        { type: 'text', text: 'までに' },
        { type: 'slot', slotId: 'oneYear.byWhen', maxLength: AFFIRMATION_SLOT_MAX_LENGTH },
        { type: 'text', text: 'な状態になっている。' },
        { type: 'text', text: 'そして、' },
        { type: 'slot', slotId: 'oneYear.achieved', maxLength: AFFIRMATION_SLOT_MAX_LENGTH },
        { type: 'text', text: 'を達成している。' },
      ],
    },
    {
      heading: '行動宣言（Do）',
      blocks: [
        { type: 'text', text: '私は、この状態を実現するために、' },
        { type: 'slot', slotId: 'do.action', maxLength: AFFIRMATION_SLOT_MAX_LENGTH },
        { type: 'text', text: '。' },
      ],
    },
    {
      heading: 'あり方の宣言（Be）',
      blocks: [
        { type: 'text', text: 'なぜなら、私は、' },
        { type: 'slot', slotId: 'be.statement', maxLength: AFFIRMATION_SLOT_MAX_LENGTH },
        { type: 'text', text: '。' },
      ],
    },
    {
      heading: '心のブレーキへの対処（反論の言葉）',
      blocks: [
        {
          type: 'text',
          text: '行動しようとしたとき、ネガティブな思考や迷いが浮かんだら、私は自分にこう声をかける。',
        },
        { type: 'slot', slotId: 'rebuttal.words', maxLength: AFFIRMATION_SLOT_MAX_LENGTH },
      ],
    },
    {
      heading: '鎖を断ち切るフレーズ（最終宣言）',
      blocks: [
        { type: 'text', text: 'なぜなら、私は、' },
        { type: 'slot', slotId: 'final.declaration', maxLength: AFFIRMATION_SLOT_MAX_LENGTH },
        { type: 'text', text: '。' },
      ],
    },
  ],
};

/** プロファイル内の穴上限の合計 */
export function sumAffirmationSlotMaxLengths(profile: AffirmationProfile): number {
  let sum = 0;
  for (const section of profile.sections) {
    for (const block of section.blocks) {
      if (block.type === 'slot') sum += block.maxLength;
    }
  }
  return sum;
}

/**
 * 穴をすべて上限まで埋めたときの発行本文長（見出し・固定文言・区切り改行を含む）。
 * `buildPreview`（TrialAffirmation）と同じ連結規則。
 */
export function computeAffirmationMarkdownBodyMaxLength(profile: AffirmationProfile): number {
  const lines: string[] = [];
  for (const section of profile.sections) {
    const parts: string[] = [];
    for (const block of section.blocks) {
      if (block.type === 'text') parts.push(block.text);
      else parts.push('x'.repeat(block.maxLength));
    }
    lines.push(`【${section.heading}】\n${parts.join('')}`);
  }
  return lines.join('\n\n').length;
}

/**
 * 発行済み本文（Markdown 平文）の上限。
 * 穴上限の合計に、見出し・固定文言分を加えた長さ（穴を満杯にしても発行できる値）。
 */
export const AFFIRMATION_MARKDOWN_BODY_MAX_LENGTH =
  computeAffirmationMarkdownBodyMaxLength(AFFIRMATION_PROFILE_V1);


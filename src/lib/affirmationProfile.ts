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
        { type: 'slot', slotId: 'oneYear.self', maxLength: 50 },
        { type: 'text', text: 'までに' },
        { type: 'slot', slotId: 'oneYear.byWhen', maxLength: 50 },
        { type: 'text', text: 'な状態になっている。' },
        { type: 'text', text: 'そして、' },
        { type: 'slot', slotId: 'oneYear.achieved', maxLength: 50 },
        { type: 'text', text: 'を達成している。' },
      ],
    },
    {
      heading: '行動宣言（Do）',
      blocks: [
        { type: 'text', text: '私は、この状態を実現するために、' },
        { type: 'slot', slotId: 'do.action', maxLength: 50 },
        { type: 'text', text: '。' },
      ],
    },
    {
      heading: 'あり方の宣言（Be）',
      blocks: [
        { type: 'text', text: 'なぜなら、私は、' },
        { type: 'slot', slotId: 'be.statement', maxLength: 50 },
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
        { type: 'slot', slotId: 'rebuttal.words', maxLength: 50 },
      ],
    },
    {
      heading: '鎖を断ち切るフレーズ（最終宣言）',
      blocks: [
        { type: 'text', text: 'なぜなら、私は、' },
        { type: 'slot', slotId: 'final.declaration', maxLength: 50 },
        { type: 'text', text: '。' },
      ],
    },
  ],
};


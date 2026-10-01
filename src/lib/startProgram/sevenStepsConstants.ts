/** 7つのステップ — プログラム定義 */

export type StepPane = 'guide' | 'worksheet';

export type SevenStepsStepDef = {
  index: number;
  slug: string;
  title: string;
  panes: StepPane[];
  guidePath?: string;
};

export const SEVEN_STEPS_PROGRAM_ID = 'seven-steps' as const;

export const SEVEN_STEPS_PROGRAM_LABEL = '7つのステップ';

export const SEVEN_STEPS: SevenStepsStepDef[] = [
  {
    index: 0,
    slug: 'step00',
    title: '自分の声、聴いていますか？',
    panes: ['guide', 'worksheet'],
    guidePath: '/start-program/seven-steps/step00/guide.md',
  },
  {
    index: 1,
    slug: 'step01',
    title: '望む人生を描いてみる',
    panes: ['guide', 'worksheet'],
    guidePath: '/start-program/seven-steps/step01/guide.md',
  },
  {
    index: 2,
    slug: 'step02',
    title: 'あなたはだれ？',
    panes: ['guide', 'worksheet'],
    guidePath: '/start-program/seven-steps/step02/guide.md',
  },
  {
    index: 3,
    slug: 'step03',
    title: '満足度をみて、取組む領域を決める',
    panes: ['guide', 'worksheet'],
    guidePath: '/start-program/seven-steps/step03/guide.md',
  },
  {
    index: 4,
    slug: 'step04',
    title: '満足度の理由から、こころのブレーキの入口を探る',
    panes: ['guide', 'worksheet'],
    guidePath: '/start-program/seven-steps/step04/guide.md',
  },
  {
    index: 5,
    slug: 'step05',
    title: '望む姿を明確にしましょう',
    panes: ['guide', 'worksheet'],
  },
  {
    index: 6,
    slug: 'step06',
    title: '行動しなければ何も始まりません',
    panes: ['guide', 'worksheet'],
  },
  {
    index: 7,
    slug: 'step07',
    title: 'あなたらしさを止める「こころのブレーキ」を外す',
    panes: ['guide', 'worksheet'],
  },
];

export const STEP00_MAX_CHARS = 250;

/** Step0 WS 質問（UI モック正本） */
export const STEP00_QUESTIONS: { id: string; label: string }[] = [
  { id: 'q1', label: 'これからの人生、どんな人生を送りたいと思いますか？' },
  {
    id: 'q2',
    label: '最近、「おもしろいなぁ」と感じる場面はありましたか？ それは、どんな時でしたか？',
  },
  { id: 'q3', label: 'もっと自由になれたら何をしたいですか？' },
  { id: 'q4', label: 'いまの自分、どんなところをより良くしたいですか？' },
  { id: 'q5', label: 'どんなことに挑戦したいですか？' },
  { id: 'q6', label: '「現状を変える」のに必要なものはなんだとおもいますか？' },
  {
    id: 'q7',
    label: '「こんな自分もありかもしれない」と思うことはありますか？ それは、どんな姿でしょうか。',
  },
];

export function getSevenStepsStep(index: number): SevenStepsStepDef | undefined {
  return SEVEN_STEPS.find((s) => s.index === index);
}

export function clampStepIndex(index: number): number {
  if (index < 0) return 0;
  if (index >= SEVEN_STEPS.length) return SEVEN_STEPS.length - 1;
  return index;
}

export function defaultPaneForStep(step: SevenStepsStepDef): StepPane {
  return step.panes[0] ?? 'guide';
}

export function stepBasePath(stepIndex: number): string {
  return `/start-program/seven-steps/step/${stepIndex}`;
}

export function stepUrl(stepIndex: number, pane: StepPane): string {
  return `${stepBasePath(stepIndex)}?pane=${pane}`;
}

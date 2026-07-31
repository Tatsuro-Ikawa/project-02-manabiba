import type { Trial4wDailyPlain } from '@/lib/firestore';

/** §4.z — reflectionText の最小文字数（項目 g は含めない） */
export const MIN_REFLECTION_TEXT_CHARS = 50;

/** §4.z — 同日 Aiコーチからのコメント生成上限 */
export const AI_SUGGESTION_DAILY_LIMIT = 3;

/** 晩 AI 応答の目安文字数（Unicode） */
export const IMPROVEMENT_SUGGESTION_TARGET_MIN = 400;
export const IMPROVEMENT_SUGGESTION_TARGET_MAX = 500;

const REFLECTION_SECTIONS: Array<{
  heading: string;
  getValue: (d: Trial4wDailyPlain) => string | null | undefined;
}> = [
  {
    heading: '今日印象に残ったできごとは何でしたか？',
    getValue: (d) => d.eveningResultExecutionText,
  },
  {
    heading: 'その時、どんな気持ちになりましたか？',
    getValue: (d) => d.eveningEmotionThoughtText,
  },
  {
    heading: 'その時、どのような考えが思い浮かびましたか？',
    getValue: (d) => d.eveningReflectionThoughtText,
  },
  {
    heading: 'そこから、なにか気づくことはありましたか？',
    getValue: (d) => d.eveningBrakeWorkedText,
  },
  {
    heading: 'この出来事から何を学びましたか？',
    getValue: (d) => d.eveningInsightText,
  },
  {
    heading: '今日の学びをどう明日に活かしますか？',
    getValue: (d) => d.eveningImprovementText,
  },
];

export function countUnicodeChars(text: string): number {
  return [...text].length;
}

/** 晩の項目3〜8（a〜f）を UI 見出し付きで連結 */
export function buildEveningReflectionText(data: Trial4wDailyPlain): string {
  const blocks: string[] = [];
  for (const { heading, getValue } of REFLECTION_SECTIONS) {
    const t = (getValue(data) ?? '').trim();
    if (t) blocks.push(`${heading}\n${t}`);
  }
  return blocks.join('\n\n');
}

/**
 * 晩 AI の参照情報: 朝の行動目標・行動内容と晩の満足度。
 * `reflectionText`（a〜f）の文字数下限には含めない。空の項目は省略。
 */
export function buildEveningActionReferenceText(data: Trial4wDailyPlain): string {
  const lines: string[] = [];
  const goal = (data.morningActionGoalText ?? data.morningTodayActionText ?? '').trim();
  const content = (data.morningActionContentText ?? '').trim();
  if (goal) lines.push(`- 行動目標: ${goal}`);
  if (content) lines.push(`- 行動内容: ${content}`);
  if (typeof data.eveningSatisfaction === 'number' && !Number.isNaN(data.eveningSatisfaction)) {
    lines.push(`- 行動の満足度: ${data.eveningSatisfaction}/10`);
  }
  return lines.join('\n');
}

export function normalizeEveningUserQuestion(text: string | null | undefined): string | null {
  const t = (text ?? '').trim();
  return t || null;
}

function buildPromptHeader(hasActionReference: boolean): string[] {
  const lines = [
    'あなたは日々の出来事から気づきを促す日本語コーチです。',
    '最下段の【本日の学びへの入力】は、クライアントが項目 a〜f に入力した内容を改行区切りで連結したものです。',
    '【クライアントからの質問】は項目 g です。',
  ];
  if (hasActionReference) {
    lines.push(
      '【行動の参照情報】は朝の行動目標・行動内容と晩の満足度です。回答の根拠・文脈として参照してください（学び入力 a〜f の代替にはしない）。'
    );
  }
  lines.push(
    '',
    '【入力項目】',
    'a.今日印象に残ったできごとは何でしたか？',
    'b.その時、どんな気持ちになりましたか？',
    'c.その時、どのような考えが思い浮かびましたか？',
    'd.そこから、なにか気づくことはありましたか？',
    'e.この出来事から何を学びましたか？',
    'f.今日の学びをどう明日に活かしますか？',
    'g.Aiコーチに聞きたい事はありますか？',
    ''
  );
  return lines;
}

/** g あり: 質問への回答のみ（a〜f は参照用） */
function buildOutputSectionForQuestion(): string[] {
  return [
    'その入力に対して以下を出力ください。',
    '',
    '【出力内容】',
    'クライアントの質問（項目 g）にのみ答えてください。',
    '【本日の学びへの入力】（項目 a〜f）と【行動の参照情報】（あれば）は、回答の根拠・具体例・文脈として十分に参照してください。',
    '「本日の学びへの応答・前半」「本日の学びへの応答・後半」は出力しません。',
    '',
    '出力は 1 ブロックのみ。「1行目見出し＋改行＋本文」。',
    '見出し: 【クライアントからの質問への回答】',
    `合計 ${IMPROVEMENT_SUGGESTION_TARGET_MIN}〜${IMPROVEMENT_SUGGESTION_TARGET_MAX} 文字（Unicode）。`,
    '',
    '- 質問はクライアントが a〜f に書いた記述の後の質問であるため、その流れに沿った内容の回答をする',
    '- クライアントの言葉を受容しながら本人の無意識下の自己意識について示唆する',
    '- クライアントの明日の行動に対して気づきや学びから変化を促すこころのあり方や行動を中心に提案する',
    '',
  ];
}

/** g なし: 本日の学びへの応答（前半・後半） */
function buildOutputSectionForReflectionOnly(): string[] {
  return [
    'その入力に対して以下を出力ください。',
    '',
    '【出力内容】',
    'クライアントの質問（項目 g）はありません。本日の学びへの応答のみ出力してください。',
    '【行動の参照情報】がある場合は、出来事の文脈として参照してください。',
    '',
    '出力は 2 ブロック。「1行目見出し＋改行＋本文」。',
    `合計 ${IMPROVEMENT_SUGGESTION_TARGET_MIN}〜${IMPROVEMENT_SUGGESTION_TARGET_MAX} 文字（Unicode）。`,
    '',
    '2. 【本日の学びへの応答・前半】… 出来事から気づきに至る思考の流れへの受容（など）をクライアントが入力した言葉を参照しながら示してください。',
    '優先度 a→e→d→b→c→f で参照。',
    '',
    '3. 【本日の学びへの応答・後半】',
    'クライアントの 「気づき、学び」が非合理的な自動思考やネガティブな方向に向かった場合は、受容しつつもそうした感情のやわらげ方や出来事に対するポジティブな捉え方やあり方の事例などを自然な文に溶かして示してください。',
    'また、クライアントのポジティブな気づき、学びに対しては、具体的な行動やあり方への参考例を示してください。',
    '',
  ];
}

function buildPromptConstraints(hasUserQuestion: boolean): string[] {
  const charHint = hasUserQuestion
    ? ` - g あり: 質問への回答 1 ブロックのみ。合計 ${IMPROVEMENT_SUGGESTION_TARGET_MIN}〜${IMPROVEMENT_SUGGESTION_TARGET_MAX} 字（目安: 回答全体でこの範囲）`
    : ` - g なし: 2.+3. 合計 ${IMPROVEMENT_SUGGESTION_TARGET_MIN}〜${IMPROVEMENT_SUGGESTION_TARGET_MAX} 字（目安: 2.（80〜120字） + 3.（280〜380字））`;

  return [
    '【制約】',
    '- 日本語のみ。',
    '- 否定や断定を避け、実行しやすい提案にする',
    '- 100文字未満の短文にしない',
    '- 文末は必ず完結した文（「。」または「！」や「？」）で終える',
    '- 文字数:',
    charHint,
    `- ${IMPROVEMENT_SUGGESTION_TARGET_MAX}文字に近づく場合は、最後の1文を省略しても文を途中で切らない`,
    `- ${IMPROVEMENT_SUGGESTION_TARGET_MAX}文字を超えないよう調整する`,
    '-【本日の学びへの入力】は項目 a〜f のみ（質問 g は別欄）',
    '-【行動の参照情報】がある場合は文脈として参照してよい（出力の主対象は a〜f / g）',
    '',
  ];
}

/** 短文時の拡張指示（`improvement` route 用） */
export function buildImprovementExpandInstruction(hasUserQuestion: boolean): string {
  if (hasUserQuestion) {
    return `この下書きを土台に、意味を変えず、質問への回答として情報を補って${IMPROVEMENT_SUGGESTION_TARGET_MIN}〜${IMPROVEMENT_SUGGESTION_TARGET_MAX}文字、見出し【クライアントからの質問への回答】＋本文の形で拡張してください。`;
  }
  return `この下書きを土台に、意味を変えず、情報を補って${IMPROVEMENT_SUGGESTION_TARGET_MIN}〜${IMPROVEMENT_SUGGESTION_TARGET_MAX}文字、見出し+文章の形で拡張してください。`;
}

/** Vertex `POST /api/ai/improvement` 用プロンプト（§11.0 正本） */
export function buildImprovementApiPrompt(
  reflectionText: string,
  userQuestion: string | null,
  actionReferenceText?: string | null
): string {
  const trimmedQuestion = userQuestion?.trim() ?? '';
  const hasUserQuestion = trimmedQuestion.length > 0;
  const questionLine = hasUserQuestion ? trimmedQuestion : '（なし）';
  const trimmedActionRef = actionReferenceText?.trim() ?? '';
  const hasActionReference = trimmedActionRef.length > 0;
  const outputSection = hasUserQuestion
    ? buildOutputSectionForQuestion()
    : buildOutputSectionForReflectionOnly();

  const clientInput: string[] = [
    'クライアントが入力した文章',
    '',
  ];
  if (hasActionReference) {
    clientInput.push('【行動の参照情報】', trimmedActionRef, '');
  }
  clientInput.push(
    '【本日の学びへの入力】',
    reflectionText,
    '【クライアントからの質問】',
    questionLine
  );

  return [
    ...buildPromptHeader(hasActionReference),
    ...outputSection,
    ...buildPromptConstraints(hasUserQuestion),
    '---',
    '',
    ...clientInput,
  ].join('\n');
}

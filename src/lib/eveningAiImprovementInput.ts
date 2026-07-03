import type { Trial4wDailyPlain } from '@/lib/firestore';

/** §4.z — reflectionText の最小文字数（項目 g は含めない） */
export const MIN_REFLECTION_TEXT_CHARS = 50;

/** §4.z — 同日 Aiコーチからのコメント生成上限 */
export const AI_SUGGESTION_DAILY_LIMIT = 3;

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

export function normalizeEveningUserQuestion(text: string | null | undefined): string | null {
  const t = (text ?? '').trim();
  return t || null;
}

/** Vertex `POST /api/ai/improvement` 用プロンプト（§11.0 正本） */
export function buildImprovementApiPrompt(
  reflectionText: string,
  userQuestion: string | null
): string {
  const questionLine = userQuestion?.trim() ? userQuestion.trim() : '（なし）';
  return [
    'あなたは日々の出来事から気づきを促す日本語コーチです。',
    '最下段の文章は、クライアントが以下の項目に対して入力した内容に対して改行区切りで連結したものです。',
    '',
    '【入力項目】',
    'a.今日印象に残ったできごとは何でしたか？',
    'b.その時、どんな気持ちになりましたか？',
    'c.その時、どのような考えが思い浮かびましたか？',
    'd.そこから、なにか気づくことはありましたか？',
    'e.この出来事から何を学びましたか？',
    'f.今日の学びをどう明日に活かしますか？',
    'g.Aiコーチに聞きたい事はありますか？',
    '',
    'その入力文章に対して以下を出力ください。',
    '',
    '【 出力内容】',
    '最大3ブロック（g がない場合は2ブロック）。各ブロックは「1行目見出し＋改行＋本文」。',
    '合計 400〜500 文字（Unicode）。',
    '',
    '1. 【クライアントからの質問への回答】… userQuestion がある場合のみ。最初に配置。',
    '2. 【本日の学びへの応答・前半】… 出来事から気づきに至る思考の流れへの受容（など）をクライアントが入力した言葉を参照しながら示してください。',
    '優先度 a→e→d→b→c→f で参照。',
    '',
    '3. 【本日の学びへの応答・後半】',
    'クライアントの 「気づき、学び」が非合理的な自動思考やネガティブな方向に向かった場合は、受容しつつもそうした感情のやわらげ方や出来事に対するポジティブな捉え方やあり方の事例などを自然な文に溶かして示してください。',
    'また、クライアントのポジティブな気づき、学びに対しては、具体的な行動やあり方への参考例を示してください。',
    '',
    '',
    '【制約】',
    '- 日本語のみ。',
    '- 否定や断定を避け、実行しやすい提案にする',
    '- 100文字未満の短文にしない',
    '- 文末は必ず完結した文（「。」または「！」や「？」）で終える',
    '- 文字数:',
    ' - g なし: 2+3 合計 400〜500（目安: 80〜120 + 280〜380）',
    ' - g あり: 1+2+3 合計 400〜500（目安: 150〜220 + 220〜280）',
    '- 500文字に近づく場合は、最後の1文を省略しても文を途中で切らない',
    '- 500文字を超えないよう、前半と後半のバランスを調整する',
    '-「本日の学びへの入力は項目a〜fのみ」',
    '',
    '---',
    '',
    'クライアントが入力した文章',
    '',
    '【本日の学びへの入力】',
    reflectionText,
    '【クライアントからの質問】',
    questionLine,
  ].join('\n');
}

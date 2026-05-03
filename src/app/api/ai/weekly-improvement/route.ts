import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import {
  countWeeklyImprovementInputChars,
  extractWeeklyImprovementSectionBody,
  WEEKLY_IMPROVEMENT_INPUT_SECTIONS,
  WEEKLY_IMPROVEMENT_MIN_CHARS_PER_FIELD,
} from '@/lib/weeklyImprovementAi';

type WeeklyImprovementRequestBody = {
  weeklyImprovementInputText?: unknown;
};

export const runtime = 'nodejs';

/** 応答本文（プレーン1本）の最大文字数。超過分は句点付近で trim（weekly-report / improvement と同型） */
const MAX_SUGGESTION_CHARS = 450;
/** 応答の最小文字数。未満時は拡張プロンプトを1回試行 */
const MIN_SUGGESTION_CHARS = 100;
const ENABLE_AI_PROMPT_LOG = false;
const AI_JSON_LOG_MAX_CHARS = 16000;
const GCP_SA_KEY_JSON_ENV = 'GCP_SA_KEY_JSON';

function countChars(text: string): number {
  return [...text].length;
}

function safeJsonForLog(obj: unknown, maxLen: number): string {
  try {
    const s = JSON.stringify(obj, null, 2);
    return s.length > maxLen ? `${s.slice(0, maxLen)}…(truncated)` : s;
  } catch {
    return String(obj);
  }
}

function readUsageTotalTokenCount(aiJson: unknown): number | undefined {
  const u = (aiJson as { usageMetadata?: { totalTokenCount?: unknown } }).usageMetadata;
  const n = u?.totalTokenCount;
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : undefined;
}

function trimToSentenceBoundary(text: string, maxChars: number): string {
  const chars = [...text];
  if (chars.length <= maxChars) return text;
  const clipped = chars.slice(0, maxChars).join('');
  const punctuationMatches = [...clipped.matchAll(/[。！？]/g)];
  const last = punctuationMatches.length > 0 ? punctuationMatches[punctuationMatches.length - 1] : null;
  if (last && typeof last.index === 'number') {
    const keepLen = last.index + 1;
    if (keepLen >= Math.floor(maxChars * 0.6)) {
      return [...clipped].slice(0, keepLen).join('');
    }
  }
  if (maxChars <= 1) return '…';
  return `${chars.slice(0, maxChars - 1).join('')}…`;
}

function isFetchAbortOrTimeout(e: unknown): boolean {
  if (e instanceof DOMException && e.name === 'AbortError') return true;
  if (e instanceof Error) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') return true;
  }
  return false;
}

function buildGoogleAuth(): GoogleAuth {
  const json = process.env[GCP_SA_KEY_JSON_ENV];
  if (!json || !json.trim()) {
    return new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }

  type ServiceAccountJson = {
    client_email?: string;
    private_key?: string;
    project_id?: string;
  };

  let parsed: ServiceAccountJson;
  try {
    parsed = JSON.parse(json) as ServiceAccountJson;
  } catch {
    throw new Error(
      `${GCP_SA_KEY_JSON_ENV} は有効な JSON 文字列ではありません。サービスアカウント鍵 JSON 全文を設定してください。`
    );
  }

  if (
    typeof parsed.client_email !== 'string' ||
    !parsed.client_email ||
    typeof parsed.private_key !== 'string' ||
    !parsed.private_key
  ) {
    throw new Error(
      `${GCP_SA_KEY_JSON_ENV} に必要なキー（client_email/private_key）が不足しています。`
    );
  }

  return new GoogleAuth({
    credentials: parsed,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
}

export async function POST(request: NextRequest) {
  let body: WeeklyImprovementRequestBody;
  try {
    body = (await request.json()) as WeeklyImprovementRequestBody;
  } catch {
    return NextResponse.json({ error: 'リクエスト形式が不正です。' }, { status: 400 });
  }

  const input =
    typeof body.weeklyImprovementInputText === 'string' ? body.weeklyImprovementInputText.trim() : '';

  if (!input) {
    return NextResponse.json({ error: 'weeklyImprovementInputText を指定してください。' }, { status: 400 });
  }

  const shortSections: string[] = [];
  for (const sec of WEEKLY_IMPROVEMENT_INPUT_SECTIONS) {
    const body = extractWeeklyImprovementSectionBody(input, sec.promptLabel);
    if (countWeeklyImprovementInputChars(body) < WEEKLY_IMPROVEMENT_MIN_CHARS_PER_FIELD) {
      shortSections.push(sec.labelShort);
    }
  }
  if (shortSections.length > 0) {
    return NextResponse.json(
      {
        error: `次の項目をそれぞれ${WEEKLY_IMPROVEMENT_MIN_CHARS_PER_FIELD}文字以上入力してください: ${shortSections.join('、')}`,
      },
      { status: 400 }
    );
  }

  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'asia-northeast1';
  const model = process.env.VERTEX_AI_GEMINI_MODEL || 'gemini-2.5-flash';

  if (!project) {
    return NextResponse.json(
      { error: 'サーバ設定不足: GOOGLE_CLOUD_PROJECT を設定してください。' },
      { status: 500 }
    );
  }

  const prompt = [
    'あなたは行動改善を支援する日本語コーチです。',
    '以下の【今週の振り返り入力】は、クライアントの週報からの項目欄を改行区切りで連結したものです。',
    '',
    '【含まれる項目（いずれもクライアント入力済み・各10文字以上）】',
    '「行動目標」「行動内容」「行動の振り返り」「成果の振り返り」',
    '「心理面　行動時の思考・感情の変化」「気づき・学び・成長」',
    '「課題と原因の深掘り」「来週への改善点」',
    '',
    '【出力形式（必須）】',
    '- プレーンテキストを**1本だけ**出力する（JSON・コードブロック・前後の説明文は禁止）。',
    '- 1行目: 全体を言い表す見出し文（目安 32 文字前後・1 文で完結）。',
    '- 見出し行の直後に 1 回だけ改行し、その次の行から本文を開始する（見出しと本文のあいだに空行は入れない）。',
    '- 本文中の段落分けに空行を使うのは可。',
    '- 見出し・改行・本文を合算した Unicode 文字数で**300〜450 文字**を目安とする。',
    '',
    '【出力内容】',
    'これらの項目のうち、行動目標および課題と原因を踏まえ、来週に活かせる改善内容を提案してください。',
    '行動や成果への振り返り、特に心理面や気づき・学び・成長で記述されている言葉を引用しながら、',
    'クライアントへの受容・共感・承認をベースに次の一歩に活かす提案をしてください。',
    '',
    '【制約】',
    '- 日本語のみ。',
    '- 否定や断定を避け、実行しやすい提案にする。',
    '- サーバ検証のため、見出しと本文を合わせて**100 文字以上 450 文字以下**になるようにする（短文にしない）。',
    '- 文末は必ず完結した文（「。」または「！」や「？」）で終える。',
    '- 長さが上限に近いときは、最後の 1 文を省略してもよいが、文を途中で切らない。',
    '',
    '---',
    '【今週の振り返り入力】',
    input,
  ].join('\n');

  if (ENABLE_AI_PROMPT_LOG) {
    console.info('ai/weekly-improvement prompt chars:', countChars(prompt));
    console.info('ai/weekly-improvement prompt begin\n' + prompt + '\nai/weekly-improvement prompt end');
  }

  try {
    const auth = buildGoogleAuth();
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    const accessToken = token.token;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Google認証トークンの取得に失敗しました。' },
        { status: 500 }
      );
    }

    const modelResource = `projects/${project}/locations/${location}/publishers/google/models/${model}`;
    const endpoint = `https://aiplatform.googleapis.com/v1/${modelResource}:generateContent`;

    const generateSuggestion = async (promptText: string): Promise<{
      suggestion: string;
      charCount: number;
      blockReason?: string;
      httpError?: string;
      usageTotalTokenCount?: number;
    }> => {
      const aiRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: {
            maxOutputTokens: 4000,
            temperature: 0.4,
            topP: 0.9,
          },
        }),
        signal: AbortSignal.timeout(30000),
        cache: 'no-store',
      });

      const rawBody = await aiRes.text();
      let aiJson: {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        promptFeedback?: { blockReason?: string };
        error?: { message?: string; code?: number; status?: string };
        usageMetadata?: { totalTokenCount?: number };
      };
      try {
        aiJson = rawBody ? (JSON.parse(rawBody) as typeof aiJson) : {};
      } catch {
        return {
          suggestion: '',
          charCount: 0,
          httpError: `Vertex AI からの応答を解釈できませんでした（HTTP ${aiRes.status}）。`,
        };
      }

      if (ENABLE_AI_PROMPT_LOG) {
        console.info(
          `ai/weekly-improvement aiJson (HTTP ${aiRes.status}):`,
          safeJsonForLog(aiJson, AI_JSON_LOG_MAX_CHARS)
        );
      }

      const vertexErrMsg = typeof aiJson.error?.message === 'string' ? aiJson.error.message : '';
      if (!aiRes.ok) {
        const detail =
          vertexErrMsg ||
          (rawBody.length > 280 ? `${rawBody.slice(0, 280)}…` : rawBody) ||
          'Vertex AI API の呼び出しに失敗しました。';
        return { suggestion: '', charCount: 0, httpError: `Vertex AI エラー（${aiRes.status}）: ${detail}` };
      }

      const blockReason = aiJson.promptFeedback?.blockReason;
      const usageTotalTokenCount = readUsageTotalTokenCount(aiJson);
      const suggestion =
        aiJson.candidates?.[0]?.content?.parts
          ?.map((part) => (typeof part.text === 'string' ? part.text : ''))
          .join('')
          .trim() || '';
      const trimmed = trimToSentenceBoundary(suggestion, MAX_SUGGESTION_CHARS);
      return {
        suggestion: trimmed,
        charCount: countChars(trimmed),
        blockReason,
        usageTotalTokenCount,
      };
    };

    let usageSum = 0;
    let generated = await generateSuggestion(prompt);
    if (typeof generated.usageTotalTokenCount === 'number') {
      usageSum += generated.usageTotalTokenCount;
    }
    if (generated.httpError) {
      console.error('ai/weekly-improvement: generation error', generated.httpError);
      return NextResponse.json({ error: generated.httpError }, { status: 502 });
    }
    if (generated.blockReason) {
      return NextResponse.json(
        {
          error: `入力がポリシーにより処理されませんでした（${generated.blockReason}）。表現を変えて再試行してください。`,
        },
        { status: 422 }
      );
    }
    if (!generated.suggestion) {
      return NextResponse.json(
        { error: 'Ai改善提案を生成できませんでした（空の応答）。' },
        { status: 502 }
      );
    }

    if (generated.charCount < MIN_SUGGESTION_CHARS) {
      const expandPrompt = [
        prompt,
        '',
        '---',
        '前回の下書き（短すぎたため拡張してください）:',
        generated.suggestion,
        '',
        'この下書きを土台に、意味を変えず、情報を補って300〜450文字、見出し（約32文字）＋改行＋本文の形で拡張してください。',
      ].join('\n');
      const expanded = await generateSuggestion(expandPrompt);
      if (typeof expanded.usageTotalTokenCount === 'number') {
        usageSum += expanded.usageTotalTokenCount;
      }
      if (!expanded.httpError && !expanded.blockReason && expanded.charCount >= MIN_SUGGESTION_CHARS) {
        generated = expanded;
      }
    }

    const charCount = generated.charCount;
    if (charCount < MIN_SUGGESTION_CHARS) {
      return NextResponse.json(
        {
          error: `Ai改善提案の文字数が短すぎました（${charCount}文字）。入力内容を具体化して再実行してください。`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      suggestion: generated.suggestion,
      charCount,
      usageTotalTokenCount: usageSum > 0 ? usageSum : undefined,
    });
  } catch (e) {
    console.error('ai/weekly-improvement route error:', e);
    if (isFetchAbortOrTimeout(e)) {
      return NextResponse.json(
        { error: 'Ai改善提案の生成がタイムアウトしました。再実行してください。' },
        { status: 504 }
      );
    }
    const detail = e instanceof Error ? `${e.name}: ${e.message}` : '不明なエラー';
    return NextResponse.json({ error: `Ai改善提案の生成に失敗しました: ${detail}` }, { status: 502 });
  }
}

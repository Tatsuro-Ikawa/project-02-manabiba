import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { AI_REPORT_INPUT_MIN_TOTAL_CHARS } from '@/lib/journalAiReportWriteMode';

type MonthlyReportRequestBody = {
  monthlyInputText?: unknown;
};

type MonthlyReportSections = {
  actionAspect: string;
  outcomeAspect: string;
  psychologyAspect: string;
  insightGrowth: string;
};

export const runtime = 'nodejs';

const GCP_SA_KEY_JSON_ENV = 'GCP_SA_KEY_JSON';
const ENABLE_AI_PROMPT_LOG = false;
const MAX_SECTION_CHARS = 200;
const MIN_SECTION_CHARS = 100;
const MAX_TOTAL_CHARS = 800;
const AI_JSON_LOG_MAX_CHARS = 16000;

function countChars(text: string): number {
  return [...text].length;
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

function safeJsonForLog(obj: unknown, maxLen: number): string {
  try {
    const s = JSON.stringify(obj, null, 2);
    return s.length > maxLen ? `${s.slice(0, maxLen)}…(truncated)` : s;
  } catch {
    return String(obj);
  }
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

function extractJsonCandidate(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

function normalizeSections(sections: MonthlyReportSections): MonthlyReportSections {
  return {
    actionAspect: trimToSentenceBoundary(sections.actionAspect.trim(), MAX_SECTION_CHARS),
    outcomeAspect: trimToSentenceBoundary(sections.outcomeAspect.trim(), MAX_SECTION_CHARS),
    psychologyAspect: trimToSentenceBoundary(sections.psychologyAspect.trim(), MAX_SECTION_CHARS),
    insightGrowth: trimToSentenceBoundary(sections.insightGrowth.trim(), MAX_SECTION_CHARS),
  };
}

function totalChars(sections: MonthlyReportSections): number {
  return (
    countChars(sections.actionAspect) +
    countChars(sections.outcomeAspect) +
    countChars(sections.psychologyAspect) +
    countChars(sections.insightGrowth)
  );
}

export async function POST(request: NextRequest) {
  let body: MonthlyReportRequestBody;
  try {
    body = (await request.json()) as MonthlyReportRequestBody;
  } catch {
    return NextResponse.json({ error: 'リクエスト形式が不正です。' }, { status: 400 });
  }

  const monthlyInputText =
    typeof body.monthlyInputText === 'string' ? body.monthlyInputText.trim() : '';

  if (!monthlyInputText || countChars(monthlyInputText) < AI_REPORT_INPUT_MIN_TOTAL_CHARS) {
    return NextResponse.json(
      {
        error: `月次レポートの入力が不足しています（連結テキストは合計${AI_REPORT_INPUT_MIN_TOTAL_CHARS}文字以上必要です）。`,
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
    '以下の【月次統合入力】は、当該暦月に属する各週の週次学び帳（journal_weekly 相当）の所定フィールドを、週ごとに見出し付きで連結したものです。',
    '週の列挙は「週の開始日がその暦月内にある週」を対象とします（週が月境界をまたぐ場合も、開始日が月内なら当該月のインプットに含めます）。',
    '入力に値がなかった箇所は「無し」と記載されています。',
    '',
    'この内容を踏まえ、次の4キーを持つ JSON オブジェクトのみを返してください（必須）。',
    '- actionAspect … 行動面の要約（月次画面の「行動の振り返り」欄に相当する下書き）',
    '- outcomeAspect … 成果面の要約（「振り返り」成果面欄に相当）',
    '- psychologyAspect … 心理面の要約（「行動時の思考・感情の変化」欄に相当）',
    '- insightGrowth … 気づき・学び・成長（同名列に相当）',
    '',
    '【各レポート項目の構成の目安】',
    '- 各テーマごとに「見出し（内容を示す短いリード）」改行「本文」の順とする。',
    '- 各項目の本文は 100 文字以上 200 文字以下を目安とする（Unicode）。',
    '- 4 項目の合計は 800 文字以内。',
    '- 200 文字に近づくときは最後の 1 文を省略してもよいが、文を途中で切らない。',
    '',
    '【制約】',
    '- 日本語のみ。',
    '- 否定や断定を避け、実行しやすい表現にする。',
    '- 場合によって箇条書きも可とするが、必ずリード文を記載した上で箇条書きに移ること。箇条書きのみで終えない。',
    '- 「である調」を基準に報告書風に表現してよい。',
    '- 文末は必ず完結した文（「。」または「！」または「？」）で終える。',
    '',
    '【重要】出力は JSON オブジェクトのみ。前後の説明文や Markdown は禁止。',
    '',
    '---',
    '【月次統合入力】',
    monthlyInputText,
  ].join('\n');

  if (ENABLE_AI_PROMPT_LOG) {
    console.info('ai/monthly-report prompt chars:', countChars(prompt));
    console.info('ai/monthly-report prompt begin\n' + prompt + '\nai/monthly-report prompt end');
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

    const aiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 8000,
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
      error?: { message?: string };
      usageMetadata?: { totalTokenCount?: number };
    };

    try {
      aiJson = rawBody ? (JSON.parse(rawBody) as typeof aiJson) : {};
    } catch {
      return NextResponse.json(
        { error: `Vertex AI からの応答を解釈できませんでした（HTTP ${aiRes.status}）。` },
        { status: 502 }
      );
    }

    if (!aiRes.ok) {
      const detail = aiJson.error?.message || 'Vertex AI API の呼び出しに失敗しました。';
      return NextResponse.json({ error: `Vertex AI エラー（${aiRes.status}）: ${detail}` }, { status: 502 });
    }

    if (ENABLE_AI_PROMPT_LOG) {
      console.info(
        `ai/monthly-report aiJson (HTTP ${aiRes.status}):`,
        safeJsonForLog(aiJson, AI_JSON_LOG_MAX_CHARS)
      );
    }

    if (aiJson.promptFeedback?.blockReason) {
      return NextResponse.json(
        {
          error: `入力がポリシーにより処理されませんでした（${aiJson.promptFeedback.blockReason}）。表現を変えて再試行してください。`,
        },
        { status: 422 }
      );
    }

    const text =
      aiJson.candidates?.[0]?.content?.parts
        ?.map((part) => (typeof part.text === 'string' ? part.text : ''))
        .join('')
        .trim() || '';

    if (!text) {
      return NextResponse.json(
        { error: '月次 AI レポートを生成できませんでした（空の応答）。' },
        { status: 502 }
      );
    }

    let parsed: MonthlyReportSections;
    try {
      parsed = JSON.parse(extractJsonCandidate(text)) as MonthlyReportSections;
    } catch {
      return NextResponse.json(
        { error: '月次 AI レポートの JSON 解析に失敗しました。再実行してください。' },
        { status: 502 }
      );
    }

    const requiredKeys: Array<keyof MonthlyReportSections> = [
      'actionAspect',
      'outcomeAspect',
      'psychologyAspect',
      'insightGrowth',
    ];

    for (const k of requiredKeys) {
      if (typeof parsed[k] !== 'string' || !parsed[k].trim()) {
        return NextResponse.json(
          { error: `月次 AI レポートの必須項目が不足しています（${k}）。` },
          { status: 502 }
        );
      }
    }

    const normalized = normalizeSections(parsed);

    for (const k of requiredKeys) {
      const chars = countChars(normalized[k]);
      if (chars < MIN_SECTION_CHARS) {
        return NextResponse.json(
          { error: `月次 AI レポートの文字数が短すぎます（${k}: ${chars}文字）。` },
          { status: 502 }
        );
      }
    }

    if (totalChars(normalized) > MAX_TOTAL_CHARS) {
      return NextResponse.json(
        { error: `月次 AI レポートの合計文字数が上限を超えました（${totalChars(normalized)}文字）。` },
        { status: 502 }
      );
    }

    const usage = aiJson.usageMetadata?.totalTokenCount;

    if (ENABLE_AI_PROMPT_LOG) {
      console.info('ai/monthly-report response total chars:', totalChars(normalized));
      console.info(
        'ai/monthly-report response total tokens:',
        typeof usage === 'number' ? Math.max(0, Math.floor(usage)) : '(none)'
      );
      console.info(
        'ai/monthly-report response begin\n' +
          JSON.stringify(normalized, null, 2) +
          '\nai/monthly-report response end'
      );
    }

    return NextResponse.json({
      reports: normalized,
      charCountTotal: totalChars(normalized),
      usageTotalTokenCount: typeof usage === 'number' ? Math.max(0, Math.floor(usage)) : undefined,
    });
  } catch (e) {
    if (isFetchAbortOrTimeout(e)) {
      return NextResponse.json(
        { error: '月次 AI レポートの生成がタイムアウトしました。再実行してください。' },
        { status: 504 }
      );
    }
    const detail = e instanceof Error ? `${e.name}: ${e.message}` : '不明なエラー';
    return NextResponse.json(
      { error: `月次 AI レポートの生成に失敗しました: ${detail}` },
      { status: 502 }
    );
  }
}

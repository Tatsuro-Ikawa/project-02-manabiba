import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

type ImprovementRequestBody = {
  actionResultText?: unknown;
};

export const runtime = 'nodejs';

/** 本文（トークン注記の前）の最大文字数（Unicode コードポイント単位） */
const MAX_SUGGESTION_CHARS = 300;
/** 本文の最小文字数（短すぎる応答の抑止） */
const MIN_SUGGESTION_CHARS = 100;
/** プロンプト検証ログを出すか（true/1/on で有効） */
const ENABLE_AI_PROMPT_LOG = false;

function clampSuggestionText(text: string, maxChars: number): string {
  const chars = [...text];
  if (chars.length <= maxChars) return text;
  if (maxChars <= 1) return '…';
  return `${chars.slice(0, maxChars - 1).join('')}…`;
}

function countChars(text: string): number {
  return [...text].length;
}

const AI_JSON_LOG_MAX_CHARS = 16000;
const GCP_SA_KEY_JSON_ENV = 'GCP_SA_KEY_JSON';

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
    // 末尾側で句点が取れるときは、途中切れを避けてそこまで返す。
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
  let body: ImprovementRequestBody;
  try {
    body = (await request.json()) as ImprovementRequestBody;
  } catch {
    return NextResponse.json({ error: 'リクエスト形式が不正です。' }, { status: 400 });
  }

  const actionResultText =
    typeof body.actionResultText === 'string' ? body.actionResultText.trim() : '';

  if (!actionResultText) {
    return NextResponse.json(
      { error: 'actionResultText を指定してください。' },
      { status: 400 }
    );
  }
  if (actionResultText.length < 10) {
    return NextResponse.json(
      { error: '振り返りの入力は合わせて10文字以上にしてください。' },
      { status: 400 }
    );
  }

  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'asia-northeast1';
  // 1.5 系の版付き ID は退役済みで 404 になるため、既定は現行安定の 2.5 Flash（上書き: VERTEX_AI_GEMINI_MODEL）
  const model = process.env.VERTEX_AI_GEMINI_MODEL || 'gemini-2.5-flash';

  if (!project) {
    return NextResponse.json(
      { error: 'サーバ設定不足: GOOGLE_CLOUD_PROJECT を設定してください。' },
      { status: 500 }
    );
  }

  const prompt = [
    'あなたは行動改善を支援する日本語コーチです。',
    '以下の【本日の振り返り入力】は、クライアントが複数の欄を改行区切りで連結したものです。',
    '【含まれうる項目】',
    '朝の目標、実行状況、行動の結果（どのようにできたか・目標への近づき等）、行動時の感情・思考、こころのブレーキ（種類・反論できたか・反論の言葉）、気づき・感動・学びと課題、利用者が先に書いた「明日への改善点」。',
    '【ブレーキと反論】',
    'こころのブレーキ（行動を抑制する働き）が働いた場合は、記述されている「どんなブレーキか」「反論の有無」「反論で使った言葉」を特に重視し、受容したうえで次の一歩に活かす提案をする。',
    '',
    '出力は次の2つの意図を見出しと文章の構成で書いてください。',
    '　- 内容の優先順位',
    '実行状況と行動の結果 → 感情・思考と気づき・感動・学びと課題 → ブレーキと反論の言葉 →（あれば）利用者の明日への改善点。余裕があれば朝の目標との整合にも触れてよい。',
    '　- 構成の目安',
    '合計は160〜300文字。見出し+文章の形で出力する。',
    '前半: 受容・共感・承認。できたこと・努力・ブレーキに対する反論など事実を踏まえて1〜3文（目安 50〜100文字）。',
    '後半: 明日への改善の機会。思考（別の捉え方）・行動（小さく試せる一歩）・感情（和らげ方や気づき）を自然な文に溶かす（目安 100〜200文字）。',
    '【制約】',
    '- 日本語のみ。',
    '- 否定や断定を避け、実行しやすい提案にする',
    '- 100文字未満の短文にしない',
    '- 文末は必ず完結した文（「。」または「！」や「？」）で終える',
    '- 300文字に近づく場合は、最後の1文を省略しても文を途中で切らない',
    '- 300文字を超えないよう、前半と後半のバランスを調整する',
    '',
    '---',
    '【本日の振り返り入力】',
    actionResultText,
  ].join('\n');

  if (ENABLE_AI_PROMPT_LOG) {
    console.info('ai/improvement prompt chars:', countChars(prompt));
    console.info('ai/improvement prompt begin\n' + prompt + '\nai/improvement prompt end');
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

    // 公式: POST https://aiplatform.googleapis.com/v1/{model}:generateContent
    // {model} は projects/.../locations/.../publishers/google/models/... の完全修飾名（リージョンはパス内に含める）
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
            // 日本語 300 文字前後の本文 + 内部推論に余裕（モデル・内容により変動）
            maxOutputTokens: 4000,
            temperature: 0.4,
            topP: 0.9,
          },
        }),
        signal: AbortSignal.timeout(20000),
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
        if (ENABLE_AI_PROMPT_LOG) {
          console.info(
            'ai/improvement: JSON parse failed, rawBody head:',
            rawBody.length > 2000 ? `${rawBody.slice(0, 2000)}…` : rawBody
          );
        }
        return {
          suggestion: '',
          charCount: 0,
          httpError: `Vertex AI からの応答を解釈できませんでした（HTTP ${aiRes.status}）。サーバログを確認してください。`,
        };
      }

      if (ENABLE_AI_PROMPT_LOG) {
        console.info(
          `ai/improvement aiJson (HTTP ${aiRes.status}):`,
          safeJsonForLog(aiJson, AI_JSON_LOG_MAX_CHARS)
        );
      }

      const vertexErrMsg =
        typeof aiJson.error?.message === 'string' ? aiJson.error.message : '';
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
      console.error('ai/improvement: first generation error', generated.httpError);
      return NextResponse.json({ error: generated.httpError }, { status: 502 });
    }
    if (generated.blockReason) {
      console.warn('ai/improvement: prompt blocked', generated.blockReason);
      return NextResponse.json(
        { error: `入力がポリシーにより処理されませんでした（${generated.blockReason}）。表現を変えて再試行してください。` },
        { status: 422 }
      );
    }
    if (!generated.suggestion) {
      return NextResponse.json(
        { error: 'Aiコーチからのコメントを生成できませんでした（空の応答）。モデル名・権限・リージョンを確認してください。' },
        { status: 502 }
      );
    }

    // 短すぎる応答は、同内容を保持したまま拡張生成を1回だけ試みる
    if (generated.charCount < MIN_SUGGESTION_CHARS) {
      const expandPrompt = [
        prompt,
        '',
        '---',
        '前回の下書き（短すぎたため拡張してください）:',
        generated.suggestion,
        '',
        'この下書きを土台に、意味を変えず、情報を補って160〜300文字、見出し+文章の形で拡張してください。',
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
    const tokenNote =
      usageSum > 0 ? `\n（使用トークン合計: ${usageSum}）` : '';
    const suggestionOut = `${generated.suggestion}${tokenNote}`;
    const charCountOut = countChars(suggestionOut);

    if (ENABLE_AI_PROMPT_LOG) {
      console.info('ai/improvement response body chars:', charCount);
      console.info('ai/improvement response total tokens:', usageSum || '(none)');
      console.info('ai/improvement response begin\n' + suggestionOut + '\nai/improvement response end');
    }
    if (charCount < MIN_SUGGESTION_CHARS) {
      return NextResponse.json(
        {
          error: `Aiコーチからのコメントの文字数が短すぎました（${charCount}文字）。入力内容を少し具体化して再実行してください。`,
        },
        { status: 502 }
      );
    }
    return NextResponse.json({
      suggestion: suggestionOut,
      charCount: charCountOut,
      usageTotalTokenCount: usageSum > 0 ? usageSum : undefined,
    });
  } catch (e) {
    console.error('ai/improvement route error:', e);
    if (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code?: string }).code === 'ENOENT'
    ) {
      const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '(未設定)';
      return NextResponse.json(
        {
          error: `認証鍵ファイルが見つかりません。GOOGLE_APPLICATION_CREDENTIALS を確認してください: ${credPath}。Vercel では ${GCP_SA_KEY_JSON_ENV} の利用を推奨します。`,
        },
        { status: 500 }
      );
    }
    if (isFetchAbortOrTimeout(e)) {
      return NextResponse.json(
        { error: 'Aiコーチからのコメントの生成がタイムアウトしました。再実行してください。' },
        { status: 504 }
      );
    }
    if (
      e instanceof Error &&
      /does not exist, or it is not a file/i.test(e.message)
    ) {
      const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '(未設定)';
      return NextResponse.json(
        {
          error: [
            'GOOGLE_APPLICATION_CREDENTIALS の値が無効です。',
            'サービスアカウントの「.json 鍵ファイル」へのフルパスを指定してください（プロジェクトフォルダやディレクトリは不可）。',
            `Vercel では ${GCP_SA_KEY_JSON_ENV} に JSON 全文を設定する方法を推奨します。`,
            `現在の値: ${credPath}`,
          ].join(' '),
        },
        { status: 500 }
      );
    }
    const detail =
      e instanceof Error
        ? `${e.name}: ${e.message}`
        : typeof e === 'string'
          ? e
          : '不明なエラー';
    console.error('ai/improvement route error detail:', detail);
    return NextResponse.json(
      {
        error: `Aiコーチからのコメントの生成に失敗しました: ${detail}`,
      },
      { status: 502 }
    );
  }
}

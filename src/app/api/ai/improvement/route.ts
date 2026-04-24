import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

type ImprovementRequestBody = {
  actionResultText?: unknown;
};

export const runtime = 'nodejs';

function isFetchAbortOrTimeout(e: unknown): boolean {
  if (e instanceof DOMException && e.name === 'AbortError') return true;
  if (e instanceof Error) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') return true;
  }
  return false;
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
      { error: '「行動の結果」は10文字以上で入力してください。' },
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
    '入力された「行動の結果」をもとに、次回に向けた改善提案を1段落で作成してください。',
    '制約:',
    '- 出力は日本語の短文1段落のみ',
    '- 箇条書きは禁止',
    '- 100〜180文字程度',
    '- 否定や断定を避け、実行しやすい提案にする',
    '',
    `行動の結果: ${actionResultText}`,
  ].join('\n');

  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
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

    const aiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 220,
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
    };
    try {
      aiJson = rawBody ? (JSON.parse(rawBody) as typeof aiJson) : {};
    } catch {
      console.error(
        'ai/improvement: Vertex応答がJSONではありません',
        aiRes.status,
        rawBody.slice(0, 500)
      );
      return NextResponse.json(
        {
          error: `Vertex AI からの応答を解釈できませんでした（HTTP ${aiRes.status}）。サーバログを確認してください。`,
        },
        { status: 502 }
      );
    }

    const vertexErrMsg =
      typeof aiJson.error?.message === 'string' ? aiJson.error.message : '';

    if (!aiRes.ok) {
      const detail =
        vertexErrMsg ||
        (rawBody.length > 280 ? `${rawBody.slice(0, 280)}…` : rawBody) ||
        'Vertex AI API の呼び出しに失敗しました。';
      console.error('ai/improvement: Vertex HTTP error', aiRes.status, detail);
      return NextResponse.json(
        {
          error: `Vertex AI エラー（${aiRes.status}）: ${detail}`,
        },
        { status: 502 }
      );
    }

    const blockReason = aiJson.promptFeedback?.blockReason;
    if (blockReason) {
      console.warn('ai/improvement: prompt blocked', blockReason);
      return NextResponse.json(
        { error: `入力がポリシーにより処理されませんでした（${blockReason}）。表現を変えて再試行してください。` },
        { status: 422 }
      );
    }

    const suggestion =
      aiJson.candidates?.[0]?.content?.parts
        ?.map((part) => (typeof part.text === 'string' ? part.text : ''))
        .join('')
        .trim() || '';

    if (!suggestion) {
      console.error('ai/improvement: empty candidates', JSON.stringify(aiJson).slice(0, 800));
      return NextResponse.json(
        { error: 'AI改善提案を生成できませんでした（空の応答）。モデル名・権限・リージョンを確認してください。' },
        { status: 502 }
      );
    }

    return NextResponse.json({ suggestion });
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
          error: `認証鍵ファイルが見つかりません。GOOGLE_APPLICATION_CREDENTIALS を確認してください: ${credPath}`,
        },
        { status: 500 }
      );
    }
    if (isFetchAbortOrTimeout(e)) {
      return NextResponse.json(
        { error: 'AI改善提案の生成がタイムアウトしました。再実行してください。' },
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
        error: `AI改善提案の生成に失敗しました: ${detail}`,
      },
      { status: 502 }
    );
  }
}

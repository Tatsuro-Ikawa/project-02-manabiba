# Vertex AI — トライアル「Aiコーチからのコメント」（開発者向け）

## 1. 概要

4週間トライアル（`/trial_4w`）の**朝・晩**タブで、当日の振り返り入力（複数欄を連結したテキスト）をもとに **Vertex AI（Gemini）** でコーチング風のコメントを生成する PoC です。画面上の表記は **「Aiコーチからのコメント」** です。

- **画面・クライアント**: `src/components/trial/TrialMorningEvening.tsx`  
  - 入力は `buildAiReflectionInputText` で複数フィールドをラベル付きブロックに連結し、リクエストボディの `actionResultText` に載せる（キー名は後方互換のためそのまま）。  
  - **合計10文字未満**のときは実行不可（API でも 400）。  
  - **同一日あたり 3 回**まで実行（`eveningAiSuggestionRunCount` を Firestore に保存。API 単体の強制ではない）。  
  - 生成結果は任意で **「Aiコーチからのコメントを保存」** により `eveningAiSuggestionText` に永続化。  
  - `POST /api/ai/improvement` を `fetch` で呼び出す（相対パス）。
- **API ルート**: `src/app/api/ai/improvement/route.ts`  
  - `runtime = 'nodejs'`  
  - **Vertex AI REST** の `generateContent` を `google-auth-library` のアクセストークンで呼び出す（Turbopack と Vertex Node SDK の相性問題を避けるため、SDK 直利用はしていない）。  
  - 本文は **100〜300 文字**を目安にし、**160〜300 文字**をプロンプトで指示。短文時は **最大 1 回**だけ拡張用の追いプロンプトで再呼び出しする。  
  - 応答末尾に、Vertex の `usageMetadata.totalTokenCount` を集計した **`（使用トークン合計: N）`** をサーバー側で付与（初回＋拡張の 2 回呼び出し時は合算）。  
  - `generationConfig.maxOutputTokens` は **4000**（内部推論 `thoughtsTokenCount` 等で `MAX_TOKENS` 打切りを減らすため。出力本文が常に 4000 トークンになるわけではない）。

プロダクト上の役割分担の正本は [manabiba_01/03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md](./manabiba_01/03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md) を参照してください。

### 1.1 開発用コンソールログ

検証用に `prompt` / 応答本文 / `aiJson` を `console.info` するコードがあるが、**現在は `ENABLE_AI_PROMPT_LOG = false` で無効**。再有効化する場合は `src/app/api/ai/improvement/route.ts` 内の定数を編集する（個人情報がログに出るため本番ではオフ推奨）。

---

## 2. 環境変数（`.env.local`）

**リポジトリにコミットしないこと。** 鍵 JSON は `.gitignore` 対象外のパスに置かない運用を推奨します。

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `GOOGLE_CLOUD_PROJECT` | はい | GCP プロジェクト ID（例: `plandosee-project-01`） |
| `GCP_SA_KEY_JSON` | 推奨（Vercel） | サービスアカウント鍵 JSON の**全文文字列**。設定時はこれを優先して認証する |
| `GOOGLE_APPLICATION_CREDENTIALS` | ローカルで推奨 | **サービスアカウント鍵の JSON ファイル**への絶対パス。**ディレクトリやプロジェクトルートは不可** |
| `GOOGLE_CLOUD_LOCATION` | いいえ | 既定: `asia-northeast1`。モデルリソース名の `locations/...` に使う |
| `VERTEX_AI_GEMINI_MODEL` | いいえ | 既定: `gemini-2.5-flash`（コード側フォールバックと一致） |

認証の優先順位は **`GCP_SA_KEY_JSON` → `GOOGLE_APPLICATION_CREDENTIALS`**。  
`.env.local` を変更したら **Next の dev サーバーを再起動**してください。

---

## 3. GCP 側の準備

### 3.1 API の有効化

1. [Google Cloud Console](https://console.cloud.google.com/) で対象プロジェクトを選択  
2. **API とサービス → ライブラリ**  
3. **Vertex AI API** を検索して有効化  

（一覧確認は **有効な API とサービス** から。）

### 3.2 サービスアカウントと IAM

1. **IAM と管理 → サービス アカウント** で、アプリ用の SA を作成（または既存を使用）  
2. 鍵の JSON をダウンロードし、`GOOGLE_APPLICATION_CREDENTIALS` がその**ファイル**を指すようにする  
3. **IAM と管理 → IAM** で、その SA（`client_email` と一致）に次を付与  
   - **`Vertex AI ユーザー`**（`roles/aiplatform.user`）  

**注意**: **`Vertex AI サービス エージェント`**（`roles/aiplatform.serviceAgent`）は Google 管理用の役割であり、アプリ用 SA の呼び出し権限の代替にはなりません。

### 3.3 鍵と `client_email` の一致

JSON 内の `"client_email"` が、IAM でロールを付けた SA と**同じ**であることを確認してください。別 SA の鍵のままだと 403 になります。

---

## 4. 呼び出し仕様（実装メモ）

### 4.1 エンドポイント URL

[公式 REST](https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/projects.locations.publishers.models/generateContent) に従い、次の形です。

- **ベース**: `https://aiplatform.googleapis.com`（**リージョンホスト** `https://{region}-aiplatform.googleapis.com` ではない）  
- **パス**: `/v1/projects/{PROJECT}/locations/{LOCATION}/publishers/google/models/{MODEL_ID}:generateContent`

`{LOCATION}` は東京利用時も `asia-northeast1` でよいケースが多いです（モデル ID がそのリージョンで提供されていることが前提）。

### 4.2 認証

`GoogleAuth` で `https://www.googleapis.com/auth/cloud-platform` スコープを取得し、`Authorization: Bearer {token}` で上記 URL に POST します。

### 4.3 モデル ID と退役

[モデルバージョンとライフサイクル](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions)に従い、**退役済みモデルは 404** になります。  
例: `gemini-1.5-flash-001` / `gemini-1.5-flash-002` は退役済みのため利用しないでください。

既定は **`gemini-2.5-flash`**（現行の安定系のひとつ）です。コスト・速度優先なら `gemini-2.5-flash-lite` や `gemini-2.0-flash-lite-001` などへの差し替えを `.env.local` で行えます。

---

## 5. API `POST /api/ai/improvement`

### 5.1 リクエスト

- **Content-Type**: `application/json`  
- **Body**:

```json
{ "actionResultText": "本日の振り返り（複数欄を連結したテキスト。合計10文字以上）" }
```

実装では `TrialMorningEvening` が朝の目標・実行状況・結果・感情・ブレーキ・気づき・明日への改善点などを `【…】` 見出し付きで連結して渡す。

### 5.2 成功レスポンス

```json
{
  "suggestion": "見出し+本文（160〜300文字目安）。末尾に改行で（使用トークン合計: N）が付く場合あり",
  "charCount": 0,
  "usageTotalTokenCount": 0
}
```

- `suggestion` … 本文の後に、取得できた場合のみ `（使用トークン合計: N）` が続く（`N` は当該 API 呼び出し内の Vertex `usageMetadata.totalTokenCount` の合算）。  
- `charCount` … `suggestion` 全体の Unicode コードポイント数。  
- `usageTotalTokenCount` … 上記 `N` と同値。取得できない場合はフィールド省略可。

### 5.3 エラー時（例）

- **400**: 本文欠如、10文字未満、JSON 不正  
- **422**: ポリシーによるブロック（`promptFeedback.blockReason` あり）  
- **500**: `GOOGLE_CLOUD_PROJECT` 未設定、鍵ファイル不正・未検出（メッセージにパスが含まれる場合あり）  
- **502**: Vertex からのエラー本文、空の candidates、**本文が最小文字数未満**、想定外例外（開発時は `Error.message` を返すことがある）  
- **504**: タイムアウト（`AbortSignal` 約 20 秒）

クライアントは `res.json()` の `error` を表示します。

### 5.4 補足: `finishReason: "MAX_TOKENS"` と `usageMetadata`

Vertex 応答の `candidates[0].finishReason` が **`MAX_TOKENS`** のときは、**出力トークン上限に達して生成が打ち切られた**ことを意味する。`usageMetadata.thoughtsTokenCount`（内部推論）が大きいと、本文 `candidatesTokenCount` が短くなることがある。対策として `maxOutputTokens` を上げたり、プロンプトを短くしたり、短文時の再生成ロジックを併用する。

---

## 6. トラブルシューティング

| 現象 | 想定原因 | 対処の方向 |
|------|----------|------------|
| `GOOGLE_APPLICATION_CREDENTIALS` がフォルダを指している／「not a file」 | パスが JSON ファイルではない | `.json` ファイルのフルパスに修正 |
| `ENOENT` | 鍵パスが存在しない | パス・ドライブ文字・ファイル名を確認 |
| **403** `aiplatform.endpoints.predict` denied | SA に Vertex 呼び出し権限がない | **`Vertex AI ユーザー`** を該当 SA に付与。Vertex AI API 有効化を確認 |
| **404** Publisher Model not found | 退役モデル／未提供リージョン／誤ったモデル ID | [モデル一覧](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions)で現行 ID に変更。`VERTEX_AI_GEMINI_MODEL` を更新 |
| 502（汎用メッセージ） | 例外の詳細が隠れている | サーバーログの `ai/improvement` を確認。クライアントの `error` 全文を確認 |
| 本文が極端に短い／途中で切れる | `finishReason: MAX_TOKENS` や `thoughtsTokenCount` の消費 | §5.4 を参照。`maxOutputTokens`・再生成ロジックは `route.ts` を確認 |
| 504 | ネットワーク遅延・Vertex 側の遅延 | 再実行、タイムアウト延長（コード変更が必要） |

LAN（例: `http://192.168.11.10:3000`）からブラウザで開いていても、**Vertex への通信は Next を動かしているマシンから**行われます。鍵とネットワークはそのマシン基準で成立させてください。

---

## 7. 本番・セキュリティ

- **鍵 JSON をリポジトリに含めない**  
- Vercel 等では **環境変数に鍵内容を入れる方式**や **Workload Identity** など、ホスティングの推奨パターンに合わせる（本ドキュメントは主にローカル PoC 向け）  
- 本 API は **認証済み Firebase ユーザー限定にしていない**（サーバールートのみ）。本番投入前に **レート制限・認可・ログ方針** を別途決めることを推奨します。

---

## 8. 関連ファイル一覧（抜粋）

| 種別 | パス |
|------|------|
| API | `src/app/api/ai/improvement/route.ts` |
| UI | `src/components/trial/TrialMorningEvening.tsx` |
| スタイル（ボタン状態など） | `src/styles/home-trial.css` |
| 依存 | `package.json` の `google-auth-library` |

設計書索引: [manabiba_01/00_README.md](./manabiba_01/00_README.md)

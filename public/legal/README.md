# 利用規約・プライバシーポリシー（条文ファイル）

**アプリが読み込む実行時ファイルです。**

- **文面の編集・ドラフト**: [docs/manabiba_01/04_LEGAL_DOCUMENTS.md](../../docs/manabiba_01/04_LEGAL_DOCUMENTS.md) **§5（Markdown）** を先に更新し、確定後に本フォルダの JSON を作成してください。
- 仕様・同意フロー・テスト: 同 doc の §1〜§4

## ファイル

| ファイル | 内容 |
|----------|------|
| `terms.json` | 利用規約（章立て） |
| `privacy.json` | プライバシーポリシー（1本） |

## 版（version）

- 各 JSON の **`"version"`** が正本です（形式: `YYYY-MM-DD`）。
- 文面を変えて**再同意**が必要なときは、`version` を新しい日付に更新してください。
- アプリは `users/{uid}.consents` に保存した `termsVersion` / `privacyVersion` と照合します。

## 編集の注意

1. **有効な JSON** であること（カンマ・引用符）。エディタの JSON 検証を推奨。
2. `terms.json` は `sections` 配列必須。各 section に `title` と `paragraphs`（1件以上）。
3. `privacy.json` は `paragraphs` 配列必須（1件以上）。
4. 変更後は **開発サーバー再起動** または **本番再デプロイ**（Vercel の `public` 配下はデプロイに含まれる）。

## 表示される画面

- `/consent`（同意・スクロール全文）
- `/terms`（利用規約のみ）
- `/privacy`（プライバシーのみ）

いずれも **同じファイル** を読み込みます。同意画面だけ別内容にはなりません。

## 特商法

特定商取引法に基づく表記は **`/legal/tokushoho`**（別ページ）。本フォルダの JSON とは別管理です。

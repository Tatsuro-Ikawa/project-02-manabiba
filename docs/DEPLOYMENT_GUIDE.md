# デプロイ手順（project-02-manabiba）

このドキュメントでは、ビルド済みの Next.js アプリを外部に公開する手順を説明します。

---

## 方法1: Vercel でデプロイ（推奨）

Next.js を開発している Vercel のサービスを使うと、設定が最小限で済みます。

### 前提
- プロジェクトを **GitHub** にプッシュ済みであること
- [Vercel](https://vercel.com) のアカウント（GitHub でサインアップ可）

### 手順

1. **Vercel にログイン**  
   https://vercel.com にアクセスし、GitHub アカウントでログインします。

2. **「Add New…」→「Project」**  
   インポートするリポジトリとして、`project-02-manabiba`（または該当リポジトリ名）を選択します。

3. **設定の確認**
   - **Framework Preset**: Next.js（自動検出）
   - **Root Directory**: そのまま（リポジトリルート）
   - **Build Command**: `npm run build`（デフォルト）
   - **Output Directory**: そのまま（Next.js が自動設定）
   - **Install Command**: `npm install`（デフォルト）

4. **「Deploy」をクリック**  
   ビルドとデプロイが実行され、数分で URL が発行されます（例: `https://project-02-manabiba-xxxx.vercel.app`）。

5. **今後の更新**  
   GitHub の `main`（または設定したブランチ）にプッシュするたびに、自動で再デプロイされます。

---

## 方法2: Netlify でデプロイ

1. https://www.netlify.com にログイン（GitHub 連携可）。
2. **「Add new site」→「Import an existing project」** で GitHub リポジトリを選択。
3. ビルド設定を次のように指定します。
   - **Build command**: `npm run build`
   - **Publish directory**: `.next` ではなく、Netlify が Next.js を検出すると **「Next.js ランタイム」** 用の設定が自動で入ります。そのままデプロイして問題ありません。
4. **「Deploy site」** でデプロイ開始。

---

## 方法3: 自前サーバー（Node.js）で動かす

ビルド成果物をサーバーに置いて、Node で起動する方法です。

### 手順

1. **ローカルでビルド**
   ```bash
   npm run build
   ```

2. **以下をサーバーにコピー**
   - フォルダ全体、または少なくとも以下:
     - `.next/`
     - `node_modules/`
     - `package.json`
     - `public/`（あれば）

3. **サーバーで依存関係のインストール（必要なら）**
   ```bash
   npm install --production
   ```

4. **本番起動**
   ```bash
   npm run start
   ```
   デフォルトでは `http://localhost:3000` で待ち受けます。  
   Nginx や Apache でリバースプロキシし、ドメインや HTTPS を設定します。

5. **常時起動**  
   `pm2` や `systemd` で `npm run start` を常時実行するように設定します。

---

## デプロイ前の確認

- ローカルで **`npm run build`** が成功すること。
- 環境変数（Firebase など）を使う場合は、Vercel/Netlify の「Environment Variables」に本番用の値を設定すること。
- このプロジェクトは認証未実装のため、本番公開時は必要に応じてアクセス制限（Basic 認証や IP 制限など）を検討してください。

---

## まとめ

| 方法       | 難易度 | 特徴 |
|------------|--------|------|
| **Vercel** | ★☆☆   | Next.js に最適・自動デプロイ・無料枠あり |
| **Netlify**| ★★☆   | 静的〜SSR 対応・Git 連携で自動デプロイ |
| **自前サーバー** | ★★★ | フルコントロール・Node の運用が必要 |

まずは **Vercel** でリポジトリをインポートして「Deploy」するだけで、このバージョンをすぐに公開できます。

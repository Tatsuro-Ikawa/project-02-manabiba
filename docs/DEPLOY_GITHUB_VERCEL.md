# GitHub への保存と Vercel でのデプロイ手順

## 1. GitHub に保存する

### 1.1 変更をコミットする

プロジェクトルートで以下を実行します。

```bash
# 状態確認
git status

# すべての変更をステージング
git add .

# コミット（メッセージは任意）
git commit -m "ホーム・フッター・いちおしサイト等を実装、SNSセクション非表示"
```

### 1.2 リモートがまだない場合（新規リポジトリ）

1. [GitHub](https://github.com) で **New repository** を作成する（例: `project-02-manabiba`、Private 可）。
2. リポジトリ作成後、表示される「…or push an existing repository from the command line」のコマンドを実行する。

```bash
git remote add origin https://github.com/<あなたのユーザー名>/project-02-manabiba.git
git branch -M main
git push -u origin main
```

### 1.3 すでにリモートがある場合

```bash
git push origin main
```

（ブランチ名が `main` でない場合は `git branch` で確認し、その名前で push）

---

## 2. Vercel でデプロイする

### 2.1 Vercel にログイン

1. [Vercel](https://vercel.com) にアクセスし、**Continue with GitHub** でログインする。
2. 初回は GitHub の「Vercel にリポジトリへのアクセスを許可する」を承認する。

### 2.2 プロジェクトのインポート

1. ダッシュボードで **Add New…** → **Project** をクリック。
2. **Import Git Repository** で、先ほど push した `project-02-manabiba` を選択する。
3. **Configure Project** で以下を確認する。
   - **Framework Preset**: Next.js（自動検出）
   - **Root Directory**: そのまま（`./`）
   - **Build Command**: `npm run build`（デフォルト）
   - **Output Directory**: `.next`（Next.js のデフォルト）

そのまま **Deploy** をクリックする。

### 2.3 環境変数（任意だが推奨）

Firebase を本番でも明示的に設定したい場合、**Project Settings → Environment Variables** で次を追加する。

| 名前 | 値 | 備考 |
|------|-----|------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | （Firebase の値） | Firebase Console のプロジェクト設定から |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `plandosee-project-01.firebaseapp.com` | 同上 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `plandosee-project-01` | 同上 |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | （Firebase の値） | 同上 |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | （Firebase の値） | 同上 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | （Firebase の値） | 同上 |

※ 現在のコードは未設定時はフォールバック値を使うため、設定しなくても動く可能性はありますが、本番では環境変数での設定を推奨します。

### 2.4 Firebase の「認証済みドメイン」に Vercel の URL を追加

Google ログイン等が動くようにするため、Firebase 側で Vercel のドメインを許可します。

1. [Firebase Console](https://console.firebase.google.com) → 対象プロジェクト（plandosee-project-01）を開く。
2. **Authentication** → **Sign-in method** → **Authorized domains** を開く。
3. **Add domain** で次を追加する。
   - `project-02-manabiba.vercel.app`（Vercel が付与するデフォルトドメイン）
   - カスタムドメインを使う場合はそのドメインも追加する。

### 2.5 デプロイの確認

- 初回デプロイは数分かかることがあります。
- 完了後、**Visit** または表示された URL でサイトを開き、表示・ログイン・Firestore 読み書きを確認してください。

---

## 3. 今後の更新フロー

コードを変更したら、次の流れで反映できます。

```bash
git add .
git commit -m "変更内容のメッセージ"
git push origin main
```

Vercel は GitHub と連携しているため、`main` に push すると自動で再デプロイされます（**Production** 環境）。

---

## 4. トラブルシューティング

| 現象 | 確認すること |
|------|----------------|
| ビルドが失敗する | Vercel の **Deployments** のログでエラー行を確認。`npm run build` をローカルで実行して再現する。 |
| ログインできない | Firebase の **Authorized domains** に Vercel のドメインが入っているか確認する。 |
| 画面が真っ白 | ブラウザのコンソールでエラーを確認。Firebase の設定や環境変数が本番で正しいか確認する。 |

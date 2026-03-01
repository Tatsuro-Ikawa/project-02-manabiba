# GitHub へのプッシュ手順

このプロジェクトはすでに Git が初期化されており、リモートは次のように設定されています。

- **リモート名**: `origin`
- **URL**: `https://github.com/Tatsuro-Ikawa/project-02-manabiba.git`

---

## 手順（ターミナルで実行）

### 1. プロジェクトフォルダに移動

```powershell
cd d:\Dev\01_Prot\Project_02_manabiba\project-02-manabiba
```

（すでにこのフォルダでターミナルを開いている場合は不要です。）

---

### 2. 変更を「ステージング」する（コミット対象に含める）

**すべての変更をまとめて追加する場合：**

```powershell
git add .
```

**特定のファイルだけ追加する場合：**

```powershell
git add src/
git add docs/
git add package.json
```

---

### 3. コミットする（変更にメッセージを付けて記録）

```powershell
git commit -m "ホーム・トライアルUI、デプロイ準備"
```

`"..."` の部分は自由に変更してかまいません（例：「サイドバー・ハンバーガーメニュー対応」）。

---

### 4. GitHub にプッシュする

**現在のブランチ（いまは `commit`）をそのままプッシュする場合：**

```powershell
git push -u origin commit
```

**`main` ブランチに合わせてプッシュしたい場合：**

```powershell
git checkout main
git merge commit
git push -u origin main
```

または、いまのブランチ名を `main` に変えてからプッシュ：

```powershell
git branch -M main
git push -u origin main
```

---

## 初回だけ：GitHub でリポジトリを作る場合

まだ GitHub にリポジトリがない場合は、先に GitHub 上で作成します。

1. https://github.com にログイン
2. 右上の **「+」→「New repository」**
3. **Repository name**: `project-02-manabiba`（任意）
4. **Public** を選択
5. **「Create repository」** をクリック
6. 表示される「…or push an existing repository from the command line」のコマンドのうち、**2行目・3行目**を使います：

   ```powershell
   git remote add origin https://github.com/あなたのユーザー名/project-02-manabiba.git
   git branch -M main
   git push -u origin main
   ```

   ※ すでに `origin` がある場合は、`git remote add origin ...` は不要です。別のリポジトリにしたいときは `git remote set-url origin https://...` で URL を変更できます。

---

## よく使うコマンド一覧

| やりたいこと           | コマンド |
|------------------------|----------|
| 状態確認               | `git status` |
| 変更を全部ステージ     | `git add .` |
| コミット               | `git commit -m "メッセージ"` |
| プッシュ               | `git push -u origin ブランチ名` |
| リモート確認           | `git remote -v` |
| 現在のブランチ確認     | `git branch` |

---

## プッシュ時にユーザー名・パスワードを聞かれたら

- **ユーザー名**: GitHub のユーザー名（例: Tatsuro-Ikawa）
- **パスワード**: 通常のログイン用パスワードではなく、**Personal Access Token (PAT)** を発行してそれを使います。
  1. GitHub → **Settings** → **Developer settings** → **Personal access tokens**
  2. **Generate new token** でスコープに `repo` を付けて発行
  3. 表示されたトークンをコピーし、パスワードの代わりに貼り付けてプッシュ

プッシュが成功すれば、Vercel で「Import Git Repository」からこのリポジトリを選んでデプロイできます。

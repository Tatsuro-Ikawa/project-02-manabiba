# スタートプログラム「7つのステップ」実装仕様

## 目的

`/start-program` を **7つのステップ**（旧称: 7日間スタートプログラム）として全面刷新する。Feature Flag により Preview では新 UI、Production では Legacy（PDF 案内）を表示する。

- 画面 URL: `/start-program`（刷新 UI は Feature Flag ON 時）
- Feature Flag: `NEXT_PUBLIC_FF_START_PROGRAM_REFRESH`（[DEPLOY_GITHUB_VERCEL.md](../DEPLOY_GITHUB_VERCEL.md) §3.5）
- 参照モック: `docs/manabiba_01/` 配下の Step0〜Step1 モック PNG
- 紙ベース参照（Step 構成・WS 構造の背景）: [paper_based_tools/01_ワーキングシート_v0.62.txt](./paper_based_tools/01_ワーキングシート_v0.62.txt)（`Pub-260117_v0.62`）
- 関連: [04_HOME_SCREEN_IMPLEMENTATION.md](./04_HOME_SCREEN_IMPLEMENTATION.md) §1.3、[04_SUBSCRIPTION_STATE_TRANSITIONS.md](./04_SUBSCRIPTION_STATE_TRANSITIONS.md)

---

## 1. 用語

| 用語 | 意味 |
|------|------|
| **スタートプログラム** | `/start-program` 画面全体。将来は複数プログラムをタブで切替 |
| **7つのステップ** | 現バージョンで唯一のプログラム（Step0 + Step1〜7） |
| **説明シート** | 各 Step の読み物（`.md` + `.png`） |
| **ワークシート（WS）** | 各 Step の入力画面 |
| **全体ナビ** | Step0〜7 間の移動（Step ピル + 左右矢印 + 現在タイトル） |
| **ステップ内ナビ** | 同一 Step 内の説明 ↔ WS 切替（上下2箇所・状態共有） |

---

## 2. 画面構造・ルーティング

### 2.1 URL

| URL | 内容 |
|-----|------|
| `/start-program` | プログラム選択（現状は **7つのステップ** のみ → 自動リダイレクト可） |
| `/start-program/seven-steps` | Step0 または Step1 説明への入口 |
| `/start-program/seven-steps/step/{n}` | Step `n`（0〜7） |
| `?pane=guide` | 説明シート |
| `?pane=worksheet` | ワークシート |

- 説明 ↔ WS は **同一 URL + `pane` クエリ**（フルページ遷移なし）
- Step 間移動は **`/step/{n}`** で URL 更新（再読込・ブックマーク・ブラウザ戻る対応）
- 将来の第2プログラム: `/start-program/{programId}/...`

### 2.2 レイアウト（共通フレーム）

- 既存 `ProtoHeader` / `LeftSidebar` / `ProtoFooter` を継続
- ヘッダー表記: **スタートプログラム**
- メイン領域:
  - **プログラムタブ**（現状「7つのステップ」のみ）
  - **全体ナビ**
  - **Step タイトル**
  - **ステップ内ナビ**（上）
  - **コンテンツ**（説明 or WS）
  - **ステップ内ナビ**（下）
- `?downgraded=free` バナーは刷新 UI 上部にも表示
- `start7d` ユーザー向け「気づきノートへアップグレード」は刷新 UI 下部に配置

---

## 3. ナビゲーター

### 3.1 全体ナビ（Step 間）

| 項目 | 仕様 |
|------|------|
| Step 数 | プログラム定義の `steps.length`（7つのステップ = **8**: Step0 + Step1〜7） |
| ジャンプ | **未着手 Step へも自由に移動可** |
| 現在位置 | **Step ピル**（`Step0`〜`Step7`）のハイライト + 下段に `Step{n} / 7` とタイトル |
| 左右矢印 | 前後 Step へ。先頭/末尾では **disabled** |
| ピル列 | 横スクロール。現在 Step は `scrollIntoView` で中央付近へ |
| スマホ | ピル横スワイプ、矢印タップ領域拡大 |

### 3.2 ステップ内ナビ（説明 ↔ WS）

| 項目 | 仕様 |
|------|------|
| 説明 → WS | **常に進める**（入力不要） |
| WS → 説明 | **常に戻れる** |
| WS → 次 Step | **必須入力なし** |
| 配置 | 上下 **同一コンポーネント2回**（状態共有） |
| 推奨フロー | 説明を読んでから WS。**強制しない** |

### 3.3 Step0

| 項目 | 仕様 |
|------|------|
| ペイン | **説明シート + ワークシート**（`guide` / `worksheet`） |
| 説明シート正本 | `public/start-program/seven-steps/step00/guide.md`（紙 v0.62「始めに」79行以降） |
| デフォルト入口 | Step0 **説明シート** |
| 「戻る」（Step0 説明） | **disabled** |
| 「次へ」（Step0 説明） | Step0 WS へ |

---

## 4. 説明シート（コンテンツ運用）

### 4.1 ファイル配置

```
public/start-program/seven-steps/
  step00/                 # Step0 は WS のみ（guide なし）
  step01/
    guide.md
    guide-intro.png       # 例: 意味の分かるファイル名
    guide-balance.png
  step02/
    ...
```

| 項目 | 仕様 |
|------|------|
| 正本 | **`.md` ファイル**（Word → md 変換運用） |
| 画像 | **複数可**。`guide-{意味}.png` 形式 |
| md 内画像 | `/start-program/seven-steps/step01/guide-intro.png` |
| 編集フロー | 開発者が commit → Preview 確認 → 本番 |
| レンダリング | 既存 Markdown 表示（アファメーション等）を流用 |
| 将来 | CMS / Firestore / Admin は必要時 |

---

## 5. Step0 ワークシート

**正本: UI モック**（紙 v0.62 の質問文とは異なる）

### 5.1 質問（7問）

1. これからの人生、どんな人生を送りたいと思いますか？
2. 最近、「おもしろいなぁ」と感じる場面はありましたか？ それは、どんな時でしたか？
3. もっと自由になれたら何をしたいですか？
4. いまの自分、どんなところをより良くしたいですか？
5. どんなことに挑戦したいですか？
6. 「現状を変える」のに必要なものはなんだとおもいますか？
7. 「こんな自分もありかもしれない」と思うことはありますか？ それは、どんな姿でしょうか。

### 5.2 入力

| 項目 | 仕様 |
|------|------|
| 形式 | 1問1 **textarea** |
| 文字数 | **250 文字**（Unicode カウント、`n/250` 表示） |
| 必須 | **なし**（空のまま次 Step へ進める） |

### 5.3 表示テキスト（固定）

- 導入: 「まずは、あなたの声を聴いてみましょう」「以下の質問に答えてみてください。」
- 締め: 「今の質問に答える中で…」「まだ答えがなくても大丈夫です。ここから一緒に、見つけていきましょう。」

---

## 6. Step1 ワークシート（曼荼羅チャート）

### 6.1 8 領域定数

| ID | 表示名 | サブタイトル |
|----|--------|-------------|
| `social_contribution` | 社会貢献 | 社会への貢献と還元 |
| `career` | キャリア・仕事 | 仕事での成長と貢献 |
| `health` | 健康・ウェルネス | 心身の健康維持 |
| `spirituality` | 精神性・内面 | 心の平安と成長 |
| `learning` | 学習・経験 | 継続的な学びと成長 |
| `money` | お金・財産 | 経済的な安定と成長 |
| `hobbies` | 趣味・芸術 | 遊びを楽しむ時間 |
| `relationships` | 人間関係・家族 | 良好な関係性の構築 |
| `center_goal` | 人生の中心目標 | （中心・1フィールド） |

### 6.2 レイアウト

| 画面 | レイアウト |
|------|-----------|
| PC | 3×3 グリッド（中心 = 人生の中心目標） |
| スマホ（768px 未満） | **中心目標を最上部**、8 領域を縦リスト |

### 6.3 カード操作

| 項目 | 仕様 |
|------|------|
| ホバー | PC: ハイライト / タッチ: `:active` または `:focus-visible` |
| クリック | 入力モーダルを開く |
| プレビュー | カード幅・高さに収まる範囲で **項目を列記**（`-webkit-line-clamp` 2〜3行）。溢れは `+N件` 等 |

### 6.4 中心目標

- **モーダルなし**
- チャート中央（PC）/ 最上部（スマホ）に **インライン textarea**
- **150 文字**（`n/150`）

---

## 7. Step1 入力モーダル

### 7.1 構成

- **一覧エリア**: テーブル風、折り返し全文表示、行選択可
- **入力エリア**: 下部 textarea（初期2行程度、最大6行程度で自動伸長）
- ボタン: **閉じる** / **追加**（追加モード）／**キャンセル**・**保存**（編集モード）／**編集**／**削除**

### 7.2 データモデル（1 領域あたり）

```typescript
type StartProgramEntry = {
  id: string;              // UUID（不変。他 Step・気づきノートから参照）
  text: string;            // max 150（Unicode）
  domainId: MandalaDomainId;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  sortOrder: number;
  usage?: {                // P2 以降 optional
    asTheme?: boolean;
    linkedStepIds?: string[];
  };
};
```

### 7.3 操作

| 操作 | 仕様 |
|------|------|
| 追加 | 入力 →「追加」→ 一覧に行追加 → 入力欄クリア |
| 行クリック | 選択状態のみ（入力欄には載せない）。編集・削除ボタンが有効になる |
| 編集 | 選択中の行を入力欄へ読込。ボタンが「保存」に変わる |
| 保存 | 選択中の行を入力欄内容で上書き → 追加モードへ（入力欄クリア） |
| キャンセル | 編集を破棄し追加モードへ（選択は維持） |
| 削除 | 選択中の行のみ削除（未選択時・編集中は disabled） |
| 閉じる | **未追加・未保存の入力のみ破棄**。既存一覧は維持 |
| エリア外クリック（入力欄） | フォーカス解除。選択・モードは維持 |
| 編集中の Esc | 編集キャンセル（追加モードへ） |

### 7.4 制約

| 項目 | 値 |
|------|-----|
| 1 項目の文字数 | 150 |
| 1 領域の最大件数 | **20** |
| 並び順 | **追加順（古→新）** |
| 空文字追加 | **不可**（trim 後 0 文字はエラー） |
| 保存 | 追加/編集/削除のたび **Firestore 即時 persist**（P2 以降） |

### 7.5 1 項目 = 1 テーマ（将来連携）

- 各 `entry.id` を **不変キー** とし、Step4（テーマ決定）・気づきノート等から **参照**（テキストのコピーはしない）
- テキスト変更時も `entryId` 参照は有効

---

## 8. Firestore

### 8.1 パス（P2 以降）

```
users/{uid}/start_program/
  seven_steps/
    meta          # 全体進捗
    step00        # Step0
    step01        # Step1
    step02        # …（Step ごとに構造が異なれば別ドキュメント）
```

### 8.2 `meta`

```typescript
{
  currentStep: number;           // 最後に開いた Step（0〜7）
  lastPaneByStep: Record<string, 'guide' | 'worksheet'>;
  updatedAt: Timestamp;
}
```

### 8.3 `step00`

```typescript
{
  answers: {
    q1: string;  // max 250
    q2: string;
    // … q7
  };
  updatedAt: Timestamp;
}
```

### 8.4 `step01`

```typescript
{
  centerGoalText: string;        // max 150
  domains: Record<MandalaDomainId, StartProgramEntry[]>;
  sharedWithCoach: boolean;      // P2: 常に false。P3 以降 UI/ルール
  updatedAt: Timestamp;
}
```

### 8.5 セキュリティ

| Phase | ルール |
|-------|--------|
| **P2** | **オーナーのみ** read/write |
| **P3 以降** | 担当コーチ read（`sharedWithCoach == true` + 割当 active）。write はオーナーのみ |

- 既存 `journalWriteAllowedForOwner` / コーチ割当パターンに準拠予定
- Legacy PDF データとは **独立**（共存。公開後も紙 PDF は無料配布予定）

### 8.6 利用者

| ユーザー | 利用 |
|----------|------|
| フリー（`start7d`） | 利用可（主導線） |
| 有料（`kizuki` 等） | **利用可**。URL 直打ち含む |
| データの位置づけ | 将来 **気づきノート等クライアントデータの中核** |

---

## 9. Feature Flag・公開

| 環境 | Flag | 表示 |
|------|------|------|
| Production | `false` | Legacy（PDF 案内） |
| Preview / ローカル `.env.local` | `true` | 刷新 UI |
| 本番公開 | Production を `true` | 刷新 UI |

- 名称「7日間 → 7つのステップ」: **刷新 UI 内は開発中から使用可**。ランディング・同意・サイドバーは **公開タイミングで一括変更**

---

## 10. コンポーネント構成（実装指針）

```
src/components/start-program/
  StartProgramShell.tsx
  SevenStepsProgram.tsx
  navigators/
    StepNavigator.tsx
    StepPaneNavigator.tsx
  step00/
    Step00WorksheetPane.tsx
  step01/
    Step01GuidePane.tsx
    Step01WorksheetPane.tsx
    MandalaChart.tsx
    MandalaCard.tsx
    MandalaEntryModal.tsx
  StartProgramLegacyView.tsx
  StartProgramRefreshView.tsx

src/lib/startProgram/
  sevenStepsConstants.ts      # プログラム定義・8領域
  sevenStepsStep00Firestore.ts
  sevenStepsStep01Firestore.ts
```

- Legacy / Refresh は **View 分岐のみ**。共通ファイルのコピーは行わない

---

## 11. 実装フェーズ

| Phase | 内容 | 確認 |
|-------|------|------|
| **P0** | フレーム + Step0 WS + Step1 説明（静的 md）+ ナビ | 遷移・レイアウト |
| **P1** | Step1 曼荼羅 + モーダル（local state）+ スマホ | 操作感 |
| **P2** | Firestore（step00/step01）+ ルール（本人のみ） | 永続化 |
| **P3** | Step2 以降、コーチ共有、気づきノート連携、本番 Flag ON | リリース |

---

## 12. Step2（興味レーン）

詳細正本: [05_STEP02_INTEREST_LANE_SPEC.md](./05_STEP02_INTEREST_LANE_SPEC.md)

| Phase | 内容 |
|-------|------|
| **P0** | 3カテゴリ入口＋興味・掘り下げ（リスト／モーダル／手追加／ダミー候補）※実装済 |
| **P1a** | まとめる①②（色分け・命名・D&D移動）※実装済 |
| **P1b** | 文にする（キーセンテンス）※実装済 |
| **P2** | Step1 保存時 AI 生成 |
| **P3** | 価値観・得意・強み |

- 分類は Step1 入力時（A/B/C/D）。Step2 興味は A のみ
- 永続化（当面）: `localStorage`（`step01` / `step02.interest`）。HTTP キャッシュではない
- ダミー: `public/start-program/seven-steps/step02/dummy/yuko-persona.json`（編集可）

---

## 12b. Step3（満足度〜取組領域）

詳細正本: [08_STEP03_SATISFACTION_SPEC.md](./08_STEP03_SATISFACTION_SPEC.md)

| 項目 | 内容 |
|------|------|
| タイトル | 満足度をみて、取組む領域を決める |
| Phase | A 採点 → B レーダー（recharts・パターン判定・任意メモ）→ C 上部レーダー＋表（満足度昇順・候補≤N・三点セル入力）で focus 1領域 |
| 候補上限 N | `/settings` で **1〜8**（既定 **4**）。localStorage `startProgram.appSettings.v1` |
| 紙との差 | WS6+WS5 を Step3 に集約。理由・ブレーキは Step4 |
| 永続化（当面） | `localStorage`。Step1 は参照のみ |

---

## 12c. Step4（こころのブレーキ探索・草案）

詳細草案: [09_STEP04_BRAKE_EXPLORATION_SPEC.md](./09_STEP04_BRAKE_EXPLORATION_SPEC.md)（課題の明確化〜何が変わればよい？）／[10_STEP04_DEEP_DIVE_SPEC.md](./10_STEP04_DEEP_DIVE_SPEC.md)（こころの深掘り）

| 項目 | 内容 |
|------|------|
| タイトル（案） | 満足度の理由から、こころのブレーキの入口を探る |
| 本紙範囲 | 課題の明確化（理由複数）→ 変えやすさ①〜④ → 持ち方／なし方／あり方タグ → こころの深掘り（場面・行動 → 気持ち・こころの声・こころの抵抗 → こころの働き → 自分の言葉） |
| 確定方針 | ③④は保留保存のみ（再評価ループなし）。深掘りは「あり方」を選んだ①②課題のみ。1課題で「この気づきを保存する」まで進めば Step4 完了 |
| 紙との差 | 旧 WS4「行動と結果10個」入口を、Step3取組領域の満足度理由に置換 |
| 現状 | モック（localStorage・ダミー AI）。未着手: 実 AI 組込・Firestore |

---

## 13. 紙資料との関係

| 資料 | パス | 用途 |
|------|------|------|
| **ワーキングシート v0.62** | [paper_based_tools/01_ワーキングシート_v0.62.txt](./paper_based_tools/01_ワーキングシート_v0.62.txt) | Step 構成・WS 番号・説明文の背景。PDF 版 `Pub-260117_v0.62` |
| **UI モック（Step0/1）** | プロジェクト添付 PNG | **画面実装の正本**（Step0 質問文はモック優先） |
| **UI モック（Step2 興味）** | 添付 PNG（掘り下げ／まとめる／文にする） | 興味レーンの正本 |

紙 v0.62 の Step0 質問（例: 「今、これからの人生について…」）は **モックと文言が異なる**。実装は **モック 7 問** を正とする（2026-08 確定）。

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-10-06 | Step4「まとめ」を「こころの深掘り」に置き換えたモックを追加（仕様 10） |
| 2026-09-24 | Step4 こころのブレーキ探索の設計草案を追加（AI前まで・仕様 09） |
| 2026-09-21 | Step3 UI 確定（レーダー余白/フォント・横スクロール・ヒントイラストと補足アコーディオン、取組領域は表入力＋上部レーダー、候補上限は `/settings` で 1〜8 既定4）。仕様 08 を現状正本に更新 |
| 2026-09-20 | Step3 改訂確定（採点→レーダー→領域1つ。理由はStep4。仕様08更新） |
| 2026-09-18 | Step3 満足度評価（曼荼羅＋0〜10＋理由）。紙WS6をデジタルStep3に先行。仕様 08 追加 |
| 2026-09-14 | Step2 興味レーン P0（3カテゴリ入口＋掘り下げ）。仕様 05 追加 |
| 2026-08-25 | Step1 曼荼羅チャート・入力モーダル（local state）実装。全体ナビを Step ピル型に変更 |
| 2026-08-23 | 初版。画面構造・Step0/1・Firestore・フェーズ・Feature Flag を確定 |

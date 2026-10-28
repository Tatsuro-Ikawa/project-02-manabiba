# 計画と気づきノートの連携（PDCA・阻害の乗り越え・スケジュール管理）設計仕様（草案）

最終更新: 2026-10-14

関連:
- [12_STEP05_TIMELINE_SPEC.md](./12_STEP05_TIMELINE_SPEC.md)（Step5 後半：しるし・段階・振れ幅・道のり）
- [11_STEP05_DESIRED_STATE_SPEC.md](./11_STEP05_DESIRED_STATE_SPEC.md)（Step5 前半）
- [04_TRIAL_28_IMPLEMENTATION_DECISIONS.md](./04_TRIAL_28_IMPLEMENTATION_DECISIONS.md)（気づきノートの現行仕様：朝・晩・週・月）
- [03_FIRESTORE_DATABASE_STRUCTURE.md](./03_FIRESTORE_DATABASE_STRUCTURE.md)（`journal_daily` / `journal_weekly` / `journal_monthly`）
- [04_AFFIRMATION_DESIGN.md](./04_AFFIRMATION_DESIGN.md)（行動宣言）

---

## 1. 背景と目的

### 1.1 現行の気づきノートの範囲

現在の気づきノートは、**行動宣言を毎日行うこと** と **日々の自分への気づきを高める力を身につけること** を主眼に設計されている。

| 現行でできること | 現行の限界 |
|------------------|------------|
| 朝：行動宣言の実施、今日の行動目標（自由記述） | 計画のどの行動かと結びついていない |
| 晩：実行度（3 段階）、満足度、気づき、明日の行動、Aiコーチ | 行動ごとの記録がない。ブレーキの記録は自由記述（一部 UI 非表示） |
| 週・月：7 日グリッド、満足度の推移、振り返り、Aiレポート・改善提案 | 目標・しるし・節目との比較がない。遅れや挽回を扱う仕組みがない |

### 1.2 目的

スタートプログラム（Step5〜7）で作った計画を、実行の段階で気づきノートが引き継ぎ、次の役割を担えるようにする。

1. 目標達成に向けた **PDCA サイクル** を回す
2. 計画の **阻害要因を乗り越えながら** 推進する
3. **スケジュール管理**（振れ幅の想定、遅れの把握、挽回）を行う

あわせて、気づきノートに機能を追加する前の **今の段階** で、計画側に連携の仕組み（データの形）を入れておく。

---

## 2. 機能の分担

### 2.1 PDCA との対応

| PDCA | 担う場所 | 主な機能 |
|------|----------|----------|
| **計画（Plan）** | スタートプログラム Step5 後半〜Step7 | 到達のしるし・節目・期間・振れ幅（Step5 後半）、行動とめやす・乗り越え策（Step6）、行動宣言（Step7） |
| **実行（Do）** | 気づきノート：朝・晩 | 朝に計画の行動から今日やることを選ぶ。晩に行動ごとの「やれた」、阻害と乗り越え策を記録 |
| **確認（Check）** | 気づきノート：週・月・節目 | 週は実行の割合と手応えのしるし。月と節目は到達のしるし・節目の姿と比べる |
| **立て直し（Act）** | 気づきノート：計画タブ（新設） | 遅れの把握、挽回の選択、計画の改訂（履歴つき） |

計画を **作る** のはスタートプログラム、作った計画を **育て直す** のは気づきノート。

### 2.2 画面ごとの分担

| 画面 | 現行 | 追加 |
|------|------|------|
| 朝 | 行動宣言、今日の行動目標 | 計画の行動から今日の行動を選ぶ。ブレーキの目印が近い日は乗り越え策を表示 |
| 晩 | 実行度、満足度、気づき、Aiコーチ | 行動ごとの「やれた」と量。らしさ（3 段階）。阻害が出たらどれか・乗り越え策を使えたか・効いたか |
| 週 | グリッド、満足度、振り返り、AI | 実行の割合（自動）、手応えのしるしの記録、4 分類の診断、来週の小さな調整 |
| 月 | 同上 | 到達のしるしの記録、ペース表示、挽回の入口 |
| 節目（新設：段階の終わり） | — | 節目の姿との比較、次の段階のめやす確認、見直し（なじむ の終わりは必ず） |
| 計画タブ（新設） | — | 道のりボード（予定線と実績）、ペース表示、阻害リスト、挽回、改訂履歴 |
| 行動宣言タブ | 作成・編集・履歴 | Step7 の行動宣言と計画をひも付ける |

---

## 3. 計画データ（連携の正本）

### 3.1 保存先

| 対象 | パス | 備考 |
|------|------|------|
| 計画 | `users/{uid}/plans/{planId}` | Step7 完了時に作成（[12](./12_STEP05_TIMELINE_SPEC.md) D17）。作成前の入力は `users/{uid}/start_program/{docId}`（[14](./14_START_PROGRAM_SYNC_AND_ACCESS_SPEC.md) §2.4） |
| 実行中の計画 | `users/{uid}.activePlanId` | 当面は 1 つだけ（D23） |
| 改訂履歴 | `users/{uid}/plans/{planId}/revisions/{version}` | 改訂ごとに 1 件 |
| 節目の振り返り | `users/{uid}/plans/{planId}/reviews/{reviewId}` | 段階の終わりごと |

- 自由記述の文章は、気づきノートと同じく暗号化して保存する（フィールド名は `…TextEncrypted`）。
- コーチ共有は、既存の共有設定（`sharedWithCoach` 等）に合わせる（D24）。

### 3.2 ID と版のルール（今の段階で入れておく仕組み）

| ルール | 内容 | 理由 |
|--------|------|------|
| 変わらない ID | 項目・しるし・段階・行動・阻害・乗り越え策のすべてに、作成時に ID を付ける。文章を直しても ID は変えない | 気づきノートの記録は文章ではなく ID で参照するため |
| 削除しない | 使わなくなった要素は `archivedAt` を付けて残す | 過去の記録とのつながりを保つため |
| 版（改訂番号） | 計画に `version` を持ち、改訂ごとに 1 増やす。記録側には `planId` と `planVersion` を残す | どの計画のときの記録かを後から分かるようにするため |
| 日付の形式 | すべて `YYYY-MM-DD`（JST）。気づきノートの `dateKey` と同じ | 日の記録とそのまま照合するため |
| 週で持たない | 計画は日付で持ち、週への割り振りは表示時に行う | 週の始まり（月曜／日曜）は利用者ごとに設定できるため |
| 選択肢は固定の値 | しるしの種類・頻度・実行度などは決まった値（列挙）で持つ | 気づきノート側で入力欄を自動で作るため |

### 3.3 型（案）

```typescript
type DateKey = string;               // YYYY-MM-DD（JST）
type LayerKey = 'have' | 'do' | 'be';

type Plan = {
  planId: string;
  version: number;
  status: 'active' | 'paused' | 'completed' | 'archived';
  domainId: MandalaDomainId;
  goalStatementEncrypted: string;    // 目標の一文
  baselineScore: number;             // 開始時の満足度
  targetScore: 8 | 9 | 10;
  startDate: DateKey;
  targetDate: DateKey;               // 達成時期（標準）
  targetDateLatest: DateKey;         // 幅の最長
  items: PlanItem[];                 // Step5 前半の項目（目標・今・違い）
  markers: PlanMarker[];             // しるし（Step5 後半）
  stages: PlanStage[];               // 段階と節目（Step5 後半）
  busyPeriods: PlanBusyPeriod[];     // 忙しい時期（Step5 後半）
  bufferWeekPerStage: boolean;
  actions: PlanAction[];             // 行動とめやす（Step6）
  obstacles: PlanObstacle[];         // 阻害と乗り越え策（Step6）
  affirmationId: string | null;      // 行動宣言（Step7）
  sourceRefs: { step05ThemeDomainId: MandalaDomainId; step04ReasonIds: string[] };
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type PlanItem = {
  id: string;                        // Step5 前半の Step05Item.id を引き継ぐ
  layer: LayerKey;
  targetTextEncrypted: string;
  currentTextEncrypted: string;
  gapTextEncrypted: string;
  isFocus: boolean;                  // 重点
  archivedAt: Timestamp | null;
};

type MarkerKind = 'count' | 'scale10' | 'yesno' | 'words';
type Cadence = 'daily' | 'weekly' | 'monthly';

type PlanMarker = {
  id: string;
  itemId: string | null;             // 全体の満足度は null
  role: 'arrival' | 'response';      // 到達のしるし／手応えのしるし
  labelEncrypted: string;
  kind: MarkerKind;
  unit: string | null;               // 回・時間 など（count のとき）
  baseline: number | string | null;  // words のときは文章（暗号化）
  target: number | string | null;
  checkCadence: 'weekly' | 'monthly';
  archivedAt: Timestamp | null;
};

type PlanStage = {
  id: string;
  kind: 'settle' | 'expand' | 'root';   // なじむ／広げる／根づかせる
  startDate: DateKey;
  endDate: DateKey;
  milestoneTextEncrypted: string;       // 節目の姿
  expected: { markerId: string; value: number | string }[];
  reviewDate: DateKey;                  // 節目の振り返り日（settle の終わりは必ず）
};

type PlanBusyPeriod = { id: string; startDate: DateKey; endDate: DateKey; reasonEncrypted: string };

type PlanAction = {
  id: string;
  itemIds: string[];                    // どの違いを縮める行動か
  textEncrypted: string;
  cadence: { kind: Cadence; times: number };          // 例：週 3 回
  amountByStage: { stageId: string; amount: number | null; unit: string | null }[];  // 段階ごとのめやす
  minimumTextEncrypted: string | null;  // 「これだけはやる」最小の行動
  priority: 1 | 2 | 3;                  // 1 が最優先（Step6 の ◎）
  archivedAt: Timestamp | null;
};

type PlanObstacle = {
  id: string;
  kind: 'mind' | 'situation';           // こころの阻害／状況の阻害
  step04ReasonId: string | null;
  sceneEncrypted: string | null;        // 出やすい場面（Step4 の場面）
  signEncrypted: string | null;         // こころの声などの兆し
  copingTextEncrypted: string;          // 乗り越え策（もし〜なら〜する）
  actionIds: string[];
  stageIds: string[];                   // ブレーキが出そうな節目
  source: 'plan' | 'journal';           // 実行中に見つけた阻害は journal
  archivedAt: Timestamp | null;
};

type PlanRevision = {
  version: number;
  at: Timestamp;
  kind: RecoveryKind | 'initial' | 'stage_review';
  reasonTextEncrypted: string | null;
  changedIds: string[];
};
```

---

## 4. 気づきノート側の追加項目（既存項目は変更しない）

追加する項目はすべて **任意（なくても動く）**。計画がない利用者や、計画以前の記録はこれまでどおり表示する。

### 4.1 日（`journal_daily/{dateKey}`）

```typescript
planLog?: {
  planId: string;
  planVersion: number;
  morningActionIds: string[];           // 朝に選んだ今日の行動
  actions: {
    actionId: string;
    execution: 'done' | 'partial' | 'none';
    amount: number | null;              // 量（任意）
  }[];
  selfFit: 'strong' | 'some' | 'weak' | null;   // らしさ
  obstacles: {
    obstacleId: string | null;          // 新しい阻害は null ＋ 下の文章
    newObstacleTextEncrypted: string | null;
    copingUsed: 'yes' | 'partial' | 'no';
    helped: 'yes' | 'partial' | 'no' | null;
  }[];
};
```

- 朝に選んだ行動は、既存の「今日の行動目標」（`morningTodayActionText`）にも文章で書き込む。既存の週・月の表示や AI レポートはそのまま動く。
- 晩の既存の実行度（`eveningExecution`）は、行動ごとの記録から代表値を自動で入れる（手で変更も可）。
- ブレーキの作動（`eveningBrake`）は、阻害の記録があれば自動で「働いた」にする。

### 4.2 週（`journal_weekly/{weekStartKey}`）

```typescript
planReview?: {
  planId: string;
  planVersion: number;
  executionRate: number | null;         // 実行の割合（保存時点の集計）
  markerChecks: { markerId: string; value: number | string | null; noteEncrypted: string | null }[];
  diagnosis: 'keep' | 'revise_action' | 'lighten' | 'review_brake' | null;   // 4 分類
  pace: 'on_track' | 'slow' | 'review' | null;
  adjustments: { actionId: string; change: 'up' | 'down' | 'swap' | 'pause' }[];
};
```

### 4.3 月（`journal_monthly/{monthKey}`）

```typescript
planReview?: {
  planId: string;
  planVersion: number;
  markerChecks: { markerId: string; value: number | string | null; noteEncrypted: string | null }[];
  pace: 'on_track' | 'slow' | 'review' | null;
  recoveryChoices: RecoveryKind[];      // 選んだ挽回（改訂につながる）
};
```

### 4.4 節目（`plans/{planId}/reviews/{reviewId}`）

| 項目 | 内容 |
|------|------|
| `stageId` | 振り返る段階 |
| `markerResults` | しるしの値と、節目の期待値との比較 |
| `milestoneReachedChoice` | 節目の姿に：届いた／ほぼ届いた／まだ |
| `reflectionTextEncrypted` | 振り返り（気づき・学び） |
| `nextStageAdjustments` | 次の段階のめやす・期間の調整（改訂として記録） |

---

## 5. 機能仕様

### 5.1 PDCA を回す

| 頻度 | 内容 | PDCA |
|------|------|------|
| 毎日（朝） | 行動宣言。計画の行動から今日やることを選ぶ（自由記述も併用可）。ブレーキの目印が近い日は乗り越え策を表示 | Do |
| 毎日（晩） | 行動ごとに「やれた」（3 段階）と量。らしさ。阻害が出たら、どれか・乗り越え策を使えたか・効いたか | Do・小さな Check |
| 毎週 | 実行の割合（自動）、手応えのしるしの記録、4 分類の診断、来週の小さな調整（めやすの上げ下げ・入れ替え） | Check・小さな Act |
| 毎月 | 到達のしるしの記録、ペース表示、挽回の選択 | Check・Act |
| 節目 | 節目の姿との比較、次の段階のめやすの確認、見直し | Check・Act |
| 計画の終わり | 到達のしるしと満足度で振り返り、次の計画（別の取組領域など）へ | Act |

4 分類（[12](./12_STEP05_TIMELINE_SPEC.md) §3.3）と週の調整の対応:

| 診断 | 表示（案） | 来週の調整の候補 |
|------|-----------|------------------|
| やれた × 手応えあり | このまま続けましょう | 段階に応じてめやすを上げる |
| やれた × 手応えなし | やり方を見直してみませんか | 行動を入れ替える・工夫する（仮説の修正） |
| やれなかった × 手応えあり | 軽くして続けましょう | 最小の行動に切り替える |
| やれなかった × 手応えなし | 止めているものを確かめましょう | 阻害と乗り越え策を見直す（Step6 の内容）・行動宣言を読み直す |

### 5.2 阻害を乗り越えながら進める

- Step6 で作った阻害（こころの阻害・状況の阻害）と乗り越え策を **阻害リスト** として計画に持つ。
- 晩の記録は、阻害リストから選ぶ。リストにない阻害は文章で追加でき、計画の阻害リストに `source: 'journal'` として加わる（計画へのフィードバック）。
- 集計（計画タブ・週）:「どの阻害が、どれくらい出て、どの乗り越え策が効いたか」。
- 同じ阻害が 1 週間に 3 回以上出たら、乗り越え策の見直しを促す。
- 晩の画面で今は非表示になっているブレーキ・反論の欄（`eveningBrakeRebuttalChoice` 等）は、阻害リストからの選択として再び生かす。

### 5.3 スケジュール管理

#### 5.3.1 振れ幅の想定（計画時・[12](./12_STEP05_TIMELINE_SPEC.md) §5.4）

- 達成時期の幅、各段階の余白の週、忙しい時期を計画に持つ。
- 忙しい時期は、行動のめやすを最小の行動に下げた予定として扱う。

#### 5.3.2 遅れの把握（自動のサイン）

| 表示 | 条件（初期値・D21 で調整） |
|------|------------------------------|
| **順調** | 実行の割合が 70% 以上、かつ しるしが予定線の幅の内側 |
| **少しゆっくり** | 実行の割合が 50〜70%、または しるしが予定線の幅の下 |
| **見直しどき** | 次のどれか：実行の割合が 50% 未満で 2 週続く／手応えのしるしが 1 つの段階のあいだ動かない／同じ阻害が 1 週間に 3 回以上 |

- 実行の割合 ＝（できた 1 ＋ 一部 0.5 の合計）÷ その週のめやすの回数。
- 予定線は、段階ごとの期待値を直線でつないだもの。幅は、10 段階なら ±1、回数なら期待値の ±20% を初期値とする。
- 忙しい時期と余白の週は、判定の対象から外す。
- 赤字や「未達」の表示は使わない（[12](./12_STEP05_TIMELINE_SPEC.md) §2 の表現の原則）。

#### 5.3.3 挽回のメニュー

「見直しどき」または利用者の任意で開く。軽いものから順に並べ、選んだ内容は **計画の改訂**（`PlanRevision`）として理由とともに残す。

| # | 挽回（`RecoveryKind`） | 表示（案） | 計画への反映 |
|---|------------------------|-----------|--------------|
| 1 | `focus` | 優先を絞る | 行動を 1 つに（他は一時停止） |
| 2 | `lighten` | めやすを下げて続ける | 最小の行動に切り替え |
| 3 | `rework` | やり方を変える | 行動の入れ替え・工夫（効率化・仮説の修正） |
| 4 | `support` | 助けを借りる | 持ち方（支援）の行動を追加 |
| 5 | `coping` | 乗り越え策を強める | 阻害・乗り越え策の見直し（Step6 の内容） |
| 6 | `extend` | 時期を延ばす | 達成時期・段階の日付を変更 |
| 7 | `retarget` | 目標を見直す | 到達のしるし・目指す値の修正 |

- 目標の見直しも「失敗」ではなく、正当な選択肢として示す。コーチの確認を必要にするかは D22。
- 改訂の履歴は計画タブで見られ、そのまま学びの記録になる。

### 5.4 計画タブ（新設・案）

| ブロック | 内容 |
|----------|------|
| 道のりボード | 段階の帯、節目、今日の位置、しるしの予定線と実績、忙しい時期・余白の週 |
| ペース | 順調／少しゆっくり／見直しどき と、その理由（どのサインか） |
| 今の段階 | 段階名、節目の姿、行動とめやす、次の節目まで何日 |
| 阻害リスト | 阻害ごとの出現回数と、乗り越え策が効いた割合 |
| 挽回 | 挽回のメニュー（§5.3.3） |
| 改訂履歴 | 版・日付・種類・理由 |

### 5.5 AI の活用

既存の Vertex の仕組み（週・月のレポートと改善提案、晩の Aiコーチ）に、計画の文脈を入力として加える。

| 対象 | 追加する入力 | 期待する出力 |
|------|--------------|--------------|
| 晩の Aiコーチ | 今日選んだ行動とやれた度、阻害と乗り越え策 | 行動と気づきを結びつけたコメント |
| 週のレポート・改善提案 | 目標の一文、今の段階、実行の割合、しるし、4 分類 | 4 分類に沿った来週の調整案 |
| 挽回（新規） | ペースの理由、阻害の集計、段階 | 挽回メニューのどれから試すかの提案 |

---

## 6. 段階的な導入

| 段階 | 内容 | 完了の目安 |
|------|------|------------|
| **0（今）** | Step5 後半〜Step7 を §3 の計画データに沿って作り、Step7 完了時にサーバーへ保存 | 計画が `users/{uid}/plans` に保存され、ID・版・日付のルールを満たす |
| **1** | 朝に行動を選び、晩に行動ごとに記録する。週で実行の割合を自動集計する。計画タブは見るだけ | `planLog`・`planReview.executionRate` が記録される |
| **2** | しるしの記録、節目の振り返り、ペース表示、挽回、計画の改訂 | 改訂履歴が残り、道のりボードに実績が出る |
| **3** | 阻害リストとの連動、AI の診断と挽回の提案、コーチ共有 | 阻害の集計と AI 提案が週・計画タブに出る |

---

## 7. 28 日トライアルとの関係

- 計画の最初の段階「なじむ」（4 週）を、気づきノートの 28 日トライアルと重ねる。
- トライアル最後の振り返り（4 週目の週・月の振り返り）が、そのまま「なじむ」の節目の振り返り（めやす・期間の見直し）になる。
- トライアル後に有料コースへ進むかどうかの判断材料として、「なじむ」段階の実績（やれた・手応え）を示せる。計画機能をどのコースで使えるようにするかは D25。
- スタートプログラム経由でスタンダードを申し込んだ人には 28 日お試しがない（[14](./14_START_PROGRAM_SYNC_AND_ACCESS_SPEC.md) §1）。この場合、「なじむ」4 週はスタンダードの最初の 4 週と重ね、節目の振り返りも同じ扱いにする。

---

## 8. Step5 後半〜Step7 の実装時に守る設計条件（チェックリスト）

- [ ] 計画の要素（項目・しるし・段階・行動・阻害・乗り越え策）に、作成時に変わらない ID を付けている
- [ ] 要素の削除は `archivedAt` で行い、データを消していない
- [ ] 日付はすべて `YYYY-MM-DD`（JST）。週単位では持っていない
- [ ] しるしの種類・頻度・実行度などは、§3.3 の決まった値で持っている
- [ ] 前半の `Step05Item.id` を `PlanItem.id` に引き継いでいる
- [ ] Step4 の課題 ID（場面・こころの声の出どころ）を阻害に残している
- [ ] 自由記述は暗号化の対象として扱える形（`…TextEncrypted`）にしている
- [ ] 確定時に `version = 1` と最初の改訂履歴（`initial`）を作っている
- [ ] 実行中の計画を `activePlanId` で指している

---

## 9. 検討事項

| # | 論点 | 選択肢の例 | 推奨案 | 決定 |
|---|------|------------|--------|------|
| D18 | 計画タブの置き場所 | 気づきノートの新しいタブ ／ 週・月タブの中 | 新しいタブ（PDCA の Act の場として独立させる） | |
| D19 | スタートプログラムのサーバー保存の範囲 | 計画の確定時だけ ／ Step1〜7 全体を移す | 計画の確定時だけ（全体の移行は別途） | **決定（2026-10-14）**: Step0〜7 全体を移す（パソコンとスマホの両方で続けるため。[14](./14_START_PROGRAM_SYNC_AND_ACCESS_SPEC.md) §1・§2） |
| D20 | 朝の行動選択 | 計画の行動から選ぶ ／ 自由記述のみ（現行） | 選ぶ＋自由記述も可 | |
| D21 | 遅れの判定のしきい値 | §5.3.2 の初期値 ／ 設定画面で変更可 | 初期値で開始し、運用を見て調整 | |
| D22 | 目標の見直しにコーチの確認 | 必要 ／ 不要（通知のみ） | 不要（コーチ共有時は通知） | |
| D23 | 同時に実行する計画の数 | 1 つ ／ 複数 | 当面 1 つ | |
| D24 | 計画のコーチ共有 | 週の共有設定に従う ／ 計画ごとに設定 | 計画ごとに設定（既定は週の設定に合わせる） | |
| D25 | 計画機能の提供範囲 | 28 日トライアルから ／ 有料コースのみ | トライアルでは段階 1 まで、有料で段階 2 以降 | **決定（2026-10-14）**: スタンダード以上。スタートプログラムの Step5〜7 は開始から 28 日間無料、その後はスタンダード申込が必要（[14](./14_START_PROGRAM_SYNC_AND_ACCESS_SPEC.md) §3） |

---

## 10. 次のアクション

1. D18〜D25 の決定（[12](./12_STEP05_TIMELINE_SPEC.md) の D11〜D17 とあわせて）
2. Step6（行動・めやす・阻害と乗り越え策）の仕様に、§3.3 の `PlanAction` / `PlanObstacle` を反映
3. Step7（行動宣言）と `affirmationId` のひも付け方法を [04_AFFIRMATION_DESIGN.md](./04_AFFIRMATION_DESIGN.md) と調整
4. [03_FIRESTORE_DATABASE_STRUCTURE.md](./03_FIRESTORE_DATABASE_STRUCTURE.md) に `plans` と追加項目を反映（段階 0 の実装前）

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-10-14 | 初版（草案）。機能の分担（PDCA）、計画データの正本（ID・版・日付のルール、型）、気づきノートの追加項目、PDCA・阻害・スケジュール管理の機能、段階的な導入、28 日トライアルとの関係、設計条件チェックリスト、検討事項 D18〜D25 |
| 2026-10-14 | D19（Step0〜7 全体をサーバー保存）と D25（スタンダード以上）を決定。§3.1・§7 にスタートプログラム経由の扱いを追記。[14](./14_START_PROGRAM_SYNC_AND_ACCESS_SPEC.md) |

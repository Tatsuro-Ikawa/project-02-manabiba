# A-11 コーチ共有 — データ構造（現状案）

## 📋 目的

[04_TRIAL_28_IMPLEMENTATION_DECISIONS.md](./04_TRIAL_28_IMPLEMENTATION_DECISIONS.md) の **A-11**（コーチ閲覧・共有・コメント）向けに、合意済みの業務ルールを **Firestore に落とす現状案**です。実装・[firestore.rules](../../firestore.rules) の追記前に本書と突合してください。パスは [03_FIRESTORE_DATABASE_STRUCTURE.md](./03_FIRESTORE_DATABASE_STRUCTURE.md) と同期済み。

- **担当**: コーチ 1 : クライアント 多  
- **割当**: `users` 埋め込みではなく **ルートの別コレクション** `coach_client_assignments`  
- **アクティブテーマ**: クライアントに **アクティブなアファメーション ID を1つ**（実施中は 1 テーマ）。過去テーマの文書にもコメント履歴を紐づけ可能  
- **送信**: **1クライアント N回/月**（テーマ非依存）。月中の残り M はテーマ変更しても引き継ぎ、**残り M 回まで**「コーチへ送信」可能。フィンガープリントは同一ラウンドの短時間連打防止程度に抑制  
- **コーチコメント**: **履歴を残す**（同一ラウンド内の編集もバージョンとして追記）

**要決定**（実装時）: 管理者 UI の詳細・`isAdminUser()` の判定方法は既存 [firestore.rules](../../firestore.rules) に合わせる。割当の **ドキュメント ID は §1・§8.5 で確定**（ルールでの `exists` / `get` 用）。

---

## 0. 確定フィールド名・パス（実装クイックリファレンス）

| 種別 | パス / フィールド名 |
|------|----------------------|
| 割当（ルート） | `coach_client_assignments/{assignmentId}` … **`assignmentId` = `{coachUid}_{clientUid}`**（§8.6）。フィールド: `coachUid`, `clientUid`, `status`, `assignedAt`, `endedAt?`, `createdAt`, `updatedAt` |
| ユーザ（クライアント） | `users/{clientUid}.activeCoachingAffirmationId` / `coachShareQuotaPerMonth` / `coachShareMonthKey` / `coachShareUsedThisMonth` |
| アファメーション親 | `users/.../affirmations/{affirmationId}` → `sharedWithCoach`, `lastSharedWithCoachAt`, `lastSharedBodyFingerprint`, `coachUnreadAfterClientShare`（任意）, `clientUnreadLatestCoachReply`（任意） |
| 共有ラウンド | `users/.../affirmations/{affirmationId}/coach_share_rounds/{roundId}` |
| コーチコメント版 | `.../coach_share_rounds/{roundId}/coach_comment_versions/{versionId}` → `encryptedBody`, `authorCoachUid`, `savedAt`, `versionIndex`（任意） |

---

## 1. ルートコレクション `coach_client_assignments`

**コーチとクライアントの対応表**。1 ドキュメント = 1 ペアの関係（再割当・履歴が必要なら `status` と期間で表現）。

| フィールド | 型（想定） | 説明 |
|------------|------------|------|
| `coachUid` | string | コーチの Firebase UID |
| `clientUid` | string | クライアントの Firebase UID |
| `status` | string | 例: `active` \| `ended`（利用終了・解約後も `ended` で残すかはポリシー次第） |
| `assignedAt` | Timestamp | 割当開始 |
| `endedAt` | Timestamp \| null | 割当終了（任意） |
| `createdAt` / `updatedAt` | Timestamp | 監査用 |

**ドキュメント ID（確定・§8.6）**: **`{coachUid}_{clientUid}`**（例: 2 つの UID を `_` で連結。UID に `_` が含まれない前提。含まれる場合は別の区切り文字に変更）。同一ペアは **常に 1 ドキュメント**とし、`ended` 後に再開するときは **同一 ID の `status` を `active` に戻す**（ダブり防止）。管理者のみが作成・更新。

**クエリ例**

- コーチの担当一覧: `where('coachUid', '==', coachUid).where('status', '==', 'active')`  
- 必要なら複合インデックスを追加。

---

## 2. `users/{clientUid}` に追加するフィールド

| フィールド | 型（想定） | 説明 |
|------------|------------|------|
| `activeCoachingAffirmationId` | string \| null | **現在コーチング実施中のテーマ**に対応する `affirmations/{affirmationId}`。1 つのみ。テーマ終了時に次の ID へ更新、または `null` |
| `coachShareQuotaPerMonth` | number \| null | **月あたり「コーチへ送信」上限 N**（サブスク由来。未設定はプランからフォールバック） |
| `coachShareMonthKey` | string \| null | 集計中の暦月キー（例: `2026-03`。東京基準） |
| `coachShareUsedThisMonth` | number \| null | 上記月キーにおける消費回数（used） |

既存の `trialAffirmationMeta`（UI 用）とは役割が異なる。**アクティブテーマの正**はビジネス上こちらとする想定。

---

## 3. `users/{clientUid}/affirmations/{affirmationId}`（親メタ）に追加するフィールド

既存の `title`, `status`, `profileId`, `createdAt`, `updatedAt`, `encryptedLastPreviewText` 等に加える。

### 3.1 共有・送信制御（クライアント側）

| フィールド | 型（想定） | 説明 |
|------------|------------|------|
| `sharedWithCoach` | bool | コーチへの共有意図（ルール・UI のゲート用。詳細は既存 A-11 メモと同期） |
| `lastSharedWithCoachAt` | Timestamp \| null | クライアントが **「コーチへ送信」** を完了した最終日時 |
| `lastSharedBodyFingerprint` | string \| null | 上記送信時点の本文フィンガープリント（下記 §5） |
| `coachUnreadAfterClientShare` | bool（任意） | コーチ側「更新マーク」用。送信直後 `true`、コーチが確認または返信後に `false` 等（UX 次第で省略可） |
| `clientUnreadLatestCoachReply` | bool（任意） | クライアント側「未読」用。コーチが **新しい** `coach_comment_versions` を追加したら `true`、クライアントが当該アファメーションのコメント欄を開いたら `false` 等（**`lastSeenCoachCommentAt`（Timestamp）1 本**で代替してもよい） |

**送信ボタン活性**は、クライアント側で次の合成で算出してよい（テーマ非依存）。
- **月次枠**: `users/{clientUid}` の `coachShareMonthKey` / `coachShareQuotaPerMonth` / `coachShareUsedThisMonth` から「残り M」を判定
- **短時間連打防止**: 親 `affirmations/{affirmationId}` の `lastSharedBodyFingerprint` / `lastSharedWithCoachAt` による同一ラウンドの短時間抑制（例: 120秒）

#### 3.1.1 送信イベント・未読・版の「置き場」（ツリー対応表）

検討メモの `lastSharedAt` / `sharedVersion` / 未読は、次のように **既存ツリー**へ載せる想定です（`sharedVersion` という名前のフィールドは置かず、**版はラウンドの列＋各ラウンドのフィンガープリント**で表現）。

| 概念 | 置き場所 |
|------|----------|
| 最終送信日時（送信ボタン確定時） | **親** `affirmations/{affirmationId}` の `lastSharedWithCoachAt` |
| 最終送信時点の本文指紋（再送信可否の判定） | **親** `lastSharedBodyFingerprint` |
| 整数の `sharedVersion` | **必須ではない**。履歴の並びは `coach_share_rounds` を `clientSentAt` でソートすればよい。必要なら親に `shareRoundCount` 等を後から追加可能 |
| 1 回の「送信」そのもの（レコード） | **子** `coach_share_rounds/{roundId}`（`clientSentAt`, `bodyFingerprintAtSend` ほか） |
| コーチ側「クライアントから新着」マーク | **親** `coachUnreadAfterClientShare`（任意） |
| クライアント側「コーチから新着」マーク | **親** `clientUnreadLatestCoachReply` または `lastSeenCoachCommentAt`（任意） |
| コーチコメント本文と編集履歴 | **子の子** `coach_share_rounds/.../coach_comment_versions/{versionId}`（**親の単一フィールドに配列で溜めない**） |

`coach_client_assignments` には **送信・未読は載せない**（担当関係のみ）。`users/{clientUid}` の `activeCoachingAffirmationId` も未読とは無関係（どのテーマが「実施中」かの正のみ）。

### 3.2 既存フィールドとの関係

- 本文の正は引き続き **`published/current`**（`encryptedBody`）。  
- [04_TRIAL_28_IMPLEMENTATION_DECISIONS.md §9.7.4](./04_TRIAL_28_IMPLEMENTATION_DECISIONS.md): 現設計はコーチが **最新 `published/current`** を読む想定。共有スナップショット別 doc は本草案では必須としない（法務要件が出た場合に別議論）。

---

## 4. サブコレクション `coach_share_rounds`

パス: `users/{clientUid}/affirmations/{affirmationId}/coach_share_rounds/{roundId}`

クライアントが **「コーチへ送信」するたび**に 1 ドキュメント追加（**ラウンド** = 1 回のクライアント送信単位）。コーチコメントの履歴はこの下にぶら下げる。

| フィールド | 型（想定） | 説明 |
|------------|------------|------|
| `clientSentAt` | Timestamp | 送信完了時刻 |
| `bodyFingerprintAtSend` | string | 送信時点の本文フィンガープリント（当時の `published/current` と一致） |
| `calendarMonthKey` | string（任意） | 例: `2025-10`（集計・デバッグ用。クライアント送信の暦月） |
| `status` | string | 例: `awaiting_coach` \| `coach_replied`（任意） |
| `assignedCoachUid` | string（任意） | 送信時点の担当コーチ（割当が変わった場合の表示用） |

**roundId**: 自動 ID推奨（時系列ソートは `clientSentAt`）。

---

## 5. サブコレクション `coach_comment_versions`

パス: `users/{clientUid}/affirmations/{affirmationId}/coach_share_rounds/{roundId}/coach_comment_versions/{versionId}`

**同一ラウンド内**でコーチがコメントを編集するたびに **新しい version ドキュメントを追加**（上書きしない）。クライアント表示は **最新 version** を正とし、履歴 UI があれば過去 version を列挙。

| フィールド | 型（想定） | 説明 |
|------------|------------|------|
| `encryptedBody` | string | コーチコメント本文（暗号化方針は [04_TRIAL_28_IMPLEMENTATION_DECISIONS.md](./04_TRIAL_28_IMPLEMENTATION_DECISIONS.md) の「コーチ入力も暗号化」と整合） |
| `authorCoachUid` | string | 執筆したコーチ |
| `savedAt` | Timestamp | 保存日時 |
| `versionIndex` | number（任意） | 1, 2, 3…（並び替え用） |

**クライアント再送信後**の「過去ラウンドのコメント追加編集」が許容される場合、そのラウンドに対して **追加の `coach_comment_versions`** を書くか、別フラグで「締め後編集」を区別するかは **要決定**（監査要件による）。

---

## 6. フィンガープリント（本文変更検知）

- **入力**: 復号後の本文を **正規化**（末尾改行・連続空白の扱いをルール化）した上で、**SHA-256 等のハッシュ**を hex 文字列として保存。  
- **平文を Firestore に載せない**前提なら、**クライアントで復号後に計算**するか、**暗号化済み `encryptedBody` バイト列のハッシュ**で代用（編集のたびに変われば足りるが、同文再暗号化で変わる場合は注意）。  
- **推奨**: 復号後正規化テキストのハッシュ（実装場所はクライアントまたは信頼できるサーバ）。

---

## 7. ツリー要約（追加部分のみ）

```
（ルート）
├── coach_client_assignments/
│   └── {assignmentId}
│
└── users/
    └── {clientUid}
        ├── activeCoachingAffirmationId   # 追加（案）
        └── affirmations/
            └── {affirmationId}            # 親に lastShared* 等を追加（案）
                ├── published/
                │   └── current
                ├── history/
                └── coach_share_rounds/
                    └── {roundId}
                        └── coach_comment_versions/
                            └── {versionId}
```

---

## 8. セキュリティルール・権限（実装時メモ）

### 8.1 コーチとクライアントの対応をルールでどう検証するか

Firestore ルールは **`coach_client_assignments` ドキュメントの存在と内容**を根拠にする想定です（例: `request.auth.uid` が `coachUid` である割当が存在し、`clientUid` がアクセス先のユーザ ID と一致し、`status == 'active'`）。

- **作成・更新**は **管理者**（`role == admin` 等）のみ、または **Cloud Function / Admin SDK** のみに限定する案が現実的（コーチ本人が任意のクライアントを自分に紐づけできないようにする）。
- **漏れ・ダブり防止**: 管理者が手で紐づける運用でも、**同時に `active` な同一ペア（coachUid + clientUid）が二重に存在しない**ことは、アプリまたは Functions で **作成前チェック**するか、ドキュメント ID を `{coachUid}_{clientUid}` にして **物理的に 1 枚**にするかで担保する。**管理 UI**（一覧・検索・紐づけ・解除・監査ログ）があると運用が安定する。

### 8.2 コーチの read / write の範囲（質問への答え）

当初の「範囲」の意図は **「ルール上、コーチが触っていいパスはどこか」** の総称です。次の **二種類の「履歴」** を混同しないと整理しやすいです。

| 対象 | コーチ read | コーチ write | 備考 |
|------|-------------|--------------|------|
| **`published/current`**（アファメーション本文・最新） | ✅（共有 OK かつ担当のとき） | ❌ | 本文の編集はクライアントのみ |
| **`history/{historyId}`**（発行後の**本文編集**の版履歴） | ❌（現状案どおり本人のみ） | ❌ | コーチには見せない |
| **`coach_share_rounds` / `coach_comment_versions`**（**コーチとのやり取り**履歴） | ✅（担当のとき） | **`coach_comment_versions` に対する create（版の追記）のみ**想定 | クライアント送信の「ラウンド」自体の改ざんは不可にできる |

- **「カレントのみか、履歴もか」**  
  - **本文**: コーチに見せるのは **`published/current` の最新**のみ（スナップショット固定は採用しない前提）。  
  - **やり取り**: **過去の `coach_share_rounds` とコメント版**はコーチもクライアントも（UI で）閲覧できる想定。  
  - **`history/`**（アファメーションの Markdown 編集の履歴）は **コーチには read しない**（[04_AFFIRMATION_DESIGN.md](./04_AFFIRMATION_DESIGN.md)・既存ルールと整合）。

- **「過去に自分が書いたコメントの編集」**  
  - データ上は **既存 `versionId` ドキュメントを上書き更新**するのではなく、**同じ `roundId` 下に新しい `coach_comment_versions` を追加**し、UI は「最新版を正」として表示する案（履歴を残す方針と一致）。  
  - **より過去のラウンド**にあとから版を追加するかは **§5** の「要決定」とし、ルールでは「担当コーチは当該クライアントの `coach_comment_versions` に create 可」と書き、**どの roundId を開いているかはアプリで制御**してもよい。

### 8.3 アファメーションと「AI コーチ」— エンドポイント・ルールを持たない方針の意味

**週報・月報**では、将来「AI が即時に下書きや回答を返す」ルート（専用 API や専用コレクション）を **別設計**する余地を残す。

一方 **アファメーション**については、

- Firestore に **「AI がアファメーション用コメントを書き込む」専用パス**を設けない、  
- クライアントから **「AI アファメーション返信を求める」専用 Cloud Function / API** を用意しない、  

とする方針を明示しておくと、

- **リアルコーチだけ**が `coach_comment_versions` を通じて応答する一本化になり、セキュリティルールと画面の分岐が単純になる。  
- 後から **週報用の AI パイプライン**（別コレクション・別ルール）を足しても、「アファメーションは常に人間コーチのみ」と **仕様が衝突しにくい**。

すなわち「AI を一切使わない」のではなく、**アファメーション領域には AI 用の入口を作らない**という意味です。

### 8.4 セキュリティルール方針（確定・2026-03-30）

| 項目 | 決定内容 |
|------|-----------|
| **A** 割当の create / update / delete | **管理者のみ**（クライアント・コーチは不可）。実装は既存の `isAdminUser()` 等と整合。 |
| **B** コーチの `coach_client_assignments` read | **可**。**自分が `coachUid` のドキュメント**（一覧クエリ時は各 `resource` で評価）。 |
| **C** クライアントの割当 read | **可**（自分が `clientUid` の行のみ。「誰が担当か」表示用）。 |
| **D** コーチの `published/current` read | **`status == 'active'` の担当が存在** かつ、`published/current` の `coachCanReadPublished == true`（共有ON/送信完了時に同期）。フォールバックとして親 `affirmations.sharedWithCoach == true` でも可。 |
| **E** `coach_share_rounds` の create | **クライアント本人のみ**（本人の `users/{uid}/affirmations/...` 配下）。 |
| **F** `coach_comment_versions` の create | **担当コーチのみ**（該当 `clientUid`・`affirmationId`・`roundId` について D と同条件）。 |
| **G** ラウンド・版の update / delete | **原則不可**（追記中心）。別途「通信欄」等で拡張する場合は **別仕様**としてルールを増やす。 |
| **H** 割当の存在確認 | **ドキュメント ID を `{coachUid}_{clientUid}` に固定**（§8.5）。ルールで `exists` / `get` 可能。 |

### 8.5 割当ドキュメント ID（H・技術決定）

ランダム ID だと、ルールから「このコーチとこのクライアントの組」の存在を **1 回の `get` で指せない**ため、次を採用する。

- **パス**: `coach_client_assignments/{coachUid}_{clientUid}`
- **ルール側の例**（実装時に `firestore.rules` へ移植。`clientUid` はアクセス先の `users/{clientUid}/...` から渡す）:

```javascript
function coachClientAssignmentPath(coachUid, clientUid) {
  return /databases/$(database)/documents/coach_client_assignments/$(coachUid + '_' + clientUid);
}
function hasActiveCoachAssignmentForClient(clientUid) {
  let p = coachClientAssignmentPath(request.auth.uid, clientUid);
  return exists(p)
    && get(p).data.status == 'active'
    && get(p).data.coachUid == request.auth.uid
    && get(p).data.clientUid == clientUid;
}
```

- **create 時**: 管理者が書き込むデータの `coachUid`・`clientUid` と **パスの ID が一致**することをルールで検証すると、なりすましを防げる。
- **再割当**: 同じペアは **同一ドキュメント**を `status: 'active'` に戻す。履歴が要る場合はフィールド `endedAt` やサブコレクションで別途（将来）。
- **注意**: Firebase Auth の UID に `_` が含まれる場合、連結区切りは `__` やカスタムエンコードに変える（現状は通常 `_` なし）。

### 8.6 参照

詳細なルール文は [FIRESTORE_SECURITY_RULES_SETUP.md](../FIRESTORE_SECURITY_RULES_SETUP.md) に追記する形で確定する。既存ヘルパー名は [firestore.rules](../../firestore.rules) の `isAdminUser()` 等に合わせる。

---

## 9. Firestore クライアント API・型（確定案・実装時）

既存の [src/lib/firestore.ts](../../src/lib/firestore.ts)（`export const foo = async (` 形式）と [src/types/auth.ts](../../src/types/auth.ts) に揃える。**関数名は実装時に微調整可**だが、責務は以下で固定する。

### 9.1 型（インターフェース）

| 名前（案） | 置き場所（案） | 内容 |
|------------|----------------|------|
| `CoachClientAssignmentStatus` | `firestore.ts` または `types/` | `'active' \| 'ended'` |
| `CoachClientAssignment` | `firestore.ts` | `coachUid`, `clientUid`, `status`, `assignedAt`, `endedAt?`, `createdAt`, `updatedAt`（Timestamp 系は Firestore `Timestamp`） |
| `CoachShareRound` | `firestore.ts` | §4 のフィールド＋任意で `id`（roundId） |
| `CoachCommentVersion` | `firestore.ts` | §5 のフィールド＋`id?` |
| `AffirmationCoachShareMeta`（任意） | `firestore.ts` | 親メタの A-11 フィールドだけをまとめた型（`sharedWithCoach`, `lastSharedWithCoachAt`, …） |
| `UserProfile` 拡張 | `auth.ts` | `activeCoachingAffirmationId?: string \| null`（§2） |

一覧用に既存 `AffirmationListItem` に A-11 フィールドを足すか、別型 `AffirmationListItemWithCoachShare` にするかは実装時に選択（UI が未読バッジを要るなら親メタ read が必要）。

### 9.2 割当 `coach_client_assignments`

| 関数（案） | 呼び出し元 | 処理 |
|------------|------------|------|
| `coachClientAssignmentId(coachUid, clientUid)` | 共通 | 文字列 **`${coachUid}_${clientUid}`** を返す（§8.5 と同一規則）。 |
| `getCoachClientAssignment(coachUid, clientUid)` | コーチ・管理 | 上記 ID で `getDoc`。 |
| `listActiveAssignmentsForCoach(coachUid)` | コーチ UI | `where('coachUid','==',uid).where('status','==','active')`（要インデックス）。 |
| `getActiveAssignmentForClient(clientUid)` | クライアント UI | `where('clientUid','==',uid).where('status','==','active')`。**複数ヒットしない運用**（管理者がダブりを作らない）を前提。0/1 件を返すラッパー。 |
| `adminSetCoachClientAssignment(...)` | 管理者 UI のみ | `setDoc`（merge 可）で割当作成・更新。**`assignmentId` とフィールドの coach/client 一致**をクライアント側でも検証。 |
| `adminEndCoachClientAssignment(coachUid, clientUid)` | 管理者 UI | `status: 'ended'`, `endedAt: serverTimestamp()`。 |

### 9.3 クライアント「コーチへ送信」（`coach_share_rounds` ＋親メタ）

| 関数（案） | 処理 |
|------------|------|
| `computeAffirmationBodyFingerprint(normalizedMarkdown: string): string` | §6 のハッシュ。`utils` でも可。 |
| `canShareAffirmationWithCoach(...)`（任意） | 暦月・`lastSharedBodyFingerprint`・現在本文から **送信ボタン活性**を算出（UI 用）。 |
| `shareAffirmationWithCoach({ clientUid, affirmationId, bodyFingerprint, assignedCoachUid? })` | **`writeBatch` 推奨**: (1) `coach_share_rounds` に `addDoc`（`clientSentAt`, `bodyFingerprintAtSend`, `calendarMonthKey` 等） (2) 親 `affirmations` を `update`（`lastSharedWithCoachAt`, `lastSharedBodyFingerprint`, `coachUnreadAfterClientShare: true`, 必要なら `sharedWithCoach: true`）。失敗時はまとめてロールバック。 |

送信前に **ルール上はクライアント本人のみ create**（§8.4 E）。アプリ側で「月内再送信不可」等もチェック。

### 9.4 コーチコメント（`coach_comment_versions`）

| 関数（案） | 処理 |
|------------|------|
| `appendCoachCommentVersion({ clientUid, affirmationId, roundId, plaintext, authorCoachUid })` | 平文を **`encrypt(plaintext, clientUid)`** 等で暗号化（鍵は既存方針に合わせる）し、`coach_comment_versions` に **`addDoc` のみ**（update 既存 version はしない）。その後、親または別フィールドで **`clientUnreadLatestCoachReply: true`**、`coachUnreadAfterClientShare: false` 等を `update`（§3.1）。 |

### 9.5 読取（一覧・履歴 UI）

| 関数（案） | 処理 |
|------------|------|
| `listCoachShareRounds(clientUid, affirmationId)` | `collection` + `orderBy('clientSentAt','asc'\|'desc')`。 |
| `listCoachCommentVersions(clientUid, affirmationId, roundId)` | サブコレクション全取得または `orderBy('savedAt')`。 |
| 既存 `getAffirmationPublishedMarkdown` | コーチが本文表示するとき再利用（ルールが通ればそのまま）。 |

### 9.6 アクティブテーマ

| 関数（案） | 処理 |
|------------|------|
| `updateUserActiveCoachingAffirmation(clientUid, affirmationId \| null)` | `users/{uid}` の `activeCoachingAffirmationId` を更新。 |

### 9.7 実装順の推奨

1. 型定義・`coachClientAssignmentId`・割当の get/list（管理者作成はコンソールでも可）  
2. `firestore.rules` を §8.4 に合わせてデプロイ  
3. `shareAffirmationWithCoach` → コーチ UI から `appendCoachCommentVersion`  
4. 未読フラグ・トライアル UI 接続

---

## 10. 利用停止・退会時（データの所在）

コメント・ラウンドは **クライアントの `users/{clientUid}/affirmations/...` 配下**に置くため、**コーチ専用の独立レプリカではない**。利用停止・退会時は **プライバシーポリシーに従い削除・匿名化・アクセス禁止**とし、コーチ側は read 権限喪失が自然。物理削除タイミングは別ポリシー。

---

## 11. UI/UX（ワイヤー対応・確定案）

### 11.1 クライアント — 「コーチへ送信」無効時の表示文（案）

送信ボタンは **disabled のまま**、直下またはツールチップで **理由を 1 行表示**する。

| 条件（論理の例） | 表示文（案） |
|------------------|--------------|
| 今月のコーチへ送信枠が上限 N に達している（used >= quota） | **今月のコーチへ送信は N 回までです。残り 0 回です。来月から可能です。** |
| 直前に送信した（短時間連打防止） | **直前に送信しました。少し待ってから試してください。** |
| `activeCoachingAffirmationId` が未設定、または現在のアファメーションがアクティブテーマと一致しない | **コーチング中のテーマとして選ばれているアファメーションだけ送信できます。テーマを選び直してください。** |
| 親 `sharedWithCoach` が false（共有オフ） | **コーチへの共有がオフです。共有を有効にしてから送信してください。** |
| 未発行・下書きのみ | **発行済みのアファメーションだけコーチへ送信できます。** |
| 初回送信前で送信可能だが一時的に無効（送信中など） | **送信中です…**（ローディング） |

文言は実装時に長さに合わせて短縮してよい。

### 11.2 コーチ — 右パネル ↔ 下部レイアウト（ブレークポイント案）

| 項目 | 案 |
|------|-----|
| **レイアウト** | ワイヤーどおり、**広い幅**: メイン（アファメーション＋コメント）と **右に担当クライアント一覧**。**狭い幅**: 一覧を **メインエリアの下**に縦積み（タブまたは折りたたみ可）。 |
| **ブレークポイント** | **`max-width: 959px` 未満**で「下配置」、**`960px` 以上**で「右パネル」（Tailwind なら `lg:` 相当を **960px** にカスタムするか、`md` 896px ではなく **`lg` を 960px に上書き**する想定）。固定値が難しければ **900〜960px のいずれかでプロトタイプ確認**後に確定。 |
| **一覧の幅** | 右パネル時 **240〜280px** 目安（名前・マークが切れないこと）。 |

### 11.3 コーチ — 担当一覧の「更新マーク」定義（確定案）

一覧は **1 行＝1 クライアント**を前提に、次の **視覚記号**を使う（色・アイコンはデザインに委ねる）。

| 記号（例） | 意味（ユーザー向けラベル案） | 判定（実装・データ） |
|------------|------------------------------|----------------------|
| **● または !** | **要対応** | 当該クライアントの **`sharedWithCoach == true` かつ `published` があるアファメーション**のうち、**いずれか**で次を満たす: **最新の `coach_share_rounds`（`clientSentAt` 最大）に、子 `coach_comment_versions` が 1 件も無い**（＝送信済み・コーチ未返信）。 |
| **（任意・第2段階）** | **新着** | 親の **`coachUnreadAfterClientShare == true`** かつ上記「要対応」と重複しうる。**フェーズ1 では「要対応」1 種類にまとめてもよい**（`coachUnreadAfterClientShare` はクリアタイミングの制御用に内部利用）。 |
| **なし** | 対応不要 | 上記に該当しない。 |

**クリア（● を消す）タイミング（案）**: 当該「最新ラウンド」に対し、コーチが **1 件以上 `coach_comment_versions` を追加**した時点で、そのラウンドは要対応から外れる。別アファメ・別ラウンドが残っていれば行の ● は残る。

**一覧に件数を出す場合**: 「要対応」のクライアント数をヘッダーバッジ（§11.4）と揃える。

### 11.4 通知・バッジ（フェーズ1 提案）

| 項目 | 案 |
|------|-----|
| **メール / プッシュ** | **後続**（本範囲外）。 |
| **アプリ内** | **ログイン中のみ**。未ログインでは表示しない。 |

#### コーチ（`role` がコーチ権限を持つユーザ）

- **コーチモードを選んでいなくても**、**要対応（§11.3）が 1 件以上あるとき**、グローバルに気づけるようにする。
- **表示位置（案）**: ヘッダーの **アバターボタン右上**（実装: `src/components/proto/ProtoHeader.tsx`）に **小さな丸（6〜10px）**、または **数字バッジ（9+ 表記可）**。モードが「クライアント」でも **同じ**（コーチ業務の見逃し防止）。
- **件数の出し方**: 原則 **「要対応クライアント数」**（行単位）。負荷対策で **集約ドキュメント**（例: `users/{coachUid}.coachPendingSummary`）は後続可。当面は **担当一覧取得後にクライアントごとに判定**（§9 実装後に最適化）。

#### クライアント（一般ユーザ）

- **`clientUnreadLatestCoachReply == true`** が付いた共有アファメがあるとき、**アバターに同様の丸**（「コーチから返信あり」）。トライアル画面内の該当タブにも **ローカルなバッジ**を付けてもよい。
- 開封（コメント欄を表示）で **`clientUnreadLatestCoachReply` を false** にする（§3.1）。

#### アクセシビリティ

- 丸だけに頼らず **`aria-label`**（例: 「コーチからの未読返信があります」）を付与。

---

## 12. 実装フェーズ1（アファメーションのみ・操作検証用）

**目的**: 週報・ヘッダーバッジ・管理者 UI を除き、**行動宣言（アファメーション）のコーチへの本文共有**の導線とルールを検証する。

**2026-04 更新（トライアル UI）**: トライアル画面では **「コーチへ送信」ラウンド・月間クォータ・下部の共有パネル」は撤廃**し、**公開（`published/current`）の閲覧共有**に寄せた。コーチとの**質疑・ローリング・クォータ**は別機能「コミュニケーション」（ホーム等・別途）へ移す方針。データ構造上 `coach_share_rounds` 等は残り得るが、**トライアル行動宣言のメイン導線からは利用しない**。

### 12.1 追加・変更したコード（リポジトリ・現状）

| 種別 | パス |
|------|------|
| ルール | [firestore.rules](../../firestore.rules)（`coach_client_assignments`、親 `affirmations` / `published`、ほか `coach_share_rounds` 等） |
| インデックス | [firestore.indexes.json](../../firestore.indexes.json)、[firebase.json](../../firebase.json) |
| API | [src/lib/coachAffirmationShare.ts](../../src/lib/coachAffirmationShare.ts)（共有 ON/OFF: `setAffirmationSharedWithCoach`、割当一覧など。送信ラウンド系はレガシー用途で残存し得る） |
| ページ | [src/app/trial_4w/page.tsx](../../src/app/trial_4w/page.tsx)（コーチ: URL クエリ `coachClient` で共有モード保持、メニューバーに「共有」ボタン） |
| UI | [src/components/trial/TrialAffirmation.tsx](../../src/components/trial/TrialAffirmation.tsx)（クライアント: テーマタイトルバーで「コーチ共有」チェック／コーチ: 共有 ON かつ発行済みテーマのみ選択・閲覧） |
| モーダル | [src/components/trial/CoachClientPickerModal.tsx](../../src/components/trial/CoachClientPickerModal.tsx)（担当クライアント一覧） |
| 撤廃 | `ClientCoachShareControls.tsx` は削除済み（旧・下部ブロック） |
| レガシー | [CoachAffirmationSharePanel.tsx](../../src/components/trial/CoachAffirmationSharePanel.tsx) はファイルが残る場合あり（トライアルからは未使用） |

### 12.2 検証手順（最短・現行）

1. **`firebase deploy --only firestore:rules,firestore:indexes`**（要ログイン・プロジェクト選択）。ルール未デプロイだとコーチ閲覧で `Missing or insufficient permissions` になり得る。  
2. **管理者**で Firebase コンソールに `coach_client_assignments` ドキュメントを作成:  
   - **ドキュメント ID** = `{coachUid}_{clientUid}`（実 UID）  
   - フィールド: `coachUid`, `clientUid`, `status: "active"`, `assignedAt`（timestamp）  
3. **クライアント**で `/trial_4w` → 行動宣言 → 発行済みテーマを表示 → **テーマタイトルバー**で **コーチ共有** を ON（親 `sharedWithCoach` / `published/current.coachCanReadPublished` がルールと整合）。  
4. **コーチ**で表示モード **コーチ** → `/trial_4w` → 右上 **共有** でクライアントを選択（URL に `coachClient=<uid>`、メニューバーがオレンジ枠・共有ボタンが「共有中: 名前」表示）→ **選択** で **共有 ON の発行済みテーマ**を選び **表示** → 本文が読めることを確認。

### 12.3 未実装（次フェーズ）

- [ProtoHeader](../../src/components/proto/ProtoHeader.tsx) の **要対応バッジ**（§11.4）  
- **管理者向け割当 UI**（当面コンソール運用）  
- コーチパネルの **960px ブレークポイント**（現状は `lg:grid-cols` のみ）  
- クライアントの **`clientUnreadLatestCoachReply` を開封で false** にする明示操作（現状は未実装）
- サブスク（プラン）→ `coachShareQuotaPerMonth` の同期（現状はクライアント側フォールバックで暫定）

### 12.4 マネジメント日誌（週次・月次）との拡張

- **正本（コース・能力マトリックス・人コーチ / AI の切り分け）**: [03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md](./03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md)
- **方針**: `journal_weekly` / `journal_monthly` にも、必要に応じて **本書と同型の** `coach_share_rounds` / `coach_comment_versions`（および親ドキュメントの共有メタ）をぶら下げる。
  - **週次（人コーチ）**: 現行仕様は **共有のみ・コメントなし**。週次パスではコーチの **write 用サブコレクションをルールで閉じる**、またはサブコレクション自体を設けない、などで表現する。
  - **月次（人コーチ）**: **質問・回答あり**。ユーザ決定により **A-11 同型として月次ドキュメント配下に配置する**（= 月次 1 スレッド固定ではなく、ラウンド＋コメント版を採用）。

#### 12.4.1 月次（`journal_monthly`）のパス（確定）

```
users/{clientUid}/journal_monthly/{monthKey}
  └── coach_share_rounds/{roundId}
      └── coach_comment_versions/{versionId}
```

- **monthKey**: `YYYY-MM`（東京 `Asia/Tokyo`・暦月）
- **roundId**: 自動 ID 推奨（時系列は `clientSentAt`）
- **versionId**: 自動 ID 推奨（時系列は `savedAt`）

#### 12.4.2 月次親ドキュメントの共有メタ（推奨フィールド）

アファメーション親（§3.1）と同じ用途で、月次親にも置く。

| フィールド | 型（想定） | 説明 |
|------------|------------|------|
| `sharedWithCoach` | bool | 共有意図（UI/ルールのゲート用） |
| `lastSharedWithCoachAt` | Timestamp \| null | 最終送信日時（任意） |
| `lastSharedBodyFingerprint` | string \| null | 送信時点の本文指紋（任意） |
| `coachUnreadAfterClientShare` | bool（任意） | コーチ側の新着（任意） |
| `clientUnreadLatestCoachReply` | bool（任意） | クライアント側の新着（任意） |

#### 12.4.3 月次の「質問」と「回答」（データの置き場）

- **クライアントの質問（送信）**: `coach_share_rounds/{roundId}` が 1 回の送信単位。月次の「月1回」は **このラウンド作成（質問送信）回数**を数える（正本: [03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md](./03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md) §2）。
- **コーチの回答**: 同一ラウンド配下の `coach_comment_versions/{versionId}` に **追記（版）**する。\n+  UI は最新 version を正として表示し、必要なら履歴を出す（アファメーションと同じ）。

#### 12.4.4 月次ラウンド／コメント版の必須フィールド（案）

月次は「本文（親ドキュメント）」とは別に、**質問文**を明示的に持つ（ユーザ回答に基づく）。本文の参照は「親ドキュメント（当月月報）」を読む。

**round（クライアント送信）**: `users/{clientUid}/journal_monthly/{monthKey}/coach_share_rounds/{roundId}`

| フィールド | 型（想定） | 説明 |
|------------|------------|------|
| `clientSentAt` | Timestamp | 送信完了時刻 |
| `calendarMonthKey` | string | `YYYY-MM`（= `monthKey`。デバッグ・集計用） |
| `clientQuestionTextEncrypted` | string \| null | クライアントの質問（暗号化） |
| `bodyFingerprintAtSend` | string \| null | 当月月報本文の指紋（任意） |
| `assignedCoachUid` | string（任意） | 送信時点の担当コーチ（表示用） |

**comment version（コーチ返信）**: `.../coach_comment_versions/{versionId}`

| フィールド | 型（想定） | 説明 |
|------------|------------|------|
| `encryptedBody` | string | コーチ返信本文（暗号化） |
| `authorCoachUid` | string | 執筆したコーチ |
| `savedAt` | Timestamp | 保存日時 |
| `versionIndex` | number（任意） | 1,2,3...（並び替え用） |

---

## 13. 改訂履歴

| 日付 | 内容 |
|------|------|
| 2026-03-28 | 初版（A-11 データ構造草案） |
| 2026-03-28 | 現状案としてフィールド名確定・§0 クイックリファレンス追加。他ドキュメントと同期 |
| 2026-03-29 | §3.1.1 送信イベント・未読のツリー対応表。親に `clientUnreadLatestCoachReply`（任意）を追記 |
| 2026-03-29 | §8 拡充: 管理者紐づけ・二重防止、コーチ read/write 範囲（本文 vs やり取り vs `history`）、アファメーションに AI 用ルートを設けない方針の説明 |
| 2026-03-30 | §8.4 セキュリティ方針 A〜G 確定。§8.5 割当 ID `{coachUid}_{clientUid}` とルール例。§1・§0 を ID 確定に合わせ更新 |
| 2026-03-30 | **§9 新設**: `firestore.ts`・型の関数一覧・バッチ方針・実装順。旧 §9・§10 を §10・§11 に繰下げ |
| 2026-03-30 | **§11 新設**（UI/UX）。改訂履歴を §12 に繰下げ |
| 2026-03-30 | **§12 実装フェーズ1**（コード・手順）。改訂履歴を §13 に繰下げ |
| 2026-03-30 | 月次クォータ方式に更新（1クライアント N回/月・テーマ非依存）。フィンガープリントは短時間連打防止へ縮小 |
| 2026-04-04 | §12.4 追加: マネジメント日誌（週次・月次）拡張と [03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md](./03_JOURNAL_COACH_AI_PLANS_AND_CAPABILITIES.md) への参照 |
| 2026-04-19 | **§12 更新**: トライアル行動宣言の共有 UI（`coachClient` URL・タイトルバー共有・下部パネル撤廃）。Firestore デプロイ手順は [DEPLOY_GITHUB_VERCEL.md](../DEPLOY_GITHUB_VERCEL.md) §2.6 を参照 |

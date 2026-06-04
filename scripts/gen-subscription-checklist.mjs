import fs from 'fs';

const NL = /\r?\n/.source;

const path = 'docs/manabiba_01/04_SUBSCRIPTION_STATE_TRANSITIONS.md';
let md = fs.readFileSync(path, 'utf8');

const steadyRows = [
  ['1', 'ヘッダ', '—', 'ゲストアイコンのみ', 'ログインユーザアイコン', '同左', '同左'],
  ['2', 'サイドバー', 'ホーム', '有効', '有効', '有効', '有効'],
  ['3', 'サイドバー', 'スタート', '無効', '有効', '有効', '有効'],
  ['4', 'サイドバー', 'ノート', '無効', '無効', '有効', '有効'],
  ['5', 'サイドバー', 'コミュニケーション', '有効', '有効', '有効', '有効'],
  ['6', 'サイドバー', 'マイページ', '無効', '無効', '無効', '無効'],
  ['7', 'ホーム', 'バナー①', '試してみる', 'スタートから始める→スタート', '同左', '同左'],
  ['8', 'ホーム', 'バナー②', 'ログインして続ける', '気づきノートを試す→ランディング', '気づきノートを続ける→ノート', '同左'],
  ['9', 'ホーム', 'マネジメント情報', '無効（メッセージ）', '無効（メッセージ）', '有効', '有効'],
  ['10', 'スタート画面', '「気づきノート」ボタン', '—', '気づきノートを試す→ランディング', '気づきノートへ', '同左'],
  ['11', 'ノート画面', '行動宣言', '無効', '無効', '有効', '有効（共有あり）'],
  ['12', 'ノート画面', '朝・晩', '無効', '無効', '有効', '有効'],
  ['13', 'ノート画面', '週', '無効', '無効', '有効', '有効（共有あり）'],
  ['14', 'ノート画面', '月', '無効', '無効', '有効', '有効（共有あり）'],
  ['15', 'コミュニケーション', '館長から', '有効', '有効', '有効', '有効'],
  ['16', 'コミュニケーション', 'メッセージボード', '無効', '無効', '無効', '有効'],
  ['17', 'ログインパネル', 'ユーザIDセレクト', '有効', '—', '—', '—'],
  ['18', 'ランディング', '7日間スタートプログラム', 'やってみる 有効', '選択中', '—', '—'],
  ['19', 'ランディング', '気づきノート AIコーチ', 'やってみる 有効', 'やってみる 有効', '選択中', '—'],
  ['20', 'ランディング', '気づきノート パーソナルコーチ', 'やってみる 有効', 'やってみる 有効', 'やってみる 有効', '選択中'],
  ['21', 'コース変更', 'フリーコース', '—', '—', '選択（90日保存メッセージ）', '選択（同上）'],
  ['22', 'コース変更', 'スタンダードコース', '—', '—', '選択中（お試し付き）', '選択（同上）'],
  ['23', 'コース変更', 'プレミアムコース', '—', '—', '選択→会員同意→プレミアムコースへ', '選択中（お試し付き）'],
  ['24', '会員同意', '利用規約・プライバシー', 'ランディングの次に表示', '同左', '同左', '同左'],
  ['25', '申込フォーム', '入力欄', '—', '—', '同意画面の後', '同意画面の後'],
];

function steadyTable() {
  let t = '## 3. コース別の使用可能機能一覧（定常状態）\n\n';
  t += 'ログイン状態・プランが安定しているときの UI。遷移表（§5）の「変化後」列と整合させる。\n\n';
  t += '### 3.1 定常状態チェック一覧\n\n';
  t += '実装後の画面確認用。**OK** 欄にチェック（`OK` / 日付 / 担当者など）を記入する。\n\n';
  t += '※フリー会員で `enrollment.primaryCourse = start7d` のとき、サイドバー「ノート」は **無効**（§4）。\n\n';
  t += '| # | UI（画面など） | コンポーネント | ゲスト | フリー | スタンダード | プレミアム | OK |\n';
  t += '|---|----------------|----------------|--------|--------|--------------|------------|-----|\n';
  for (const r of steadyRows) {
    t += `| ${r.join(' | ')} |  |\n`;
  }
  t += '\n- コミュニケーション（サイドバー）: ゲスト・フリーは **館長からのみ**（メッセージボードタブは出さない）。\n';
  t += '- マネジメント無効時メッセージ例:「試してみる」から気づきノートを選択すると有効になります。\n';
  t += '- 初回入会: ランディング → 会員同意 →（有料なら）申込フォーム（`/apply?plan=...`）。\n';
  t += '- コース変更: `/courses/change`（ログイン済み STD/PRE）。\n';
  return t;
}

const ROWS = [
  ['1', 'ヘッダ', '—'],
  ['2', 'サイドバー', 'ホーム'],
  ['3', 'サイドバー', 'スタート'],
  ['4', 'サイドバー', 'ノート'],
  ['5', 'サイドバー', 'コミュニケーション'],
  ['6', 'サイドバー', 'マイページ'],
  ['7', 'ホーム', 'バナー①'],
  ['8', 'ホーム', 'バナー②'],
  ['9', 'ホーム', 'マネジメント情報'],
  ['10', 'スタート画面', '「気づきノート」ボタン'],
  ['11', 'ノート画面', '行動宣言'],
  ['12', 'ノート画面', '朝・晩'],
  ['13', 'ノート画面', '週'],
  ['14', 'ノート画面', '月'],
  ['15', 'コミュニケーション', '館長から'],
  ['16', 'コミュニケーション', 'メッセージボード'],
  ['17', 'ランディング', '7日間スタートプログラム'],
  ['18', 'ランディング', '気づきノート AIコーチ'],
  ['19', 'ランディング', '気づきノート パーソナルコーチ'],
  ['20', 'コース変更', 'フリーコース'],
  ['21', 'コース変更', 'スタンダードコース'],
  ['22', 'コース変更', 'プレミアムコース'],
  ['23', '会員同意', '利用規約・プライバシー'],
  ['24', '申込フォーム', '入力欄'],
];

const G = {
  hG: 'ゲストアイコンのみ',
  hL: 'ログインユーザアイコン',
  en: '有効',
  dis: '無効',
  dash: '—',
  b1G: '試してみる',
  b1F: 'スタートから始める→スタート',
  b1SP: '同左',
  b2G: 'ログインして続ける',
  b2F: '気づきノートを試す→ランディング',
  b2K: '気づきノートを続ける→ノート',
  mgD: '無効（メッセージ）',
  mgE: '有効',
  stD: '無効',
  stTry: '有効（試す→ランディング）',
  stGo: '有効（気づきへ）',
  nd: '無効',
  ne: '有効',
  nps: '有効（共有あり）',
  ldTry: 'やってみる 有効',
  ldSel: '選択中',
  ldDash: '—',
  ldApp: '申し込む',
  ccDash: '—',
  ccSel: '選択中',
  ccSelTrial: '選択中（お試し付き）',
  ccPick: '選択',
  ccPick90: '選択（90日データ保存メッセージ）',
  ccPre: '選択→会員同意→気づきノートのプレミアムコースへ',
  cs1: '最後まで読んで同意（初回のみ）',
  cs2: '—',
  af: '—',
  afAfter: '同意画面の後',
  afUp: '同意画面の後（アップグレード時は再同意なし）',
};

const tables = {
  1: {
    title: '表1 — ゲスト → フリー（7日間スタートプログラム）',
    L: 'ゲスト',
    R: 'フリー',
    v: [G.hG, G.en, G.dis, G.dis, G.en, G.dis, G.b1G, G.b2G, G.mgD, G.stD, G.nd, G.nd, G.nd, G.nd, G.en, G.dis, G.ldTry, G.ldTry, G.ldTry, G.ccDash, G.ccDash, G.ccDash, G.cs1, G.af],
    w: [G.hL, G.en, G.en, G.dis, G.en, G.dis, G.b1F, G.b2F, G.mgD, G.stTry, G.nd, G.nd, G.nd, G.nd, G.en, G.dis, G.ldSel, G.ldTry, G.ldTry, G.ccDash, G.ccDash, G.ccDash, G.cs2, G.af],
    n: ['', '', '', '', '', '', '*2 フリー化後に表示', '*2', '', '', '', '', '', '', '', '', '会員同意→スタートプログラムへ', '', '', '', '', '', '備考: スタートプログラムへ', ''],
  },
  2: {
    title: '表2 — ゲスト → スタンダード（気づきノート AIコーチ）',
    L: 'ゲスト',
    R: 'スタンダード',
    v: [G.hG, G.en, G.dis, G.dis, G.en, G.dis, G.b1G, G.b2G, G.mgD, G.stD, G.nd, G.nd, G.nd, G.nd, G.en, G.dis, G.ldTry, G.ldTry, G.ldTry, G.ccDash, G.ccDash, G.ccPick, G.cs1, G.af],
    w: [G.hL, G.en, G.en, G.en, G.en, G.dis, G.b1SP, G.b2K, G.mgE, G.stGo, G.ne, G.ne, G.ne, G.ne, G.en, G.dis, G.ldDash, G.ldSel, G.ldTry, G.ccDash, G.ccSelTrial, G.ccPre, G.cs2, G.afAfter],
    n: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '会員同意→気づきノートへ。初回無料期間あり', '', '', '', '会員同意→プレミアムコースへ', '', '初回のみ'],
  },
  3: {
    title: '表3 — ゲスト → プレミアム（気づきノート パーソナルコーチ）',
    L: 'ゲスト',
    R: 'プレミアム',
    v: [G.hG, G.en, G.dis, G.dis, G.en, G.dis, G.b1G, G.b2G, G.mgD, G.stD, G.nd, G.nd, G.nd, G.nd, G.en, G.dis, G.ldTry, G.ldTry, G.ldTry, G.ccDash, G.ccDash, G.ccPick, G.cs1, G.af],
    w: [G.hL, G.en, G.en, G.en, G.en, G.dis, G.b1SP, G.b2K, G.mgE, G.stGo, G.nps, G.ne, G.nps, G.nps, G.en, G.en, G.ldDash, G.ldTry, G.ldSel, G.ccDash, G.ccPick90, G.ccSelTrial, G.cs2, G.afAfter],
    n: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '会員同意→プレミアムコースへ', '', '', '選択中（再選択不可）', '', '初回のみ'],
  },
  4: {
    title: '表4 — フリー → ゲスト（ログアウト）',
    L: 'フリー',
    R: 'ゲスト',
    v: [G.hL, G.en, G.en, G.dis, G.en, G.dis, G.b1F, G.b2F, G.mgD, G.stTry, G.nd, G.nd, G.nd, G.nd, G.en, G.dis, G.ldSel, G.ldTry, G.ldTry, G.ccDash, G.ccDash, G.ccDash, G.cs2, G.af],
    w: [G.hG, G.en, G.dis, G.dis, G.en, G.dis, G.b1G, G.b2G, G.mgD, G.stD, G.nd, G.nd, G.nd, G.nd, G.en, G.dis, G.ldTry, G.ldTry, G.ldTry, G.ccDash, G.ccDash, G.ccDash, G.cs1, G.af],
    n: ['ログアウトでゲストへ', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '初回のみ読了同意', ''],
  },
  5: {
    title: '表5 — フリー → スタンダード（コースアップグレード）',
    L: 'フリー',
    R: 'スタンダード',
    v: [G.hL, G.en, G.en, G.dis, G.en, G.dis, G.b1F, G.b2F, G.mgD, G.stTry, G.nd, G.nd, G.nd, G.nd, G.en, G.dis, G.ldSel, G.ldTry, G.ldTry, G.ccDash, G.ccDash, G.ccPick, G.cs2, G.af],
    w: [G.hL, G.en, G.en, G.en, G.en, G.dis, G.b1SP, G.b2K, G.mgE, G.stGo, G.ne, G.ne, G.ne, G.ne, G.en, G.dis, G.ldDash, G.ldSel, G.ldTry, G.ccDash, G.ccSelTrial, G.ccPre, G.cs2, G.afUp],
    n: ['', '', '', '', '', '', '', '*1 PREも同文言', '', '', '', '', '', '', '', '', '', '', '', '', '再選択不可', '会員同意→プレミアムコースへ', '', ''],
  },
  6: {
    title: '表6 — フリー → プレミアム（コースアップグレード）',
    L: 'フリー',
    R: 'プレミアム',
    v: [G.hL, G.en, G.en, G.dis, G.en, G.dis, G.b1F, G.b2F, G.mgD, G.stTry, G.nd, G.nd, G.nd, G.nd, G.en, G.dis, G.ldSel, G.ldTry, G.ldApp, G.ccDash, G.ccDash, G.ccPick, G.cs2, G.af],
    w: [G.hL, G.en, G.en, G.en, G.en, G.dis, G.b1SP, G.b2K, G.mgE, G.stGo, G.nps, G.ne, G.nps, G.nps, G.en, G.en, G.ldDash, G.ldTry, G.ldSel, G.ccDash, G.ccPick90, G.ccSelTrial, G.cs2, G.afUp],
    n: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '会員同意→プレミアムコースへ', '', '', '', '', ''],
  },
  7: {
    title: '表7 — スタンダード → フリー（ダウングレード）',
    L: 'スタンダード',
    R: 'フリー',
    v: [G.hL, G.en, G.en, G.en, G.en, G.dis, G.b1SP, G.b2K, G.mgE, G.stGo, G.ne, G.ne, G.ne, G.ne, G.en, G.dis, G.ldDash, G.ldSel, G.ldTry, G.ccPick90, G.ccSelTrial, G.ccPre, G.cs2, G.afAfter],
    w: [G.hL, G.en, G.en, G.dis, G.en, G.dis, G.b1F, G.b2F, G.mgD, G.stTry, G.nd, G.nd, G.nd, G.nd, G.en, G.dis, G.ldSel, G.ldTry, G.ldTry, G.ccDash, G.ccDash, G.ccDash, G.cs2, G.af],
    n: ['', '', '', '', '', '', '', '', '', 'ノート画面へは行かない', '', '', '', '', '', '', '', '', '', '', '会員同意へ', '', '', ''],
  },
  8: {
    title: '表8 — スタンダード → プレミアム（アップグレード）',
    L: 'スタンダード',
    R: 'プレミアム',
    v: [G.hL, G.en, G.en, G.en, G.en, G.dis, G.b1SP, G.b2K, G.mgE, G.stGo, G.ne, G.ne, G.ne, G.ne, G.en, G.dis, G.ldDash, G.ldSel, G.ldTry, G.ccPick90, G.ccSelTrial, G.ccPre, G.cs2, G.afAfter],
    w: [G.hL, G.en, G.en, G.en, G.en, G.dis, G.b1SP, G.b2K, G.mgE, G.stGo, G.nps, G.ne, G.nps, G.nps, G.en, G.en, G.ldDash, G.ldTry, G.ldSel, G.ccPick90, G.ccPick, G.ccSelTrial, G.cs2, G.afAfter],
    n: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '主な差分: MB有効', '', '', '', '', '90日データ保存メッセージ', '会員同意→プレミアムコースへ', '', '初回申込時'],
  },
  9: {
    title: '表9 — スタンダード → ゲスト（ログアウト）',
    L: 'スタンダード',
    R: 'ゲスト',
    v: [G.hL, G.en, G.en, G.en, G.en, G.dis, G.b1SP, G.b2K, G.mgE, G.stGo, G.ne, G.ne, G.ne, G.ne, G.en, G.dis, G.ldDash, G.ldSel, G.ldTry, G.ccPick90, G.ccSelTrial, G.ccPre, G.cs2, G.afAfter],
    w: [G.hG, G.en, G.dis, G.dis, G.en, G.dis, G.b1G, G.b2G, G.mgD, G.stD, G.nd, G.nd, G.nd, G.nd, G.en, G.dis, G.ldTry, G.ldTry, G.ldTry, G.ccDash, G.ccDash, G.ccDash, G.cs1, G.af],
    n: ['表4同型＋STD固有UIが無効化', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'PRE備考: 会員同意へ', '', '', '', ''],
  },
  10: {
    title: '表10 — プレミアム → ゲスト（ログアウト）',
    L: 'プレミアム',
    R: 'ゲスト',
    v: [G.hL, G.en, G.en, G.en, G.en, G.dis, G.b1SP, G.b2K, G.mgE, G.stGo, G.nps, G.ne, G.nps, G.nps, G.en, G.en, G.ldDash, G.ldTry, G.ldSel, G.ccPick90, G.ccPick, G.ccSelTrial, G.cs2, G.afAfter],
    w: [G.hG, G.en, G.dis, G.dis, G.en, G.dis, G.b1G, G.b2G, G.mgD, G.stD, G.nd, G.nd, G.nd, G.nd, G.en, G.dis, G.ldTry, G.ldTry, G.ldTry, G.ccDash, G.ccDash, G.ccDash, G.cs1, G.af],
    n: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  },
  11: {
    title: '表11 — プレミアム → フリー（ダウングレード）',
    L: 'プレミアム',
    R: 'フリー',
    v: [G.hL, G.en, G.en, G.en, G.en, G.dis, G.b1SP, G.b2K, G.mgE, G.stGo, G.nps, G.ne, G.nps, G.nps, G.en, G.en, G.ldDash, G.ldTry, G.ldSel, G.ccPick90, G.ccPick, G.ccSelTrial, G.cs2, G.afAfter],
    w: [G.hL, G.en, G.en, G.dis, G.en, G.dis, G.b1F, G.b2F, G.mgD, G.stTry, G.nd, G.nd, G.nd, G.nd, G.en, G.dis, G.ldSel, G.ldTry, G.ldTry, G.ccDash, G.ccDash, G.ccDash, G.cs2, G.af],
    n: ['', '', '', '', '', '', '', '', '', '共有チェック無効化', '', '', '', '', '新規投稿不可／履歴閲覧可／データ90日保存', '', '', '', '', '', '', '', ''],
  },
  12: {
    title: '表12 — プレミアム → スタンダード（ダウングレード）',
    L: 'プレミアム',
    R: 'スタンダード',
    v: [G.hL, G.en, G.en, G.en, G.en, G.dis, G.b1SP, G.b2K, G.mgE, G.stGo, G.nps, G.ne, G.nps, G.nps, G.en, G.en, G.ldDash, G.ldTry, G.ldSel, G.ccPick90, G.ccSelTrial, G.ccSelTrial, G.cs2, G.afAfter],
    w: [G.hL, G.en, G.en, G.en, G.en, G.dis, G.b1SP, G.b2K, G.mgE, G.stGo, G.ne, G.ne, G.ne, G.ne, G.en, G.dis, G.ldDash, G.ldSel, G.ldTry, G.ccPick90, G.ccSelTrial, G.ccPick, G.cs2, G.afAfter],
    n: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '新規投稿不可／履歴閲覧可／データ90日保存', '', '', '', '', '', '', '', ''],
  },
};

function transSection() {
  let s = '## 5. 状態遷移チェック一覧（表1〜12）\n\n';
  s += '各表は Excel「サブスクコース選択の変化」と **1行ずつ突合** できるよう全24行を展開している。\n';
  s += '**OK** 欄に実装確認結果を記入する（例: `OK` / `NG: 理由` / 確認日）。\n\n';
  s += '**列見出し**: 左＝変化前、右＝変化後。\n\n';
  for (const id of Object.keys(tables).sort((a, b) => Number(a) - Number(b))) {
    const t = tables[id];
    s += `### ${t.title}\n\n`;
    s += `| # | UI（画面など） | コンポーネント | ${t.L}（変化前） | ${t.R}（変化後） | 備考 | OK |\n`;
    s += '|---|----------------|----------------|-------------|-------------|------|-----|\n';
    for (let i = 0; i < ROWS.length; i++) {
      const r = ROWS[i];
      s += `| ${r[0]} | ${r[1]} | ${r[2]} | ${t.v[i]} | ${t.w[i]} | ${t.n[i] || ''} |  |\n`;
    }
    s += '\n';
  }
  return s;
}

const sec14 = `### 1.4 実装後チェック（OK欄）

| 項目 | 内容 |
|------|------|
| **用途** | §3（定常状態）・§5（遷移表）の **OK** 列は、実装後の画面確認・手動テスト記録用 |
| **記入例** | \`OK\`、\`NG: 理由\`、\`2026-05-25 確認\`、担当者イニシャル |
| **正本** | Excel 表と本 Markdown を **行番号（#列）** で突合 |
| **関連** | [04_TEST_ONBOARDING_CHECKLIST.md](./04_TEST_ONBOARDING_CHECKLIST.md)（導線テスト）、本書 §3・§5（UI可否） |

`;

const sec13Match = md.match(new RegExp(`### 1\\.3 会員種別と Firestore[\\s\\S]*?(?=---${NL}${NL}## 2\\.)`));
if (sec13Match && !md.includes('### 1.4 実装後チェック')) {
  md = md.replace(sec13Match[0], sec13Match[0] + '\n' + sec14);
}

md = md.replace(
  new RegExp(`## 3\\. コース別の使用可能機能一覧[\\s\\S]*?(?=---${NL}${NL}## 4\\.)`),
  steadyTable() + '\n---\n\n',
);

md = md.replace(
  new RegExp(`## 5\\. 状態遷移[\\s\\S]*?(?=---${NL}${NL}## 6\\.)`),
  transSection() + '---\n\n',
);

md = md.replace(
  /## 7\. 実装フェーズ[\s\S]*?\| 5 \| Stripe Phase C 連携 \|/,
  `## 7. 実装フェーズ（案）

| 順 | 内容 | 状態 |
|----|------|------|
| 1 | 本ドキュメント確定 → 関連 doc の § 参照更新 | 進行中 |
| 2 | サイドバー（マイページ非表示）、バナー、entitlement 連動 | **マイページ非表示 実装済** |
| 3 | **コース変更画面** \`/courses/change\` UI 確定・実装（Stripe 前） | **仮画面 実装済** |
| 4 | 申込フォーム \`/apply?plan=...\`（STD／PRE 初回） | **仮画面 実装済** |
| 5 | Stripe Phase C 連携 | 未着手 |`,
);

if (!md.includes('§3・§5 を全行展開')) {
  md = md.replace(
    /\| 2026-05-25 \| 初版草案: 定常状態一覧[\s\S]*?\|\n/,
    '| 2026-05-25 | 初版草案: 定常状態一覧、plan×primaryCourse、遷移表1〜12、全体方針、実装マッピング |\n| 2026-05-25 | §3・§5 を全行展開＋OK欄追加。コース変更・申込仮画面実装 |\n',
  );
}

fs.writeFileSync(path, md);
console.log('Updated', path);

# タイポグラフィー使用ガイド

## 📝 基本方針

プロジェクトでは、文字スタイルの指定方法を**2種類**に統一しています：

1. **インラインスタイル** - 特殊な場合のみ
2. **Tailwindクラス** - 主に使用（推奨）

---

## 🎯 プロジェクト標準サイズ

### H1〜H3は1.25rem (20px) に統一

| 要素 | Tailwindクラス | サイズ | 備考 |
|------|---------------|--------|------|
| **H1〜H3** | `text-xl` | **1.25rem (20px)** | **統一** |
| H4 | `text-xl` | 1.25rem (20px) | |
| H5 | `text-lg` | 1.125rem (18px) | |
| H6 | `text-base` | 1rem (16px) | |
| 本文 | `text-base` | 1rem (16px) | |
| 小さめ | `text-sm` | 0.875rem (14px) | |
| 注釈 | `text-xs` | 0.75rem (12px) | |

---

## 📁 ファイル構成

### **`src/app/globals.css`**
- **役割**: 最小限のベーススタイル
- **内容**: 要素の共通設定のみ（サイズ指定なし）

```css
/* 共通設定のみ */
h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  line-height: 1.25;
  color: inherit;
}
```

### **`src/styles/typography.ts`**
- **役割**: 定数定義とドキュメント
- **内容**: サイズ基準とよく使うパターン

```typescript
export const TYPOGRAPHY_STANDARDS = {
  heading1to3: 'text-xl',  // H1〜H3標準
  body: 'text-base',       // 本文標準
  ...
};

export const TYPOGRAPHY_PATTERNS = {
  pageTitle: 'text-xl font-bold text-gray-900 mb-6',
  sectionTitle: 'text-xl font-semibold text-gray-800 mb-4',
  ...
};
```

---

## 💻 使用方法

### 方法1: パターンを使用（推奨）

```tsx
import { TYPOGRAPHY_PATTERNS } from '@/styles/typography';

<h1 className={TYPOGRAPHY_PATTERNS.pageTitle}>
  ページタイトル
</h1>

<h2 className={TYPOGRAPHY_PATTERNS.sectionTitle}>
  セクションタイトル
</h2>

<p className={TYPOGRAPHY_PATTERNS.body}>
  本文テキスト
</p>
```

**メリット:**
- ✅ プロジェクト全体で統一されたスタイル
- ✅ 一箇所で変更すれば全体に反映
- ✅ チーム開発での一貫性

### 方法2: 直接指定（シンプル）

```tsx
<h1 className="text-xl font-bold text-gray-900">
  タイトル
</h1>

<p className="text-base text-gray-700">
  本文
</p>
```

**メリット:**
- ✅ コードが簡潔
- ✅ カスタマイズしやすい
- ✅ 一目で分かりやすい

### 方法3: 標準サイズ定数を使用

```tsx
import { TYPOGRAPHY_STANDARDS } from '@/styles/typography';

<h1 className={`${TYPOGRAPHY_STANDARDS.heading1to3} font-bold text-gray-900`}>
  タイトル
</h1>
```

**メリット:**
- ✅ サイズのみ統一したい場合に便利
- ✅ 柔軟性が高い

---

## 🎨 よく使うパターン集

### 見出し

```tsx
// ページタイトル（H1）
<h1 className="text-xl font-bold text-gray-900 mb-6">
  ページタイトル
</h1>

// セクションタイトル（H2）
<h2 className="text-xl font-semibold text-gray-800 mb-4">
  セクションタイトル
</h2>

// サブセクションタイトル（H3）
<h3 className="text-xl font-semibold text-gray-800 mb-3">
  サブセクション
</h3>

// カードタイトル（H4）
<h4 className="text-base font-semibold text-gray-800 mb-2">
  カードタイトル
</h4>
```

### 本文

```tsx
// 通常の本文
<p className="text-base text-gray-700 leading-relaxed">
  本文テキスト
</p>

// 大きめの本文
<p className="text-lg text-gray-700 leading-relaxed">
  強調したい本文
</p>

// 小さめの本文
<p className="text-sm text-gray-600">
  補足情報
</p>
```

### UI要素

```tsx
// ラベル
<label className="text-sm font-medium text-gray-700 mb-1">
  入力項目
</label>

// ボタン
<button className="text-sm font-medium px-4 py-2">
  ボタン
</button>

// キャプション
<span className="text-xs text-gray-500">
  補足説明
</span>
```

---

## 📱 レスポンシブ対応

### 画面サイズに応じてサイズを変更

```tsx
// モバイル: base、タブレット以上: lg
<h1 className="text-base md:text-lg lg:text-xl font-bold">
  レスポンシブタイトル
</h1>

// 3段階でサイズアップ
<h1 className="text-sm md:text-base lg:text-lg xl:text-xl font-bold">
  段階的なタイトル
</h1>
```

---

## 🔄 CSS優先順位の答え

### **質問への回答:**

> h2の記述よりclass定義の方が優先されますか？

**答え: ✅ はい、classの方が優先されます**

### 優先順位:

```
高 ↑  1. インラインスタイル（style属性）
   │  2. クラス (.class) ← これ！
低 ↓  3. 要素セレクタ (h2) ← これより上が優先
```

### 実例:

```tsx
// globals.cssに h2 { font-size: 1.25rem } があっても...

<h2 className="text-3xl">タイトル</h2>
// → text-3xl (1.875rem) が適用される
// classが優先されるため、globals.cssの設定は無視される

<h2>タイトル</h2>
// → globals.cssの 1.25rem が適用される
// class指定がない場合のみ
```

---

## ✅ 修正後のシンプルな構造

### **指定方法は2種類のみ:**

#### 1. **インライン**（特殊な動的スタイル）
```tsx
<div style={{fontSize: dynamicSize}}>
  動的サイズ
</div>
```

#### 2. **Tailwindクラス**（通常のすべて）
```tsx
<h1 className="text-xl font-bold">タイトル</h1>
<p className="text-base">本文</p>
```

### **ファイルの役割:**

| ファイル | 役割 | 内容 |
|---------|------|------|
| `globals.css` | ベーススタイル | 要素の共通設定のみ |
| `typography.ts` | 定数・ドキュメント | サイズ基準の参照 |
| コンポーネント | 実装 | Tailwindクラス指定 |

---

## 🚀 実装完了

すべての修正が完了しました！

### 修正内容:
1. ✅ `globals.css` - 要素セレクタのサイズ指定を削除
2. ✅ `typography.ts` - 定数定義ファイルに変更
3. ✅ シンプルで分かりやすい構造に統一

これで、タイポグラフィーの指定は**Tailwindクラス**に統一され、非常にシンプルになりました！🎉

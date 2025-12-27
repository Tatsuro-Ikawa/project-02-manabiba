/**
 * タイポグラフィー定数定義ファイル
 * プロジェクト全体で統一されたタイポグラフィー基準を定義
 * 
 * 使用方法:
 * - フォントサイズはTailwindの標準クラスを直接使用
 * - このファイルは定数定義とドキュメントとして使用
 */

// ============================================================================
// プロジェクト標準サイズマッピング
// ============================================================================

/**
 * Tailwind標準クラスとサイズの対応表
 * H1〜H3は1.25rem (20px = text-xl) に統一
 */
export const TYPOGRAPHY_STANDARDS = {
  // 見出し（プロジェクト標準）
  heading1to3: 'text-xl',      // H1〜H3: 1.25rem (20px) - 統一
  heading4: 'text-xl',          // H4: 1.25rem (20px)
  heading5: 'text-lg',          // H5: 1.125rem (18px)
  heading6: 'text-base',        // H6: 1rem (16px)
  
  // 本文
  body: 'text-base',            // 本文: 1rem (16px)
  bodyLarge: 'text-lg',         // 大きめ本文: 1.125rem (18px)
  bodySmall: 'text-sm',         // 小さめ本文: 0.875rem (14px)
  
  // UI要素
  button: 'text-sm',            // ボタン: 0.875rem (14px)
  label: 'text-sm',             // ラベル: 0.875rem (14px)
  caption: 'text-xs',           // キャプション: 0.75rem (12px)
} as const;

// ============================================================================
// よく使うパターン（完全なクラス名）
// ============================================================================

export const TYPOGRAPHY_PATTERNS = {
  // ページタイトル
  pageTitle: 'text-xl font-bold text-gray-900 mb-6',
  
  // セクションタイトル
  sectionTitle: 'text-xl font-semibold text-gray-800 mb-4',
  
  // カードタイトル
  cardTitle: 'text-base font-semibold text-gray-800 mb-2',
  
  // 本文
  body: 'text-base text-gray-700 leading-relaxed',
  bodyLarge: 'text-lg text-gray-700 leading-relaxed',
  bodySmall: 'text-sm text-gray-600',
  
  // ラベル
  label: 'text-sm font-medium text-gray-700 mb-1',
  labelRequired: 'text-sm font-medium text-gray-700 mb-1',
  
  // ボタン
  buttonPrimary: 'text-sm font-medium px-4 py-2 rounded-lg',
  buttonSecondary: 'text-sm font-medium px-4 py-2 rounded-lg',
  
  // キャプション・補足
  caption: 'text-xs text-gray-500 mt-1',
  helper: 'text-xs text-gray-600',
  
  // ステップタイトル（SMART目標など）
  stepTitle: 'text-xl font-bold text-gray-900 mb-2',
  stepDescription: 'text-base text-gray-600',
} as const;

// ============================================================================
// Tailwind標準サイズリファレンス
// ============================================================================

/**
 * Tailwindのフォントサイズクラス一覧（参照用）
 * 
 * text-xs    = 0.75rem  = 12px
 * text-sm    = 0.875rem = 14px
 * text-base  = 1rem     = 16px
 * text-lg    = 1.125rem = 18px
 * text-xl    = 1.25rem  = 20px  ← プロジェクトのH1〜H4標準
 * text-2xl   = 1.5rem   = 24px
 * text-3xl   = 1.875rem = 30px
 * text-4xl   = 2.25rem  = 36px
 * text-5xl   = 3rem     = 48px
 * text-6xl   = 3.75rem  = 60px
 */

// ============================================================================
// フォントウェイトリファレンス
// ============================================================================

/**
 * Tailwindのフォントウェイトクラス一覧（参照用）
 * 
 * font-thin       = 100
 * font-extralight = 200
 * font-light      = 300
 * font-normal     = 400
 * font-medium     = 500
 * font-semibold   = 600 ← プロジェクト標準
 * font-bold       = 700
 * font-extrabold  = 800
 * font-black      = 900
 */

// ============================================================================
// レスポンシブタイポグラフィーの例
// ============================================================================

/**
 * レスポンシブ対応の使用例
 * 
 * // 段階的にサイズアップ
 * className="text-base md:text-lg lg:text-xl"
 * 
 * // モバイルとデスクトップで切り替え
 * className="text-sm md:text-base"
 * 
 * // 見出しのレスポンシブ例
 * className="text-xl md:text-2xl lg:text-3xl font-bold"
 */

// ============================================================================
// 使用方法
// ============================================================================

/**
 * コンポーネントでの使用例:
 * 
 * import { TYPOGRAPHY_PATTERNS } from '@/styles/typography';
 * 
 * // 方法1: パターンを使用（推奨）
 * <h1 className={TYPOGRAPHY_PATTERNS.pageTitle}>ページタイトル</h1>
 * 
 * // 方法2: 直接指定
 * <h1 className="text-xl font-bold text-gray-900">ページタイトル</h1>
 * 
 * // 方法3: 標準サイズ定数を使用
 * <h1 className={`${TYPOGRAPHY_STANDARDS.heading1to3} font-bold`}>タイトル</h1>
 */

// ============================================================================
// エクスポート
// ============================================================================

export type TypographyPattern = keyof typeof TYPOGRAPHY_PATTERNS;
export type TypographyStandard = keyof typeof TYPOGRAPHY_STANDARDS;

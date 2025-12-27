/**
 * データ属性命名規則レギュレーション
 * 
 * このファイルは、プロジェクト全体で使用するデータ属性の命名規則を定義します。
 * 一貫性のあるデータ属性の使用により、メンテナンス性とデバッグ効率を向上させます。
 */

// ============================================================================
// データ属性命名規則レギュレーション
// ============================================================================

/**
 * 階層構造属性 (data-hierarchy)
 * アプリケーション全体の階層構造を表現
 */
export const HIERARCHY_ATTRIBUTES = {
  // アプリケーション全体の階層
  APP_ROOT: 'app-root',
  APP_HEADER: 'app-header',
  APP_MAIN_LAYOUT: 'app-main-layout',
  APP_SIDEBAR_LEFT: 'app-sidebar-left',
  APP_WORKSPACE: 'app-workspace',
  APP_VIDEO_ZOOM: 'app-video-zoom',
  APP_SIDEBAR_RIGHT: 'app-sidebar-right',
  APP_SUPPORT_SLIDE: 'app-support-slide',
  
  // コンポーネント内の階層
  COMPONENT_HEADER: 'component-header',
  COMPONENT_SIDEBAR_LEFT: 'component-sidebar-left',
  COMPONENT_VIDEO_ZOOM: 'component-video-zoom',
  COMPONENT_SIDEBAR_RIGHT: 'component-sidebar-right',
  COMPONENT_SUPPORT_SLIDE: 'component-support-slide',
  COMPONENT_MAIN_CONTENT: 'component-main-content',
} as const;

/**
 * コンポーネント識別属性 (data-component)
 * 機能別コンポーネント識別
 */
export const COMPONENT_ATTRIBUTES = {
  HEADER: 'header',
  SIDEBAR_LEFT: 'sidebar-left',
  VIDEO_ZOOM_TOGGLE: 'video-zoom-toggle',
  SIDEBAR_RIGHT: 'sidebar-right',
  SUPPORT_SLIDE_BAR: 'support-slide-bar',
  MAIN_CONTENT: 'main-content',
  HAMBURGER_MENU: 'hamburger-menu',
  ACCOUNT_MENU: 'account-menu',
  COURSE_SELECTOR: 'course-selector',
} as const;

/**
 * レスポンシブ属性 (data-responsive)
 * デバイス別表示制御
 */
export const RESPONSIVE_ATTRIBUTES = {
  MOBILE_ONLY: 'mobile-only',           // hidden md:block
  TABLET_ONLY: 'tablet-only',           // hidden md:block lg:hidden
  LAPTOP_ONLY: 'laptop-only',           // hidden lg:block xl:hidden
  DESKTOP_ONLY: 'desktop-only',         // hidden xl:block
  MOBILE_TABLET: 'mobile-tablet',       // lg:hidden xl:block
  TABLET_LAPTOP: 'tablet-laptop',       // md:block xl:hidden
  MOBILE_LAPTOP: 'mobile-laptop',       // md:hidden xl:block
  TABLET_DESKTOP: 'tablet-desktop',     // md:block
  LAPTOP_DESKTOP: 'laptop-desktop',     // lg:block
  ALL_DEVICES: 'all',                   // 全デバイス
} as const;

/**
 * レイアウト属性 (data-layout)
 * レイアウトパターン識別
 */
export const LAYOUT_ATTRIBUTES = {
  FIXED_HEADER: 'fixed-header',
  SIDEBAR_OVERLAY: 'sidebar-overlay',
  SIDEBAR_FIXED: 'sidebar-fixed',
  MODAL_OVERLAY: 'modal-overlay',
  SLIDE_UP: 'slide-up',
  ACCORDION: 'accordion',
  FLEX_CONTAINER: 'flex-container',
  FLEX_BETWEEN: 'flex-between',
  FIXED_RIGHT: 'fixed-right',
  FIXED_LEFT: 'fixed-left',
  FIXED_BOTTOM: 'fixed-bottom',
  GRID_CONTAINER: 'grid-container',
} as const;

/**
 * 状態属性 (data-state)
 * コンポーネントの状態
 */
export const STATE_ATTRIBUTES = {
  EXPANDED: 'expanded',
  COLLAPSED: 'collapsed',
  OPEN: 'open',
  CLOSED: 'closed',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  VISIBLE: 'visible',
  HIDDEN: 'hidden',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
  PLACEHOLDER: 'placeholder',
  SELECTED: 'selected',
  DISABLED: 'disabled',
  ENABLED: 'enabled',
} as const;

/**
 * 機能属性 (data-function)
 * 機能別識別
 */
export const FUNCTION_ATTRIBUTES = {
  NAVIGATION: 'navigation',
  VIDEO_PLAYER: 'video-player',
  ZOOM_SESSION: 'zoom-session',
  SUPPORT_INFO: 'support-info',
  USER_MENU: 'user-menu',
  COURSE_SELECTOR: 'course-selector',
  THEME_SELECTION: 'theme-selection',
  PDCA_INPUT: 'pdca-input',
  GOAL_SETTING: 'goal-setting',
  PROGRESS_TRACKING: 'progress-tracking',
} as const;

/**
 * インタラクション属性 (data-interaction)
 * ユーザーインタラクション
 */
export const INTERACTION_ATTRIBUTES = {
  CLICKABLE: 'clickable',
  SWIPEABLE: 'swipeable',
  DRAGGABLE: 'draggable',
  HOVERABLE: 'hoverable',
  TOGGLEABLE: 'toggleable',
  SCROLLABLE: 'scrollable',
  FOCUSABLE: 'focusable',
  SELECTABLE: 'selectable',
} as const;

/**
 * ID属性 (data-id)
 * 一意の識別子（最小情報での識別用）
 */
export const ID_ATTRIBUTES = {
  // メインレイアウト
  MAIN_CONTENT_WRAPPER: 'main-content-wrapper',
  MAIN_CONTENT: 'main-content',
  VIDEO_ZOOM_TOGGLE: 'video-zoom-toggle',
  SIDEBAR_LEFT: 'sidebar-left',
  SIDEBAR_RIGHT: 'sidebar-right',
  SUPPORT_SLIDE_BAR: 'support-slide-bar',
  
  // コンテンツエリア
  ASPIRATION_LIST: 'aspiration-list',
  PROBLEM_LIST: 'problem-list',
  THEME_SELECTOR: 'theme-selector',
  THEME_SELECTOR_TABLE: 'theme-selector-table',
  PROBLEM_THEME_SELECTOR_TABLE: 'problem-theme-selector-table',
  
  // Goal Setting SMART
  GOAL_SETTING_SMART: 'goal-setting-smart',
  GOAL_STEP_SPECIFIC: 'goal-step-specific',
  GOAL_STEP_MEASURABLE: 'goal-step-measurable',
  GOAL_STEP_RELEVANT: 'goal-step-relevant',
  GOAL_STEP_TIMEBOUND: 'goal-step-timebound',
  GOAL_SUMMARY: 'goal-summary',
  GOAL_PROGRESS_INDICATOR: 'goal-progress-indicator',
  GOAL_SUPPORT_ACCORDION: 'goal-support-accordion',
  GOAL_THEME_DISPLAY: 'goal-theme-display',
  
  // UI要素
  HEADER: 'header',
  ACCOUNT_MENU: 'account-menu',
  HAMBURGER_MENU: 'hamburger-menu',
} as const;

/**
 * コンテンツ属性 (data-content)
 * コンテンツタイプ
 */
export const CONTENT_ATTRIBUTES = {
  VIDEO_THUMBNAIL: 'video-thumbnail',
  VIDEO_DETAIL: 'video-detail',
  ZOOM_SESSION: 'zoom-session',
  SUPPORT_GUIDE: 'support-guide',
  COURSE_INFO: 'course-info',
  USER_PROFILE: 'user-profile',
  HEADER_CONTAINER: 'header-container',
  HEADER_CONTENT: 'header-content',
  OVERLAY_BACKGROUND: 'overlay-background',
  SIDEBAR_PANEL: 'sidebar-panel',
  SLIDE_HEADER: 'slide-header',
  SLIDE_CONTENT: 'slide-content',
  MENU_ITEM: 'menu-item',
  SUB_MENU: 'sub-menu',
  THUMBNAIL_IMAGE: 'thumbnail-image',
  BUTTON_GROUP: 'button-group',
  MODE_SWITCH: 'mode-switch',
  GOAL_STEP_CONTENT: 'goal-step-content',
  GOAL_INPUT_FIELD: 'goal-input-field',
  GOAL_THEME_INFO: 'goal-theme-info',
  GOAL_TIPS: 'goal-tips',
  GOAL_EXAMPLES: 'goal-examples',
  GOAL_PREVIEW: 'goal-preview',
} as const;

// ============================================================================
// 属性生成ヘルパー関数
// ============================================================================

/**
 * データ属性オブジェクトを生成するヘルパー関数
 */
export interface DataAttributes {
  'data-id'?: string;
  'data-hierarchy'?: string;
  'data-component'?: string;
  'data-responsive'?: string;
  'data-layout'?: string;
  'data-state'?: string;
  'data-function'?: string;
  'data-interaction'?: string;
  'data-content'?: string;
}

/**
 * データ属性オブジェクトを生成する関数
 */
export const createDataAttributes = (attributes: Partial<DataAttributes>): DataAttributes => {
  return Object.fromEntries(
    Object.entries(attributes).filter(([_, value]) => value !== undefined)
  ) as DataAttributes;
};

/**
 * 階層構造属性を生成する関数
 */
export const createHierarchyAttributes = (
  hierarchy: keyof typeof HIERARCHY_ATTRIBUTES,
  component?: keyof typeof COMPONENT_ATTRIBUTES
): DataAttributes => {
  const attrs: DataAttributes = {
    'data-hierarchy': HIERARCHY_ATTRIBUTES[hierarchy],
  };
  
  if (component) {
    attrs['data-component'] = COMPONENT_ATTRIBUTES[component];
  }
  
  return attrs;
};

/**
 * レスポンシブ属性を生成する関数
 */
export const createResponsiveAttributes = (
  responsive: keyof typeof RESPONSIVE_ATTRIBUTES,
  layout?: keyof typeof LAYOUT_ATTRIBUTES
): DataAttributes => {
  const attrs: DataAttributes = {
    'data-responsive': RESPONSIVE_ATTRIBUTES[responsive],
  };
  
  if (layout) {
    attrs['data-layout'] = LAYOUT_ATTRIBUTES[layout];
  }
  
  return attrs;
};

/**
 * 状態属性を生成する関数
 */
export const createStateAttributes = (
  state: keyof typeof STATE_ATTRIBUTES,
  interaction?: keyof typeof INTERACTION_ATTRIBUTES
): DataAttributes => {
  const attrs: DataAttributes = {
    'data-state': STATE_ATTRIBUTES[state],
  };
  
  if (interaction) {
    attrs['data-interaction'] = INTERACTION_ATTRIBUTES[interaction];
  }
  
  return attrs;
};

// ============================================================================
// 使用例とドキュメント
// ============================================================================

/**
 * 使用例:
 * 
 * // 基本的な使用方法
 * const headerAttrs = createDataAttributes({
 *   'data-hierarchy': HIERARCHY_ATTRIBUTES.APP_HEADER,
 *   'data-component': COMPONENT_ATTRIBUTES.HEADER,
 *   'data-responsive': RESPONSIVE_ATTRIBUTES.ALL_DEVICES,
 *   'data-layout': LAYOUT_ATTRIBUTES.FIXED_HEADER,
 * });
 * 
 * // ヘルパー関数を使用した方法
 * const sidebarAttrs = createHierarchyAttributes('APP_SIDEBAR_LEFT', 'SIDEBAR_LEFT');
 * const responsiveAttrs = createResponsiveAttributes('MOBILE_ONLY', 'SIDEBAR_OVERLAY');
 * 
 * // JSXでの使用
 * <div {...headerAttrs} className="...">
 *   <button {...createStateAttributes('ACTIVE', 'CLICKABLE')}>
 *     ボタン
 *   </button>
 * </div>
 */

/**
 * 命名規則ガイドライン:
 * 
 * 1. 階層構造 (data-hierarchy):
 *    - アプリケーション全体: "app-[section]"
 *    - コンポーネント内: "component-[name]"
 * 
 * 2. コンポーネント (data-component):
 *    - ケバブケース: "video-zoom-toggle"
 *    - 機能名を明確に: "support-slide-bar"
 * 
 * 3. レスポンシブ (data-responsive):
 *    - デバイス範囲: "mobile-only", "tablet-laptop"
 *    - 全デバイス: "all"
 * 
 * 4. レイアウト (data-layout):
 *    - パターン名: "fixed-header", "sidebar-overlay"
 *    - CSSクラスに対応: "flex-container"
 * 
 * 5. 状態 (data-state):
 *    - 現在の状態: "expanded", "collapsed"
 *    - 対になる状態を定義: "open/closed"
 * 
 * 6. 機能 (data-function):
 *    - 機能名: "navigation", "video-player"
 *    - ユーザーアクション: "user-menu"
 * 
 * 7. インタラクション (data-interaction):
 *    - 操作可能な要素: "clickable", "swipeable"
 *    - ユーザー操作: "toggleable"
 * 
 * 8. コンテンツ (data-content):
 *    - コンテンツタイプ: "video-thumbnail"
 *    - 構造要素: "header-container"
 */

export default {
  HIERARCHY_ATTRIBUTES,
  COMPONENT_ATTRIBUTES,
  RESPONSIVE_ATTRIBUTES,
  LAYOUT_ATTRIBUTES,
  STATE_ATTRIBUTES,
  FUNCTION_ATTRIBUTES,
  INTERACTION_ATTRIBUTES,
  CONTENT_ATTRIBUTES,
  ID_ATTRIBUTES,
  createDataAttributes,
  createHierarchyAttributes,
  createResponsiveAttributes,
  createStateAttributes,
};

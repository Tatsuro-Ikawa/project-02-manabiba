/**
 * 日本時間（JST）対応の日付処理ユーティリティ
 */

// 日本時間のタイムゾーンオフセット（ミリ秒）
const JST_OFFSET = 9 * 60 * 60 * 1000;

/**
 * 日付を日本時間のYYYY-MM-DD形式にフォーマット
 */
export const formatDateToJST = (date: Date): string => {
  // 日本時間に調整
  const jstDate = new Date(date.getTime() + JST_OFFSET);
  return jstDate.toISOString().split('T')[0];
};

/**
 * 日付文字列を日本時間のDateオブジェクトに変換
 */
export const parseDateFromJST = (dateString: string): Date => {
  // YYYY-MM-DD形式の文字列を日本時間のDateオブジェクトに変換
  const [year, month, day] = dateString.split('-').map(Number);
  // 日本時間でDateオブジェクトを作成
  const jstDate = new Date(year, month - 1, day);
  // UTC時間に変換（JSTオフセットを引く）
  return new Date(jstDate.getTime() - JST_OFFSET);
};

/**
 * 今日の日付を日本時間で取得
 */
export const getTodayJST = (): string => {
  return formatDateToJST(new Date());
};

/**
 * 日本時間でDateオブジェクトを作成
 */
export const createDateJST = (year: number, month: number, day: number): Date => {
  const jstDate = new Date(year, month - 1, day);
  return new Date(jstDate.getTime() - JST_OFFSET);
};

/**
 * 日付が今日かどうかを判定（日本時間）
 */
export const isTodayJST = (dateString: string): boolean => {
  return dateString === getTodayJST();
};

/**
 * 日付を日本語形式で表示
 */
export const formatDateToJapanese = (dateString: string): string => {
  const date = parseDateFromJST(dateString);
  const jstDate = new Date(date.getTime() + JST_OFFSET);
  
  return jstDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
};

/**
 * 月名を日本語で取得
 */
export const getMonthNameJST = (date: Date): string => {
  const jstDate = new Date(date.getTime() + JST_OFFSET);
  return jstDate.toLocaleDateString('ja-JP', { 
    year: 'numeric', 
    month: 'long' 
  });
};

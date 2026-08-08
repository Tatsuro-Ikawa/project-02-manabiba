/** ホーム画面の動画・記事・サイト一覧 */
export const HOME_LIST_MAX_ITEMS = 25;

export const HOME_SECTION_TITLES = {
  videos: 'お気に入り動画',
  articles: '参考にしたい記事',
  sites: '使えるサイト',
} as const;

/** site=ゲスト／フリー向け共通、personal=Standard以上の個人リスト */
export type HomeListSaveTarget = 'site' | 'personal';

/** Firestore: users/{uid}/home_content/lists */
export const USER_HOME_CONTENT_SUBCOLLECTION = 'home_content';
export const USER_HOME_CONTENT_DOC_ID = 'lists';

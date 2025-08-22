import { generateUserKey, generateSalt } from './encryption';

// キー管理設定
export interface KeyManagementConfig {
  sessionTimeout: number; // セッションタイムアウト（ミリ秒）
  maxRetryAttempts: number; // 最大リトライ回数
  backupKeyEnabled: boolean; // バックアップキー有効化
}

// ユーザーキー情報
export interface UserKeyInfo {
  userId: string;
  masterKey: string; // マスターキー（ハッシュ化）
  salt: string;
  sessionKey?: string; // セッションキー
  sessionExpiry?: Date; // セッション有効期限
  backupKey?: string; // バックアップキー
  createdAt: Date;
  updatedAt: Date;
  lastAccessAt: Date;
}

// セッション情報
export interface SessionInfo {
  sessionId: string;
  userId: string;
  sessionKey: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

// デフォルト設定
export const DEFAULT_KEY_CONFIG: KeyManagementConfig = {
  sessionTimeout: 30 * 60 * 1000, // 30分
  maxRetryAttempts: 3,
  backupKeyEnabled: true,
};

// キー管理クラス
export class KeyManager {
  private config: KeyManagementConfig;
  private sessions: Map<string, SessionInfo> = new Map();
  private userKeys: Map<string, UserKeyInfo> = new Map();

  constructor(config: Partial<KeyManagementConfig> = {}) {
    this.config = { ...DEFAULT_KEY_CONFIG, ...config };
  }

  // ユーザーキーの初期化
  async initializeUserKey(
    userId: string,
    password: string
  ): Promise<UserKeyInfo> {
    try {
      const salt = generateSalt();
      const masterKey = await generateUserKey(password, salt);
      
      const userKeyInfo: UserKeyInfo = {
        userId,
        masterKey,
        salt,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessAt: new Date(),
      };

      // バックアップキーを生成（設定が有効な場合）
      if (this.config.backupKeyEnabled) {
        const backupSalt = generateSalt();
        userKeyInfo.backupKey = await generateUserKey(password, backupSalt);
      }

      this.userKeys.set(userId, userKeyInfo);
      return userKeyInfo;
    } catch (error) {
      console.error('ユーザーキー初期化エラー:', error);
      throw new Error('ユーザーキーの初期化に失敗しました');
    }
  }

  // セッションキーの生成
  async generateSessionKey(userId: string, password: string): Promise<SessionInfo> {
    try {
      const userKeyInfo = this.userKeys.get(userId);
      if (!userKeyInfo) {
        throw new Error('ユーザーキーが見つかりません');
      }

      // パスワードの検証
      const testKey = await generateUserKey(password, userKeyInfo.salt);
      if (testKey !== userKeyInfo.masterKey) {
        throw new Error('パスワードが正しくありません');
      }

      // セッションキーの生成
      const sessionId = this.generateSessionId();
      const sessionKey = await generateUserKey(password, generateSalt());
      const expiresAt = new Date(Date.now() + this.config.sessionTimeout);

      const sessionInfo: SessionInfo = {
        sessionId,
        userId,
        sessionKey,
        createdAt: new Date(),
        expiresAt,
        isActive: true,
      };

      // 既存のセッションを無効化
      this.invalidateUserSessions(userId);

      // 新しいセッションを保存
      this.sessions.set(sessionId, sessionInfo);

      // ユーザーキー情報を更新
      userKeyInfo.sessionKey = sessionKey;
      userKeyInfo.sessionExpiry = expiresAt;
      userKeyInfo.lastAccessAt = new Date();
      userKeyInfo.updatedAt = new Date();

      return sessionInfo;
    } catch (error) {
      console.error('セッションキー生成エラー:', error);
      throw error;
    }
  }

  // セッションキーの検証
  validateSessionKey(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // セッションの有効期限チェック
    if (new Date() > session.expiresAt) {
      this.invalidateSession(sessionId);
      return false;
    }

    // セッションがアクティブかチェック
    if (!session.isActive) {
      return false;
    }

    // 最終アクセス時間を更新
    session.expiresAt = new Date(Date.now() + this.config.sessionTimeout);
    return true;
  }

  // セッションキーの取得
  getSessionKey(sessionId: string): string | null {
    if (!this.validateSessionKey(sessionId)) {
      return null;
    }

    const session = this.sessions.get(sessionId);
    return session?.sessionKey || null;
  }

  // セッションの無効化
  invalidateSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.sessions.delete(sessionId);
    }
  }

  // ユーザーの全セッションを無効化
  invalidateUserSessions(userId: string): void {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.invalidateSession(sessionId);
      }
    }
  }

  // キーの復旧
  async recoverUserKey(userId: string, password: string): Promise<UserKeyInfo | null> {
    try {
      const userKeyInfo = this.userKeys.get(userId);
      if (!userKeyInfo || !userKeyInfo.backupKey) {
        return null;
      }

      // バックアップキーで検証
      const testKey = await generateUserKey(password, userKeyInfo.salt);
      if (testKey === userKeyInfo.masterKey) {
        // マスターキーを復元
        userKeyInfo.masterKey = testKey;
        userKeyInfo.updatedAt = new Date();
        userKeyInfo.lastAccessAt = new Date();
        return userKeyInfo;
      }

      return null;
    } catch (error) {
      console.error('キー復旧エラー:', error);
      return null;
    }
  }

  // セッションIDの生成
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 期限切れセッションのクリーンアップ
  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.invalidateSession(sessionId);
      }
    }
  }

  // ユーザーキー情報の取得
  getUserKeyInfo(userId: string): UserKeyInfo | null {
    return this.userKeys.get(userId) || null;
  }

  // アクティブセッション数の取得
  getActiveSessionCount(): number {
    return Array.from(this.sessions.values()).filter(session => session.isActive).length;
  }

  // 全セッション情報の取得（デバッグ用）
  getAllSessions(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }
}

// グローバルキーマネージャーインスタンス
export const keyManager = new KeyManager();

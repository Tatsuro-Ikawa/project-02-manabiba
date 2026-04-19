import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { auth } from './firebase';

// Googleログインプロバイダーの設定
const googleProvider = new GoogleAuthProvider();
// 別アカウントでログインし直せるように、毎回アカウント選択を促す。
// （Firebase の signOut は Google セッション自体をログアウトしないため、既定だと前回アカウントで自動ログインされやすい）
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Googleログイン関数（ポップアップ方式）
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Googleログインエラー:', error);
    throw error;
  }
};

// ログアウト関数
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('ログアウトエラー:', error);
    throw error;
  }
};

// 認証状態の監視
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// 現在のユーザーを取得
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
}; 
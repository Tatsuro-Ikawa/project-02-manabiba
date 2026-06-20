let intentionalSignOutActive = false;

/** ユーザー操作によるログオフ開始（保護ページの /login リダイレクトを抑止） */
export function markIntentionalSignOut(): void {
  intentionalSignOutActive = true;
}

export function isIntentionalSignOut(): boolean {
  return intentionalSignOutActive;
}

export function clearIntentionalSignOut(): void {
  intentionalSignOutActive = false;
}

type AppRouter = { replace: (path: string) => void };

/**
 * 意図的ログオフ: 先に画面遷移してから signOut する。
 * signOut だけ先に実行すると、保護ページの useEffect が /login へ飛ばすことがある。
 */
export async function signOutAndRedirect(
  signOut: () => Promise<void>,
  router: AppRouter,
  redirectTo: string
): Promise<void> {
  markIntentionalSignOut();
  router.replace(redirectTo);
  try {
    await signOut();
  } finally {
    window.setTimeout(() => clearIntentionalSignOut(), 500);
  }
}

/** 未ログイン時に /login へ飛ばしてよいか */
export function shouldRedirectUnauthenticatedToLogin(): boolean {
  return !isIntentionalSignOut();
}

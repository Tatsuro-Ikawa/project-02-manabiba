import type { User } from 'firebase/auth';

/** クライアントから API へ。`Content-Type` は呼び出し側で上書き可。 */
export async function buildJsonAuthHeaders(user: User | null): Promise<HeadersInit> {
  const headers: Record<string, string> = {};
  if (user) {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

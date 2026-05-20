/** Route Handler の `{ error: string }` または `{ error: { code, message } }` から表示用文言を取り出す */
export function messageFromApiErrorPayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const err = (payload as { error?: unknown }).error;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
    const c = (err as { code?: unknown }).code;
    if (typeof c === 'string' && c.trim()) return c;
  }
  return '';
}

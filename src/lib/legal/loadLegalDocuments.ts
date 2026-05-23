import type { LegalBundle, PrivacyDocument, TermsDocument } from '@/lib/legal/types';

const TERMS_URL = '/legal/terms.json';
const PRIVACY_URL = '/legal/privacy.json';

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function parseTermsDocument(raw: unknown): TermsDocument {
  if (!raw || typeof raw !== 'object') {
    throw new Error('利用規約 JSON の形式が不正です。');
  }
  const o = raw as Record<string, unknown>;
  if (!isNonEmptyString(o.version) || !isNonEmptyString(o.title) || !Array.isArray(o.sections)) {
    throw new Error('利用規約 JSON に version / title / sections が必要です。');
  }
  const sections = o.sections.map((sec, i) => {
    if (!sec || typeof sec !== 'object') {
      throw new Error(`利用規約 JSON: sections[${i}] が不正です。`);
    }
    const s = sec as Record<string, unknown>;
    if (!isNonEmptyString(s.title) || !Array.isArray(s.paragraphs)) {
      throw new Error(`利用規約 JSON: sections[${i}] に title / paragraphs が必要です。`);
    }
    const paragraphs = s.paragraphs.filter((p): p is string => isNonEmptyString(p));
    if (paragraphs.length === 0) {
      throw new Error(`利用規約 JSON: sections[${i}] の paragraphs が空です。`);
    }
    return {
      id: isNonEmptyString(s.id) ? s.id : undefined,
      title: s.title.trim(),
      paragraphs,
    };
  });
  return { version: o.version.trim(), title: o.title.trim(), sections };
}

function parsePrivacyDocument(raw: unknown): PrivacyDocument {
  if (!raw || typeof raw !== 'object') {
    throw new Error('プライバシーポリシー JSON の形式が不正です。');
  }
  const o = raw as Record<string, unknown>;
  if (!isNonEmptyString(o.version) || !isNonEmptyString(o.title) || !Array.isArray(o.paragraphs)) {
    throw new Error('プライバシーポリシー JSON に version / title / paragraphs が必要です。');
  }
  const paragraphs = o.paragraphs.filter((p): p is string => isNonEmptyString(p));
  if (paragraphs.length === 0) {
    throw new Error('プライバシーポリシー JSON の paragraphs が空です。');
  }
  return { version: o.version.trim(), title: o.title.trim(), paragraphs };
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`条文ファイルの読み込みに失敗しました: ${url} (${res.status})`);
  }
  return res.json() as Promise<unknown>;
}

/** 利用規約・プライバシーを `public/legal/*.json` から読み込む（版は各 JSON の version が正本）。 */
export async function loadLegalBundle(): Promise<LegalBundle> {
  const [termsRaw, privacyRaw] = await Promise.all([fetchJson(TERMS_URL), fetchJson(PRIVACY_URL)]);
  return {
    terms: parseTermsDocument(termsRaw),
    privacy: parsePrivacyDocument(privacyRaw),
  };
}

export async function loadTermsDocument(): Promise<TermsDocument> {
  const raw = await fetchJson(TERMS_URL);
  return parseTermsDocument(raw);
}

export async function loadPrivacyDocument(): Promise<PrivacyDocument> {
  const raw = await fetchJson(PRIVACY_URL);
  return parsePrivacyDocument(raw);
}

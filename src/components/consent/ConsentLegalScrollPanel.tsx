'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LegalPrivacyView } from '@/components/legal/LegalPrivacyView';
import { LegalSectionsView } from '@/components/legal/LegalSectionsView';
import type { PrivacyDocument, TermsDocument } from '@/lib/legal/types';

type ConsentLegalScrollPanelProps = {
  terms: TermsDocument;
  privacy: PrivacyDocument;
  /** スクロール領域の末尾に到達したときに一度だけ呼ばれる */
  onScrollEndReached: () => void;
};

/**
 * 規約（章立て）・プライバシーを一つのスクロール領域に表示し、末尾までスクロールしたらコールバック。
 */
export function ConsentLegalScrollPanel({
  terms,
  privacy,
  onScrollEndReached,
}: ConsentLegalScrollPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const notifiedRef = useRef(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const markReached = useCallback(() => {
    if (notifiedRef.current) return;
    notifiedRef.current = true;
    setScrolledToEnd(true);
    onScrollEndReached();
  }, [onScrollEndReached]);

  const checkScrollEnd = useCallback(() => {
    const el = scrollRef.current;
    if (!el || notifiedRef.current) return;
    const gap = 32;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - gap) {
      markReached();
    }
  }, [markReached]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const gap = 32;
    if (el.scrollHeight <= el.clientHeight + gap) {
      markReached();
    }
  }, [markReached, terms, privacy]);

  return (
    <div className="mb-6">
      <p className="text-sm font-semibold text-gray-800 mb-2">利用規約・プライバシーポリシーの確認</p>
      <p className="text-xs text-gray-600 mb-2">
        下の枠内を<strong>末尾までスクロール</strong>してください。利用規約は共通・7日間プログラム・気づきノートなど
        <strong>章ごと</strong>に記載しています（利用する内容に応じて該当章をお読みください）。プライバシーポリシーは全体で1本です。
        版: 利用規約 {terms.version}／プライバシー {privacy.version}
      </p>
      <div
        ref={scrollRef}
        role="region"
        aria-label="利用規約（章立て）およびプライバシーポリシー。スクロールして全文を確認してください。"
        onScroll={checkScrollEnd}
        className="max-h-[min(52vh,440px)] overflow-y-auto rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-800 leading-relaxed shadow-inner"
      >
        <LegalSectionsView sections={terms.sections} />
        <section className="mb-8 last:mb-2">
          <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">
            {privacy.title}
          </h2>
          <LegalPrivacyView paragraphs={privacy.paragraphs} />
        </section>
        <p className="text-xs text-gray-500 pt-2 border-t border-dashed border-gray-300">
          ─ ここがスクロール領域の末尾です ─
        </p>
      </div>
      {!scrolledToEnd && (
        <p className="text-xs text-amber-800 mt-2" aria-live="polite">
          同意するには、上記を末尾までスクロールしてください。
        </p>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TERMS_VERSION, PRIVACY_VERSION } from '@/lib/consent';

/** 条文はダミー。正式版は別途ドキュメント・規約ページに反映する。 */
const DUMMY_SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: '利用規約（ダミー条文）',
    paragraphs: [
      '【ダミー】本利用規約は、サービス「人生学び場　こころ道場」（以下「本サービス」）の利用条件を定めるものです。以下の条文はプレースホルダであり、法的効力を有する最終文面ではありません。',
      '【ダミー】第1条（適用）　本規約は、本サービスの提供条件および本サービスの利用に関する当社と登録ユーザとの間の権利義務関係を定めることを目的とし、登録ユーザと当社との間の本サービスの利用に関わる一切の関係に適用されます。',
      '【ダミー】第2条（定義）　本規約において使用する用語の定義は、別途定めるとおりとします。用語の解釈に疑義が生じた場合は、当社の定めるガイドラインに従うものとします（ダミー）。',
      '【ダミー】第3条（登録）　利用希望者は、当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。当社は、申請者に以下の事由があると判断した場合、登録の拒否を行うことがあります（ダミー）。',
      '【ダミー】第4条（禁止事項）　登録ユーザは、法令または公序良俗に違反する行為、当社または第三者の権利を侵害する行為、その他当社が不適切と判断する行為を行ってはなりません（ダミー）。',
      '【ダミー】第5条（免責）　当社は、本サービスに事実上または法律上の瑕疵がないことを保証するものではありません。登録ユーザは自己責任において本サービスを利用するものとします（ダミー）。',
      '【ダミー】第6条（規約の変更）　当社は、必要と判断した場合には、登録ユーザへの通知なく本規約を変更できるものとします。変更後の規約は、本サービス上に表示した時点より効力を生じるものとします（ダミー）。',
      '【ダミー】以上はダミー条文です。スクロールして末尾までお読みいただくと、下の同意チェックが有効になります。',
    ],
  },
  {
    title: 'プライバシーポリシー（ダミー条文）',
    paragraphs: [
      '【ダミー】当社は、ユーザーの個人情報の取扱いについて、個人情報の保護に関する法律その他関連法令を遵守します。以下はプレースホルダであり、最終的なプライバシーポリシー全文ではありません。',
      '【ダミー】第1条（取得する情報）　当社は、本サービスの提供にあたり、氏名、メールアドレス、利用履歴、端末情報、Cookie 等の情報を取得する場合があります（ダミー）。',
      '【ダミー】第2条（利用目的）　取得した情報は、本人確認、サービス提供、お問い合わせ対応、統計データの作成、不正利用の防止、法令に基づく開示請求への対応等の目的で利用します（ダミー）。',
      '【ダミー】第3条（第三者提供）　当社は、法令に基づく場合を除き、あらかじめユーザーの同意を得ないで、個人情報を第三者に提供しません（ダミー）。',
      '【ダミー】第4条（委託）　当社は、利用目的の達成に必要な範囲で、個人情報の取扱いの全部または一部を第三者に委託することがあります（ダミー）。',
      '【ダミー】第5条（安全管理）　当社は、個人情報の漏えい、滅失またはき損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます（ダミー）。',
      '【ダミー】第6条（開示・訂正・削除）　ユーザーは、当社が保有する自己の個人情報について、開示、訂正、利用停止等を請求することができます（ダミー）。',
      '【ダミー】以上はダミー条文です。上記スクロール領域の末尾まで到達すると、同意チェックが有効になります。',
    ],
  },
];

type ConsentLegalScrollPanelProps = {
  /** スクロール領域の末尾に到達したときに一度だけ呼ばれる */
  onScrollEndReached: () => void;
};

/**
 * 規約・プライバシーのダミー全文を一つのスクロール領域に表示し、末尾までスクロールしたらコールバック。
 */
export function ConsentLegalScrollPanel({ onScrollEndReached }: ConsentLegalScrollPanelProps) {
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
  }, [markReached]);

  return (
    <div className="mb-6">
      <p className="text-sm font-semibold text-gray-800 mb-2">
        規約・プライバシー条文の確認（ダミー）
      </p>
      <p className="text-xs text-gray-600 mb-2">
        下の枠内を<strong>末尾までスクロール</strong>してください。読了後に同意のチェックが有効になります。
        現在の版: 利用規約 {TERMS_VERSION}／プライバシー {PRIVACY_VERSION}
      </p>
      <div
        ref={scrollRef}
        role="region"
        aria-label="利用規約およびプライバシーポリシーのダミー条文。スクロールして全文を確認してください。"
        onScroll={checkScrollEnd}
        className="max-h-[min(52vh,440px)] overflow-y-auto rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-800 leading-relaxed shadow-inner"
      >
        {DUMMY_SECTIONS.map((section) => (
          <section key={section.title} className="mb-8 last:mb-2">
            <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">
              {section.title}
            </h2>
            {section.paragraphs.map((p, i) => (
              <p key={i} className="mb-3 last:mb-0">
                {p}
              </p>
            ))}
          </section>
        ))}
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

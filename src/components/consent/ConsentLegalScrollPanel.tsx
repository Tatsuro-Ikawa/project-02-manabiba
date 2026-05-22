'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TERMS_VERSION, PRIVACY_VERSION } from '@/lib/consent';

/**
 * 同意画面用のダミー条文。
 * 利用規約は「共通」「7日間プログラム」「気づきノート」など章立てで読み分け可能な構成（正式文面は後日差し替え）。
 * プライバシーポリシーはサービス全体で1本（同意も1回）。
 */
const DUMMY_SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: '利用規約（ダミー条文）',
    paragraphs: [
      '【ダミー】本利用規約は、サービス「人生学び場　こころ道場」（以下「本サービス」）の利用条件を定めるものです。以下はプレースホルダであり、法的効力を有する最終文面ではありません。',
      '【ダミー】利用するプログラム（7日間スタートプログラム、気づきノート 等）に応じて、該当する章をお読みください。フリー会員の方も、本同意画面で利用規約・プライバシーポリシーを1回確認いただきます。',
    ],
  },
  {
    title: '第1章　共通（全利用者に適用）',
    paragraphs: [
      '【ダミー】第1条（適用）　本規約は、本サービスの提供条件および登録ユーザと当社との権利義務を定めます。',
      '【ダミー】第2条（会員登録）　利用希望者は所定の方法で登録を申請し、当社が承認した時点で会員登録が完了します。',
      '【ダミー】第3条（禁止事項）　法令違反、第三者の権利侵害、その他当社が不適切と判断する行為を行ってはなりません。',
      '【ダミー】第4条（規約の変更）　当社は必要に応じ本規約を変更できます。変更後の規約は本サービス上の表示時点で効力を生じます。',
    ],
  },
  {
    title: '第2章　7日間スタートプログラム（フリーコース）',
    paragraphs: [
      '【ダミー】本章は、セルフコーチングによる「自分を変える7日間プログラム」（無料）を利用する場合に適用されます。',
      '【ダミー】第5条（プログラムの内容）　当社が提供する日次タスク・振り返り等の範囲内でプログラムを提供します（ダミー）。',
      '【ダミー】第6条（無料提供）　本章に定めるプログラムは原則無料です。有料プランへの申込は別途の規定および申込画面に従います。',
      '【ダミー】第7条（データ）　プログラム利用に伴い入力された内容は、プライバシーポリシーに従い取り扱います。',
    ],
  },
  {
    title: '第3章　気づきノート（スタンダード／プレミアム）',
    paragraphs: [
      '【ダミー】本章は、気づきと学びのマネジメント日誌「気づきノート」を利用する場合（AIコーチ／プライベートコーチ等の有料プランを含む）に適用されます。',
      '【ダミー】第8条（お試し期間）　初回申込時には所定の無料お試し期間が付与される場合があります。期間終了後の課金条件は申込画面および特商法表記に従います（ダミー）。',
      '【ダミー】第9条（サブスクリプション）　有料プランは月額または年額の自動更新です。解約・プラン変更は所定の方法で行います。',
      '【ダミー】第10条（AI・コーチ機能）　プランに応じて AI コメント、コーチ共有、メッセージボード等の提供範囲が異なります。',
    ],
  },
  {
    title: '第4章　免責・準拠法（共通）',
    paragraphs: [
      '【ダミー】第11条（免責）　当社は本サービスに瑕疵がないことを保証しません。利用は利用者の責任において行ってください。',
      '【ダミー】第12条（準拠法・管轄）　本規約は日本法に準拠します（ダミー）。',
    ],
  },
  {
    title: 'プライバシーポリシー（ダミー条文・サービス全体で1本）',
    paragraphs: [
      '【ダミー】当社は個人情報の保護に関する法律その他関連法令を遵守します。7日間プログラム・気づきノート・その他本サービス全体で、本ポリシー1本を適用します（同意も1回）。',
      '【ダミー】第1条（取得する情報）　氏名、メールアドレス、利用履歴、端末情報、Cookie 等を取得する場合があります。',
      '【ダミー】第2条（利用目的）　本人確認、サービス提供、お問い合わせ対応、不正利用の防止等に利用します。',
      '【ダミー】第3条（第三者提供・委託）　法令に基づく場合を除き同意なく第三者に提供しません。委託は利用目的の範囲内で行います。',
      '【ダミー】第4条（安全管理・開示等）　適切な安全管理措置を講じます。開示・訂正・利用停止等の請求に応じます。',
    ],
  },
];

type ConsentLegalScrollPanelProps = {
  /** スクロール領域の末尾に到達したときに一度だけ呼ばれる */
  onScrollEndReached: () => void;
};

/**
 * 規約（章立て）・プライバシーを一つのスクロール領域に表示し、末尾までスクロールしたらコールバック。
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
        利用規約・プライバシーポリシーの確認（ダミー）
      </p>
      <p className="text-xs text-gray-600 mb-2">
        下の枠内を<strong>末尾までスクロール</strong>してください。利用規約は共通・7日間プログラム・気づきノートなど
        <strong>章ごと</strong>に記載しています（利用する内容に応じて該当章をお読みください）。プライバシーポリシーは全体で1本です。
        版: 利用規約 {TERMS_VERSION}／プライバシー {PRIVACY_VERSION}
      </p>
      <div
        ref={scrollRef}
        role="region"
        aria-label="利用規約（章立て）およびプライバシーポリシー。スクロールして全文を確認してください。"
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

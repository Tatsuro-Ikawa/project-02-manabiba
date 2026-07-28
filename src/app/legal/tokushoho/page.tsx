'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtoHeader from '@/components/proto/ProtoHeader';
import LeftSidebar from '@/components/proto/LeftSidebar';
import ProtoFooter from '@/components/proto/ProtoFooter';

export default function TokushohoPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div style={{ fontFamily: 'var(--font-family-jp)' }}>
      <ProtoHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />
      <LeftSidebar
        variant="home"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="home-main-wrapper">
        <main className="legal-page-main">
          <div className="legal-page-content">
            <h1 className="legal-page-title">特定商取引法に基づく表記</h1>
            <p className="legal-page-lead">
              人生学び場　こころ道場（以下「当サービス」）における有料プランの販売条件等を、特定商取引法に基づき表記します。
            </p>
            <p className="legal-page-updated">最終更新日：2026年7月28日</p>

            <dl className="legal-dl">
              <div>
                <dt>販売事業者名（商号）</dt>
                <dd>ビズアイテム</dd>
              </div>

              <div>
                <dt>代表者または運営責任者</dt>
                <dd>代表　井川竜朗</dd>
              </div>

              <div>
                <dt>所在地</dt>
                <dd>岐阜県各務原市川島緑町4-3</dd>
              </div>

              <div>
                <dt>電話番号</dt>
                <dd>
                  090-1473-6021
                  <br />
                  （受付時間：月曜日〜金曜日　9:30〜17:00）
                  <br />
                  <span className="legal-page-note">
                    ※お電話でのお問い合わせは、上記時間帯にて承ります。時間外の場合はメールにてご連絡ください。
                  </span>
                </dd>
              </div>

              <div>
                <dt>メールアドレス</dt>
                <dd>
                  <a href="mailto:bizitems.567@gmail.com">bizitems.567@gmail.com</a>
                </dd>
              </div>

              <div>
                <dt>販売価格</dt>
                <dd>
                  <p className="legal-price-intro">表示価格はいずれも<strong>税込</strong>です。</p>

                  <h2 className="legal-subheading">気づきノート　スタンダードコース</h2>
                  <ul className="legal-list">
                    <li>通常価格：月額 1,650円</li>
                    <li>
                      オープン期間限定価格（2026年12月31日まで）：月額 1,320円
                    </li>
                    <li>年払い（通常）：15,840円／年</li>
                    <li>年払い（オープン期間限定・2026年12月31日まで）：11,760円／年</li>
                  </ul>

                  <h2 className="legal-subheading">気づきノート　プレミアムコース</h2>
                  <ul className="legal-list">
                    <li>通常価格：月額 6,600円</li>
                    <li>
                      オープン期間限定価格（2026年12月31日まで）：月額 3,300円
                    </li>
                    <li>追加コーチングセッション（任意）：6,600円／60分</li>
                  </ul>

                  <h2 className="legal-subheading">7日間プログラム（フリーコース）</h2>
                  <ul className="legal-list">
                    <li>0円（無料）</li>
                  </ul>

                  <p className="legal-page-note">
                    ※オープン期間限定価格の適用条件・終了時期は、申込画面および本ページの記載時点の内容に従います。期間終了後は通常価格が適用されます。
                  </p>
                </dd>
              </div>

              <div>
                <dt>代金の支払時期・方法</dt>
                <dd>
                  <ul className="legal-list">
                    <li>
                      <strong>支払方法</strong>：クレジットカードによるオンライン決済（決済代行：Stripe）
                    </li>
                    <li>
                      <strong>支払時期</strong>：有料プラン（スタンダード／プレミアム）を<strong>初めて</strong>お申し込みいただいた場合、
                      <strong>28日間の無料お試し期間終了日の翌日</strong>より、初回の課金が行われます。
                      2回目以降は、各課金周期（月額または年額）の更新日に自動的に課金されます。
                    </li>
                    <li>
                      既に有料プランをご利用中のコース変更（例：スタンダードからプレミアムへのアップグレード）では、
                      無料お試し期間は付与されず、所定の方法（日割り計算等）により課金されます。
                      解約後の再申し込みについても、無料お試し期間は付与されず、申込完了後に課金が開始されます。
                    </li>
                    <li>フリーコース（0円）のご利用に際して、お支払いは発生しません。</li>
                  </ul>
                </dd>
              </div>

              <div>
                <dt>サービス提供時期</dt>
                <dd>
                  <ul className="legal-list">
                    <li>
                      お申し込み手続き完了後、<strong>直ちに</strong>当サービスの利用を開始いただけます（アカウント有効化後）。
                    </li>
                    <li>
                      スタンダード／プレミアムの初回お申し込み時は、28日間の無料お試し期間中もサービスをご利用いただけます。
                      無料お試し期間終了後、解約手続きがない場合に有料契約として課金が開始されます。
                    </li>
                    <li>
                      無料お試し期間は、有料プラン（スタンダードまたはプレミアム）への<strong>初回申込時に限り</strong>付与します。
                      既に有料プランをご利用中のコース変更（アップグレード・ダウングレード）および再申込には、
                      お試し期間は付与しません。
                    </li>
                  </ul>
                </dd>
              </div>

              <div>
                <dt>解約・キャンセル・返金</dt>
                <dd>
                  <ul className="legal-list">
                    <li>
                      有料プランの解約は、当サービス所定の方法（マイページ等、実装予定の画面）または
                      <a href="mailto:bizitems.567@gmail.com">bizitems.567@gmail.com</a>
                      へのご連絡により、いつでもお申し出いただけます。
                    </li>
                    <li>
                      解約手続き完了後も、<strong>現在の課金期間の終了日（次回更新日の前日まで）</strong>
                      は引き続き有料プランをご利用いただけます。期間終了日以降、有料サービスの提供を終了し、
                      次回以降の課金は行われません。
                    </li>
                    <li>
                      <strong>28日間の無料お試し期間中</strong>に解約された場合、料金は発生しません。
                    </li>
                    <li>
                      有料プランの利用料金は、<strong>法令上返金義務が生じる場合を除き、一切返金いたしません</strong>
                      （日割り計算による返金を含みます）。
                    </li>
                    <li>
                      当社の責に帰すべき事由によりサービスが著しく提供できなかった場合等、当社が相当と認めるときに限り、
                      返金または利用期間の延長等に応じることがあります。
                    </li>
                    <li>
                      本サービスはデジタルコンテンツ・オンライン役務の継続提供です。
                      クーリングオフ（契約解除）に関する事項は、特定商取引法および関連法令の定めに従います。
                      無料お試し期間の提供内容・期間は、申込画面にて事前にご確認ください。
                    </li>
                  </ul>
                </dd>
              </div>

              <div>
                <dt>お支払い不能・決済失敗時</dt>
                <dd>
                  <ul className="legal-list">
                    <li>
                      クレジットカードの有効期限切れ、限度額超過等により、更新時のお支払いが確認できない場合、
                      決済代行 <strong>Stripe</strong> により<strong>自動的に再請求（リトライ）</strong>を行います。
                    </li>
                    <li>
                      お支払い方法の更新が必要な場合、ご登録のメールアドレス宛に
                      <strong> Stripe から通知</strong>が送信されます。速やかにカード情報の更新等をお願いいたします。
                    </li>
                    <li>
                      <strong>再請求期間中</strong>（通常、数週間以内）は、引き続き有料プランをご利用いただけます。
                    </li>
                    <li>
                      再請求期間内にお支払いが完了しない場合、<strong>有料機能の提供を一時停止</strong>し、
                      サブスクリプションを終了することがあります。データの保持期間等は、利用規約および
                      当サービスのデータ保持方針に従います。
                    </li>
                    <li>
                      お支払い方法の更新は、Stripe が提供する所定の画面（Customer Portal 等、実装予定）または
                      <a href="mailto:bizitems.567@gmail.com">bizitems.567@gmail.com</a>
                      へのご連絡によりお申し出ください。
                    </li>
                  </ul>
                </dd>
              </div>

              <div>
                <dt>定期購入（サブスクリプション）について</dt>
                <dd>
                  <ul className="legal-list">
                    <li>
                      気づきノートのスタンダードコース・プレミアムコースは、
                      <strong>月額制または年額制の定期購入（サブスクリプション）</strong>です。
                    </li>
                    <li>
                      契約期間は1ヶ月（月額プラン）または1年（年額プラン）単位です。
                      解約手続きがない限り、同一条件で<strong>自動更新</strong>され、更新日に登録のクレジットカードへ課金されます。
                    </li>
                    <li>
                      次回更新日の前日までに解約手続きを完了した場合、更新日以降の課金は行われません。
                    </li>
                    <li>更新前に、マイページ等で次回更新日および契約内容をご確認いただけます（実装予定）。</li>
                  </ul>
                </dd>
              </div>

              <div>
                <dt>動作環境</dt>
                <dd>
                  本サービスは、次の端末および最新版に近いウェブブラウザでのご利用を推奨します。
                  <ul className="legal-list">
                    <li>パソコン（Windows / macOS 等）</li>
                    <li>スマートフォン（iOS / Android）</li>
                    <li>タブレット</li>
                  </ul>
                  <p className="legal-page-note">
                    ※OS・ブラウザの種類・バージョン、通信環境等により、一部機能が利用できない場合があります。
                  </p>
                </dd>
              </div>
            </dl>

            <p className="legal-page-back">
              <Link href="/">ホームへ戻る</Link>
            </p>
          </div>
        </main>
      </div>

      <ProtoFooter />
    </div>
  );
}

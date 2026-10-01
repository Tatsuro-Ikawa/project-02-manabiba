import Link from 'next/link';
import type { UserProfile } from '@/types/auth';
import { DATA_RETENTION_MSG } from '@/lib/courseSelectionCatalog';
import { DataRetentionBanner } from '@/components/subscription/DataRetentionBanner';

type StartProgramLegacyViewProps = {
  userProfile: UserProfile | null;
  showDowngradeNotice: boolean;
  hadTrial: boolean;
};

/** /start-program 現行 UI（PDF 表紙・ダウンロード案内） */
export default function StartProgramLegacyView({
  userProfile,
  showDowngradeNotice,
  hadTrial,
}: StartProgramLegacyViewProps) {
  return (
    <div className="legal-page-content">
      <DataRetentionBanner userProfile={userProfile} />
      {showDowngradeNotice ? (
        <p className="start-program-downgrade-notice" role="status">
          フリーコースへ変更しました。
          {hadTrial ? ' 28日お試し期間は終了しました。' : null}
          気づきノート（有料機能）はご利用いただけません。{DATA_RETENTION_MSG}
        </p>
      ) : null}
      <h1 className="legal-page-title">7日間スタートプログラム（pdf版提供）</h1>
      <p className="legal-page-lead">
        セルフコーチングによる「自分を変える7日間プログラム」のpdf版を準備しました。
        <br />
        ドキュメントをクリックして表示後、ダウンロードしてお使いください。
      </p>
      <p className="legal-page-lead">
        会員登録時の利用規約・プライバシーポリシーに従って、ご利用ください。
        <br />
        なお、ご自身による再配布はご遠慮願います。
      </p>
      <p className="start-program-pdf-actions">
        <a
          href="/contents/Pub-261001_v1.1.pdf"
          className="start-program-pdf-cover-link"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="7日間スタートプログラム PDFを別タブで開く"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/Pub-261001_v1.1.png"
            alt="7日間スタートプログラム PDF版の表紙"
            className="start-program-pdf-cover"
            width={708}
            height={1024}
          />
        </a>
      </p>
      <p className="legal-page-back">
        <Link href="/">ホームへ戻る</Link>
      </p>

      {userProfile?.enrollment?.primaryCourse === 'start7d' ? (
        <section className="start-program-upgrade" aria-label="気づきノートへのアップグレード">
          <p className="start-program-upgrade-lead">自分を変える気づきノートにトライをしてみる →</p>
          <Link href="/trial_4w/landing" className="start-program-upgrade-cta">
            気づきノートへアップグレード
          </Link>
        </section>
      ) : null}
    </div>
  );
}

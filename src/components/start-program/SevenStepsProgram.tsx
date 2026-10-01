'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/types/auth';
import { DATA_RETENTION_MSG } from '@/lib/courseSelectionCatalog';
import { DataRetentionBanner } from '@/components/subscription/DataRetentionBanner';
import GuidePane from '@/components/start-program/GuidePane';
import StepNavigator from '@/components/start-program/navigators/StepNavigator';
import StepPaneNavigator from '@/components/start-program/navigators/StepPaneNavigator';
import Step00WorksheetPane from '@/components/start-program/step00/Step00WorksheetPane';
import Step01WorksheetPane from '@/components/start-program/step01/Step01WorksheetPane';
import Step02WorksheetPane from '@/components/start-program/step02/Step02WorksheetPane';
import Step03WorksheetPane from '@/components/start-program/step03/Step03WorksheetPane';
import Step04WorksheetPane from '@/components/start-program/step04/Step04WorksheetPane';
import {
  SEVEN_STEPS_PROGRAM_LABEL,
  clampStepIndex,
  defaultPaneForStep,
  getSevenStepsStep,
  stepUrl,
  type StepPane,
} from '@/lib/startProgram/sevenStepsConstants';

type SevenStepsProgramProps = {
  stepIndex: number;
  pane: StepPane;
  userProfile: UserProfile | null;
  showDowngradeNotice: boolean;
  hadTrial: boolean;
};

export default function SevenStepsProgram({
  stepIndex,
  pane,
  userProfile,
  showDowngradeNotice,
  hadTrial,
}: SevenStepsProgramProps) {
  const router = useRouter();
  const safeIndex = clampStepIndex(stepIndex);
  const step = getSevenStepsStep(safeIndex);
  const safePane: StepPane =
    step && step.panes.includes(pane) ? pane : step ? defaultPaneForStep(step) : 'guide';

  const navigate = (url: string) => {
    router.push(url);
  };

  const renderPaneContent = () => {
    if (!step) {
      return <p className="seven-steps-placeholder">ステップが見つかりません。</p>;
    }

    if (safePane === 'guide') {
      if (step.guidePath) {
        return <GuidePane guidePath={step.guidePath} />;
      }
      return (
        <p className="seven-steps-placeholder">
          Step{safeIndex} の説明シートは準備中です。
        </p>
      );
    }

    if (safeIndex === 0) {
      return <Step00WorksheetPane />;
    }
    if (safeIndex === 1) {
      return <Step01WorksheetPane />;
    }
    if (safeIndex === 2) {
      return <Step02WorksheetPane />;
    }
    if (safeIndex === 3) {
      return <Step03WorksheetPane />;
    }
    if (safeIndex === 4) {
      return <Step04WorksheetPane />;
    }
    return (
      <p className="seven-steps-placeholder">
        Step{safeIndex} のワークシートは準備中です。
      </p>
    );
  };

  return (
    <div className="seven-steps-program">
      <DataRetentionBanner userProfile={userProfile} />
      {showDowngradeNotice ? (
        <p className="start-program-downgrade-notice" role="status">
          フリーコースへ変更しました。
          {hadTrial ? ' 28日お試し期間は終了しました。' : null}
          気づきノート（有料機能）はご利用いただけません。{DATA_RETENTION_MSG}
        </p>
      ) : null}

      <div className="seven-steps-program-tab" role="tablist" aria-label="スタートプログラム">
        <span className="seven-steps-program-tab-active" role="tab" aria-selected>
          {SEVEN_STEPS_PROGRAM_LABEL}
        </span>
      </div>

      <div className="seven-steps-program-card">
        <StepNavigator stepIndex={safeIndex} onNavigate={navigate} />

        <header className="seven-steps-step-header">
          <StepPaneNavigator
            stepIndex={safeIndex}
            pane={safePane}
            onNavigate={navigate}
            className="seven-steps-pane-nav--header"
          />
        </header>

        <div className="seven-steps-step-content">{renderPaneContent()}</div>

        <StepPaneNavigator
          stepIndex={safeIndex}
          pane={safePane}
          onNavigate={navigate}
          className="seven-steps-pane-nav--footer"
        />
      </div>

      {userProfile?.enrollment?.primaryCourse === 'start7d' ? (
        <section className="start-program-upgrade" aria-label="気づきノートへのアップグレード">
          <p className="start-program-upgrade-lead">自分を変える気づきノートにトライをしてみる →</p>
          <Link href="/trial_4w/landing" className="start-program-upgrade-cta">
            気づきノートへアップグレード
          </Link>
        </section>
      ) : null}

      <p className="legal-page-back">
        <Link href="/">ホームへ戻る</Link>
      </p>
    </div>
  );
}

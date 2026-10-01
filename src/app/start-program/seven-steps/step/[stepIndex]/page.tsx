'use client';

import { use, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isStartProgramRefreshEnabled } from '@/lib/featureFlags';
import { useAuth } from '@/hooks/useAuth';
import StartProgramPageShell, {
  useStartProgramNoticeFlags,
} from '@/components/start-program/StartProgramPageShell';
import SevenStepsProgram from '@/components/start-program/SevenStepsProgram';
import {
  clampStepIndex,
  defaultPaneForStep,
  getSevenStepsStep,
  stepUrl,
  type StepPane,
} from '@/lib/startProgram/sevenStepsConstants';

type PageProps = {
  params: Promise<{ stepIndex: string }>;
};

function SevenStepsStepPageInner({ stepIndexRaw }: { stepIndexRaw: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile } = useAuth();
  const { showDowngradeNotice, hadTrial } = useStartProgramNoticeFlags();
  const refreshEnabled = isStartProgramRefreshEnabled();

  const stepIndex = useMemo(() => {
    const n = Number.parseInt(stepIndexRaw, 10);
    return Number.isFinite(n) ? clampStepIndex(n) : 0;
  }, [stepIndexRaw]);

  const paneParam = searchParams.get('pane');
  const pane: StepPane = paneParam === 'worksheet' ? 'worksheet' : 'guide';
  const step = getSevenStepsStep(stepIndex);
  const validPane = step && step.panes.includes(pane) ? pane : step ? defaultPaneForStep(step) : 'guide';
  const needsPaneFix = step && validPane !== pane;
  const invalidStep = !step;

  useEffect(() => {
    if (!refreshEnabled) {
      router.replace('/start-program');
      return;
    }
    if (invalidStep) {
      router.replace(stepUrl(0, 'guide'));
      return;
    }
    if (needsPaneFix) {
      router.replace(stepUrl(stepIndex, validPane));
    }
  }, [refreshEnabled, invalidStep, needsPaneFix, router, stepIndex, validPane]);

  if (!refreshEnabled || invalidStep || needsPaneFix || !step) {
    return (
      <p className="legal-page-placeholder" style={{ textAlign: 'center' }}>
        読み込み中...
      </p>
    );
  }

  return (
    <SevenStepsProgram
      stepIndex={stepIndex}
      pane={validPane}
      userProfile={userProfile}
      showDowngradeNotice={showDowngradeNotice}
      hadTrial={hadTrial}
    />
  );
}

export default function SevenStepsStepPage({ params }: PageProps) {
  const { stepIndex } = use(params);
  return (
    <StartProgramPageShell>
      <SevenStepsStepPageInner stepIndexRaw={stepIndex} />
    </StartProgramPageShell>
  );
}

'use client';

import {
  clampStepIndex,
  defaultPaneForStep,
  getSevenStepsStep,
  stepUrl,
  type StepPane,
} from '@/lib/startProgram/sevenStepsConstants';

type StepPaneNavigatorProps = {
  stepIndex: number;
  pane: StepPane;
  onNavigate: (url: string) => void;
  className?: string;
};

/** 説明 ↔ ワークシート、および Step 間の前後移動 */
export default function StepPaneNavigator({
  stepIndex,
  pane,
  onNavigate,
  className = '',
}: StepPaneNavigatorProps) {
  const safeIndex = clampStepIndex(stepIndex);
  const step = getSevenStepsStep(safeIndex);
  if (!step) return null;

  const hasGuide = step.panes.includes('guide');
  const hasWorksheet = step.panes.includes('worksheet');
  const atFirstStep = safeIndex <= 0;
  const atLastStep = safeIndex >= 7;

  let backDisabled = false;
  let nextDisabled = false;
  let backAction = () => {};
  let nextAction = () => {};

  if (pane === 'guide') {
    if (atFirstStep) {
      backDisabled = true;
    } else {
      const prev = getSevenStepsStep(safeIndex - 1);
      backAction = () => {
        if (!prev) return;
        onNavigate(stepUrl(safeIndex - 1, prev.panes.includes('worksheet') ? 'worksheet' : defaultPaneForStep(prev)));
      };
    }
    if (hasWorksheet) {
      nextAction = () => onNavigate(stepUrl(safeIndex, 'worksheet'));
    } else if (!atLastStep) {
      const next = getSevenStepsStep(safeIndex + 1);
      nextAction = () => {
        if (!next) return;
        onNavigate(stepUrl(safeIndex + 1, defaultPaneForStep(next)));
      };
    } else {
      nextDisabled = true;
    }
  } else {
    backAction = () => {
      if (hasGuide) {
        onNavigate(stepUrl(safeIndex, 'guide'));
      } else if (!atFirstStep) {
        const prev = getSevenStepsStep(safeIndex - 1);
        if (prev) onNavigate(stepUrl(safeIndex - 1, defaultPaneForStep(prev)));
      }
    };
    backDisabled = !hasGuide && atFirstStep;

    if (!atLastStep) {
      const next = getSevenStepsStep(safeIndex + 1);
      nextAction = () => {
        if (!next) return;
        onNavigate(stepUrl(safeIndex + 1, defaultPaneForStep(next)));
      };
    } else {
      nextDisabled = true;
    }
  }

  return (
    <div className={`seven-steps-pane-nav ${className}`.trim()}>
      <button
        type="button"
        className="seven-steps-pane-nav-btn"
        disabled={backDisabled}
        onClick={backAction}
      >
        <span className="material-symbols-outlined" aria-hidden>
          chevron_left
        </span>
        <span>戻る</span>
      </button>
      <button
        type="button"
        className="seven-steps-pane-nav-btn"
        disabled={nextDisabled}
        onClick={nextAction}
      >
        <span>次へ</span>
        <span className="material-symbols-outlined" aria-hidden>
          chevron_right
        </span>
      </button>
    </div>
  );
}

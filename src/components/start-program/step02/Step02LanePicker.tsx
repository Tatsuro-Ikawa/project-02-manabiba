'use client';

import { STEP02_LANES, type Step02Lane } from '@/lib/startProgram/step02Constants';

type DigProgress = {
  done: number;
  total: number;
};

type Step02LanePickerProps = {
  activeLane: Step02Lane | null;
  onSelect: (lane: Step02Lane) => void;
  interest: DigProgress;
  values: DigProgress;
  strength: DigProgress;
};

function badgeFor(progress: DigProgress): { text: string; done: boolean } | null {
  if (progress.total <= 0) return null;
  return {
    text: `${progress.done}/${progress.total}`,
    done: progress.done >= progress.total,
  };
}

export default function Step02LanePicker({
  activeLane,
  onSelect,
  interest,
  values,
  strength,
}: Step02LanePickerProps) {
  return (
    <div className="step02-lane-picker" role="group" aria-label="カテゴリ選択">
      <p className="step02-lane-picker-lead">
        下のボタンを選択して3つのカテゴリーを整理してみましょう。
      </p>
      <div className="step02-lane-cards">
        {STEP02_LANES.map((lane) => {
          const isActive = activeLane === lane.id;
          const progress =
            lane.id === 'interest'
              ? interest
              : lane.id === 'values'
                ? values
                : strength;
          const badge = lane.available ? badgeFor(progress) : null;
          return (
            <button
              key={lane.id}
              type="button"
              className={`step02-lane-card${isActive ? ' is-active' : ''}${
                !lane.available ? ' is-disabled' : ''
              }`}
              onClick={() => onSelect(lane.id)}
              aria-pressed={isActive}
              aria-disabled={!lane.available}
              title={
                badge
                  ? `掘り下げ進捗（願望）: ${badge.text}`
                  : undefined
              }
            >
              <span className="step02-lane-card-illust">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lane.illustration}
                  alt=""
                  className="step02-lane-card-img"
                  width={160}
                  height={160}
                />
              </span>
              <span className="step02-lane-card-label">{lane.label}</span>
              {!lane.available ? (
                <span className="step02-lane-card-soon">準備中</span>
              ) : badge ? (
                <span
                  className={`step02-lane-card-badge${badge.done ? ' is-done' : ''}`}
                >
                  {badge.text}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** スタートプログラム関連のアプリ設定（localStorage） */

import {
  STEP03_CANDIDATE_MAX_DEFAULT,
  STEP03_CANDIDATE_MAX_MAX,
  STEP03_CANDIDATE_MAX_MIN,
} from '@/lib/startProgram/step03Constants';
import {
  STEP04_REASON_LIMIT_CEIL,
  STEP04_REASON_LIMIT_FLOOR,
  STEP04_REASON_MAX_DEFAULT,
  STEP04_REASON_MIN_DEFAULT,
} from '@/lib/startProgram/step04Constants';

export const START_PROGRAM_SETTINGS_STORAGE_KEY =
  'startProgram.appSettings.v1';

export const START_PROGRAM_SETTINGS_CHANGED_EVENT = 'startProgramAppSettingsChanged';

export type StartProgramAppSettings = {
  /** Step3 取組領域の候補選択上限（1〜8、既定 4） */
  step03CandidateMax: number;
  /** Step4 満足度の理由の下限（1〜20、既定 3） */
  step04ReasonMin: number;
  /** Step4 満足度の理由の上限（1〜20、既定 10。下限以上） */
  step04ReasonMax: number;
  /** 気づきノート朝・晩：入力中に記入日をポップアップ表示する（既定 false） */
  journalDatePopup: boolean;
};

export function defaultStartProgramAppSettings(): StartProgramAppSettings {
  return {
    step03CandidateMax: STEP03_CANDIDATE_MAX_DEFAULT,
    step04ReasonMin: STEP04_REASON_MIN_DEFAULT,
    step04ReasonMax: STEP04_REASON_MAX_DEFAULT,
    journalDatePopup: false,
  };
}

export function isValidStep03CandidateMax(n: unknown): n is number {
  return (
    typeof n === 'number' &&
    Number.isInteger(n) &&
    n >= STEP03_CANDIDATE_MAX_MIN &&
    n <= STEP03_CANDIDATE_MAX_MAX
  );
}

function clampInt(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function clampStep03CandidateMax(n: number): number {
  return clampInt(n, STEP03_CANDIDATE_MAX_MIN, STEP03_CANDIDATE_MAX_MAX, STEP03_CANDIDATE_MAX_DEFAULT);
}

/** 下限・上限を範囲内に収め、上限 < 下限なら上限を下限に揃える */
export function normalizeStep04ReasonLimits(min: number, max: number): { min: number; max: number } {
  const nMin = clampInt(min, STEP04_REASON_LIMIT_FLOOR, STEP04_REASON_LIMIT_CEIL, STEP04_REASON_MIN_DEFAULT);
  const nMax = clampInt(max, STEP04_REASON_LIMIT_FLOOR, STEP04_REASON_LIMIT_CEIL, STEP04_REASON_MAX_DEFAULT);
  return { min: nMin, max: Math.max(nMin, nMax) };
}

function normalizeSettings(raw: Partial<Record<keyof StartProgramAppSettings, unknown>>): StartProgramAppSettings {
  const d = defaultStartProgramAppSettings();
  const limits = normalizeStep04ReasonLimits(
    typeof raw.step04ReasonMin === 'number' ? raw.step04ReasonMin : d.step04ReasonMin,
    typeof raw.step04ReasonMax === 'number' ? raw.step04ReasonMax : d.step04ReasonMax
  );
  return {
    step03CandidateMax:
      typeof raw.step03CandidateMax === 'number'
        ? clampStep03CandidateMax(raw.step03CandidateMax)
        : d.step03CandidateMax,
    step04ReasonMin: limits.min,
    step04ReasonMax: limits.max,
    journalDatePopup:
      typeof raw.journalDatePopup === 'boolean' ? raw.journalDatePopup : d.journalDatePopup,
  };
}

export function readStartProgramAppSettings(): StartProgramAppSettings {
  if (typeof window === 'undefined') return defaultStartProgramAppSettings();
  try {
    const raw = window.localStorage.getItem(START_PROGRAM_SETTINGS_STORAGE_KEY);
    if (!raw) return defaultStartProgramAppSettings();
    return normalizeSettings(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return defaultStartProgramAppSettings();
  }
}

export function writeStartProgramAppSettings(
  patch: Partial<StartProgramAppSettings>
): StartProgramAppSettings {
  const next = normalizeSettings({ ...readStartProgramAppSettings(), ...patch });
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        START_PROGRAM_SETTINGS_STORAGE_KEY,
        JSON.stringify(next)
      );
      window.dispatchEvent(
        new CustomEvent(START_PROGRAM_SETTINGS_CHANGED_EVENT, { detail: next })
      );
    } catch {
      /* ignore quota */
    }
  }
  return next;
}

export function readStep03CandidateMax(): number {
  return readStartProgramAppSettings().step03CandidateMax;
}

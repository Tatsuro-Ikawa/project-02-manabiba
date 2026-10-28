/**
 * スタートプログラムの利用条件（モック）。
 * 本番では users/{uid}.startProgramStartedAt / startProgramFreeEndsAt と plan で判定する（14 §3.3）。
 */

export const ACCESS_MOCK_STORAGE_KEY = 'startProgram.access.mock';
export const ACCESS_MOCK_CHANGED_EVENT = 'startProgram.access.mock.changed';

/** Step5 以降の無料日数（開始日を 1 日目として数える） */
export const START_PROGRAM_FREE_DAYS = 28;
/** 残り日数の表示を始める日数 */
export const START_PROGRAM_NOTICE_DAYS = 7;
/** 申込しなかった人のデータを残す日数（最終ログインから） */
export const START_PROGRAM_RETENTION_DAYS = 90;

export type AccessPlan = 'free' | 'standard';

export type AccessMockState = {
  startedAt: number;
  plan: AccessPlan;
  step05NoticeSeenAt: number | null;
};

export type AccessStatus = 'free' | 'expired' | 'paid';

export type StartProgramAccess = {
  status: AccessStatus;
  /** 今日を含めた残り日数（期限後は 0） */
  remainingDays: number;
  freeEndsAt: number;
};

export type AccessScenario = 'free20' | 'free3' | 'expired' | 'standard';

export const ACCESS_SCENARIOS: { id: AccessScenario; label: string }[] = [
  { id: 'free20', label: '無料期間中（残り20日）' },
  { id: 'free3', label: '残り3日' },
  { id: 'expired', label: '期限後' },
  { id: 'standard', label: 'スタンダード' },
];

const DAY_MS = 86_400_000;
const JST_OFFSET_MS = 9 * 3_600_000;

const jstDayIndex = (ms: number) => Math.floor((ms + JST_OFFSET_MS) / DAY_MS);
const jstDayEnd = (day: number) => (day + 1) * DAY_MS - JST_OFFSET_MS - 1;
const jstDayStart = (day: number) => day * DAY_MS - JST_OFFSET_MS;

export function resolveAccess(state: AccessMockState, now = Date.now()): StartProgramAccess {
  const endDay = jstDayIndex(state.startedAt) + START_PROGRAM_FREE_DAYS - 1;
  const freeEndsAt = jstDayEnd(endDay);
  const remainingDays = Math.max(0, endDay - jstDayIndex(now) + 1);
  if (state.plan === 'standard') return { status: 'paid', remainingDays, freeEndsAt };
  return {
    status: remainingDays > 0 ? 'free' : 'expired',
    remainingDays,
    freeEndsAt,
  };
}

export function formatJstDate(ms: number): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'long',
    day: 'numeric',
  }).format(ms);
}

const newState = (): AccessMockState => ({
  startedAt: Date.now(),
  plan: 'free',
  step05NoticeSeenAt: null,
});

export function readAccessMock(): AccessMockState {
  try {
    const raw = window.localStorage.getItem(ACCESS_MOCK_STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<AccessMockState>;
      if (typeof v.startedAt === 'number') {
        return {
          startedAt: v.startedAt,
          plan: v.plan === 'standard' ? 'standard' : 'free',
          step05NoticeSeenAt: typeof v.step05NoticeSeenAt === 'number' ? v.step05NoticeSeenAt : null,
        };
      }
    }
  } catch {
    /* 壊れていれば作り直す */
  }
  const state = newState();
  writeAccessMock(state);
  return state;
}

export function writeAccessMock(state: AccessMockState): AccessMockState {
  window.localStorage.setItem(ACCESS_MOCK_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(ACCESS_MOCK_CHANGED_EVENT));
  return state;
}

/** 残り日数が指定どおりになる開始日を作る */
export function scenarioState(scenario: AccessScenario, current: AccessMockState, now = Date.now()): AccessMockState {
  const startFor = (remaining: number) =>
    jstDayStart(jstDayIndex(now) - (START_PROGRAM_FREE_DAYS - remaining)) + 10 * 3_600_000;
  switch (scenario) {
    case 'free20':
      return {
        ...current,
        plan: 'free',
        startedAt: startFor(20),
        step05NoticeSeenAt: null,
      };
    case 'free3':
      return { ...current, plan: 'free', startedAt: startFor(3) };
    case 'expired':
      return { ...current, plan: 'free', startedAt: startFor(-2) };
    case 'standard':
      return { ...current, plan: 'standard' };
  }
}

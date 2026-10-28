/**
 * Step5 後半 — AI-5〜7（モックはダミー応答）
 * 本番 AI に差し替えるときは、同じ関数シグネチャのまま中身を置き換える。
 */

import type { LayerKey } from '@/lib/startProgram/step04Constants';
import { readDummyRefs, type Step05Context } from '@/lib/startProgram/step05Context';
import { filledItems, type Step05Theme } from '@/lib/startProgram/step05Constants';
import {
  STAGES,
  focusItemIds,
  type GapDrafts,
  type MarkerDrafts,
  type MarkerSuggestion,
  type MilestoneDrafts,
  type StageKind,
  type Step05Marker,
} from '@/lib/startProgram/step05PlanConstants';

function wait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));
}

function stripEnd(s: string): string {
  return s.trim().replace(/[。．.]+$/, '');
}

function short(s: string, max = 18): string {
  const chars = [...stripEnd(s)];
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : chars.join('');
}

function personaRefs(ctx: Step05Context) {
  const refs = readDummyRefs();
  return refs.domainId === ctx.domainId ? refs : {};
}

/* ===== AI-5 違いの下書き ===== */

export async function generateGapDrafts(ctx: Step05Context, theme: Step05Theme): Promise<GapDrafts> {
  await wait();
  return buildGapDrafts(ctx, theme);
}

export function buildGapDrafts(ctx: Step05Context, theme: Step05Theme): GapDrafts {
  const persona = personaRefs(ctx).gaps ?? {};
  const out: GapDrafts = {};
  for (const item of filledItems(theme)) {
    const hit = persona[item.target.trim()];
    const now = stripEnd(item.current).replace(/^今は、?/, '');
    out[item.id] =
      hit ?? (now ? `${short(now, 24)}ため、「${short(item.target)}」までの一歩がまだ踏み出せていない` : '');
  }
  return out;
}

/* ===== AI-6 しるしの候補 ===== */

function genericMarkers(layer: LayerKey, target: string): MarkerSuggestion[] {
  const t = short(target);
  if (layer === 'have') {
    return [
      {
        role: 'arrival',
        label: `「${t}」への自信`,
        kind: 'scale10',
        unit: '',
        baseline: '3',
        target: '7',
        cadence: 'monthly',
      },
      {
        role: 'arrival',
        label: `${t}がそろったか`,
        kind: 'yesno',
        unit: '',
        baseline: 'no',
        target: 'yes',
        cadence: 'monthly',
      },
      {
        role: 'response',
        label: 'まわりからのひとこと',
        kind: 'words',
        unit: '',
        baseline: 'まだ何も言われていない',
        target: '「変わったね」と言われる',
        cadence: 'monthly',
      },
    ];
  }
  if (layer === 'do') {
    return [
      {
        role: 'arrival',
        label: `「${t}」をやれた回数`,
        kind: 'count',
        unit: '回',
        baseline: '0',
        target: '3',
        cadence: 'weekly',
      },
      {
        role: 'response',
        label: '行動の手応え',
        kind: 'scale10',
        unit: '',
        baseline: '3',
        target: '7',
        cadence: 'weekly',
      },
      {
        role: 'arrival',
        label: `${t}が習慣になったか`,
        kind: 'yesno',
        unit: '',
        baseline: 'no',
        target: 'yes',
        cadence: 'monthly',
      },
    ];
  }
  return [
    {
      role: 'arrival',
      label: `「${t}」と思えた度`,
      kind: 'scale10',
      unit: '',
      baseline: '3',
      target: '7',
      cadence: 'weekly',
    },
    {
      role: 'response',
      label: 'そう思えた日（週あたり）',
      kind: 'count',
      unit: '日',
      baseline: '0',
      target: '4',
      cadence: 'weekly',
    },
    {
      role: 'response',
      label: '自分にかけたことば',
      kind: 'words',
      unit: '',
      baseline: '「どうせ無理」と言っている',
      target: '「試してみよう」と言える',
      cadence: 'monthly',
    },
  ];
}

export async function generateMarkerDrafts(ctx: Step05Context, theme: Step05Theme, variant = 0): Promise<MarkerDrafts> {
  await wait();
  return buildMarkerDrafts(ctx, theme, variant);
}

export function buildMarkerDrafts(ctx: Step05Context, theme: Step05Theme, variant = 0): MarkerDrafts {
  const persona = personaRefs(ctx).markers ?? {};
  const out: MarkerDrafts = {};
  for (const id of focusItemIds(theme)) {
    const item = theme.items.find((i) => i.id === id);
    if (!item) continue;
    const own = persona[item.layer] ?? [];
    const seen = new Set<string>();
    const pool = [...own, ...genericMarkers(item.layer, item.target)].filter((m) =>
      seen.has(m.label) ? false : (seen.add(m.label), true)
    );
    const shift = pool.length > 0 ? variant % pool.length : 0;
    out[id] = [...pool.slice(shift), ...pool.slice(0, shift)].slice(0, 3);
  }
  return out;
}

/* ===== AI-7 節目の姿とブレーキの目印 ===== */

const STAGE_RATIO: Record<StageKind, number> = { settle: 0.25, expand: 0.6, root: 1 };

/** 今の値 → 目指す値の間で、段階ごとの期待値を置く */
export function expectedValue(m: Step05Marker, kind: StageKind): string {
  if (m.kind === 'count' || m.kind === 'scale10') {
    const from = Number(m.baseline);
    const to = Number(m.target);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return '';
    return String(Math.round(from + (to - from) * STAGE_RATIO[kind]));
  }
  if (m.kind === 'yesno') return kind === 'root' ? 'yes' : 'no';
  return kind === 'root' ? m.target : '';
}

function genericMilestone(kind: StageKind, theme: Step05Theme): string {
  const goal = stripEnd(theme.goal.statement);
  if (kind === 'settle') return '小さな行動が続き、「やれた」と言える週が増えている';
  if (kind === 'expand') return '行動の量や質が上がり、手応えのしるしが動き始めている';
  return goal ? `「${short(goal, 30)}」に近づき、無理なく続けられている` : '到達のしるしに届き、無理なく続けられている';
}

export async function generateMilestoneDrafts(ctx: Step05Context, theme: Step05Theme): Promise<MilestoneDrafts> {
  await wait();
  return buildMilestoneDrafts(ctx, theme);
}

export function buildMilestoneDrafts(ctx: Step05Context, theme: Step05Theme): MilestoneDrafts {
  const refs = personaRefs(ctx);
  const milestones = {} as MilestoneDrafts['milestones'];
  for (const s of STAGES) {
    const expected: Record<string, string> = {};
    for (const m of theme.plan.markers) expected[m.id] = expectedValue(m, s.kind);
    milestones[s.kind] = { text: refs.milestones?.[s.kind] ?? genericMilestone(s.kind, theme), expected };
  }
  const brakes = ctx.insights.flatMap((ins) =>
    ins.scenes.map((scene) => {
      const hit = refs.brakes?.[scene];
      return {
        reasonId: ins.reasonId,
        scene,
        stageKind: hit?.stageKind ?? ('expand' as StageKind),
        note: hit?.note ?? `「${short(scene)}」に近い場面が来る前`,
      };
    })
  );
  return { milestones, brakes };
}

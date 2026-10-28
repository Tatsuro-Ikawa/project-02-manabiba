/** Step5「望む姿」設定の参考例。具体例（裕子さん・康太さん）の入力を、方向ごとに読む */

import {
  getLayerOption,
  isActionableChangeability,
  type Changeability,
  type LayerKey,
  type LayerTagId,
} from '@/lib/startProgram/step04Constants';
import { ENTRY_QUESTIONS } from '@/lib/startProgram/step05Constants';
import { STEP05_DUMMY_PERSONAS } from '@/lib/startProgram/step05Dummy';

export type Step05ExamplePoint = {
  tagId: LayerTagId;
  question: string;
  answer: string;
};

export type Step05ExampleIssue = {
  text: string;
  points: Step05ExamplePoint[];
};

export type Step05ExamplePersona = {
  id: string;
  name: string;
  issuesByLayer: Record<LayerKey, Step05ExampleIssue[]>;
};

const LAYERS: LayerKey[] = ['have', 'do', 'be'];
const CHANGEABILITY: Changeability[] = ['can_change', 'can_influence', 'hard_now', 'unsure'];

type RawReason = {
  text: string;
  changeability: Changeability | null;
  tags: Partial<Record<LayerKey, LayerTagId[]>>;
};

type RawItem = { layer: LayerKey; sourceTagId: LayerTagId; target: string };

function asChangeability(v: unknown): Changeability | null {
  return typeof v === 'string' && CHANGEABILITY.includes(v as Changeability) ? (v as Changeability) : null;
}

function asLayer(v: unknown): LayerKey | null {
  return v === 'have' || v === 'do' || v === 'be' ? v : null;
}

function asTag(layer: LayerKey, v: unknown): LayerTagId | null {
  if (typeof v !== 'string') return null;
  const hit = getLayerOption(v as LayerTagId);
  return hit && hit.layer.key === layer ? (v as LayerTagId) : null;
}

/** モーダルの問い。満足度が目標に届いた時点の姿として読む */
export function questionAtTarget(tagId: LayerTagId): string {
  return `その時は${ENTRY_QUESTIONS[tagId]}`;
}

function readReasons(raw: unknown): RawReason[] {
  const reasons = Array.isArray(raw) ? raw : [];
  return reasons.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as { text?: unknown; changeability?: unknown; tags?: unknown };
    if (typeof row.text !== 'string' || !row.text.trim()) return [];
    const tags: Partial<Record<LayerKey, LayerTagId[]>> = {};
    const tagRaw = row.tags && typeof row.tags === 'object' ? (row.tags as Record<string, unknown>) : {};
    for (const layer of LAYERS) {
      const list = Array.isArray(tagRaw[layer]) ? tagRaw[layer] : [];
      tags[layer] = list.flatMap((id) => {
        const tag = asTag(layer, id);
        return tag ? [tag] : [];
      });
    }
    return [{ text: row.text.trim(), changeability: asChangeability(row.changeability), tags }];
  });
}

function readItems(raw: unknown): RawItem[] {
  const items = Array.isArray(raw) ? raw : [];
  return items.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as { layer?: unknown; sourceTagId?: unknown; target?: unknown };
    const layer = asLayer(row.layer);
    if (!layer) return [];
    const tag = asTag(layer, row.sourceTagId);
    if (!tag || typeof row.target !== 'string' || !row.target.trim()) return [];
    return [{ layer, sourceTagId: tag, target: row.target.trim() }];
  });
}

function issuesFor(reasons: RawReason[], items: RawItem[]): Record<LayerKey, Step05ExampleIssue[]> {
  const used = new Set<number>();
  const actionable = reasons.filter((reason) => isActionableChangeability(reason.changeability));
  const out = { have: [], do: [], be: [] } as Record<LayerKey, Step05ExampleIssue[]>;
  for (const layer of LAYERS) {
    for (const reason of actionable) {
      const points = (reason.tags[layer] ?? []).flatMap((tagId) => {
        const index = items.findIndex(
          (item, i) => !used.has(i) && item.layer === layer && item.sourceTagId === tagId
        );
        if (index < 0) return [];
        used.add(index);
        return [{ tagId, question: questionAtTarget(tagId), answer: items[index].target }];
      });
      if (points.length > 0) out[layer].push({ text: reason.text, points });
    }
  }
  return out;
}

async function loadPersona(id: string, path: string): Promise<Step05ExamplePersona> {
  const res = await fetch(path, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`example fetch failed: ${path}`);
  const file = (await res.json()) as {
    persona?: { name?: string };
    step04Source?: string;
    step05?: { items?: unknown };
  };
  const source = typeof file.step04Source === 'string' ? file.step04Source : '';
  const step04Res = await fetch(source, { cache: 'force-cache' });
  if (!step04Res.ok) throw new Error(`example step04 fetch failed: ${source}`);
  const step04File = (await step04Res.json()) as { step04?: { reasons?: unknown } };
  const name = typeof file.persona?.name === 'string' && file.persona.name.trim() ? file.persona.name.trim() : id;
  return {
    id,
    name,
    issuesByLayer: issuesFor(readReasons(step04File.step04?.reasons), readItems(file.step05?.items)),
  };
}

let cache: Promise<Step05ExamplePersona[]> | null = null;

/** 具体例の2人。後半用の読み込みは含めない */
export function loadStep05Examples(): Promise<Step05ExamplePersona[]> {
  if (!cache) {
    const personas = STEP05_DUMMY_PERSONAS.filter((persona) => !persona.withPlan);
    cache = Promise.all(personas.map((persona) => loadPersona(persona.id, persona.path))).catch((error) => {
      cache = null;
      throw error;
    });
  }
  return cache;
}

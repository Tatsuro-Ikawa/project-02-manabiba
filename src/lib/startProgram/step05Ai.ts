/**
 * Step5 前半 — AI 呼び出し（モックはダミー応答）
 * 本番 AI に差し替えるときは、同じ関数シグネチャのまま中身を置き換える。
 */

import type { LayerKey, LayerTagId } from '@/lib/startProgram/step04Constants';
import { readDummyRefs, type Step05Context } from '@/lib/startProgram/step05Context';
import {
  FIT_QUESTIONS,
  filledItems,
  getStep05Layer,
  itemsOf,
  toHaveContent,
  type CurrentDrafts,
  type FitAdvice,
  type FitKey,
  type LayerCandidates,
  type Step05Theme,
} from '@/lib/startProgram/step05Constants';

function wait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));
}

const CANDIDATE_COUNT = 6;

/** タグごとの基本候補（ダミー AI・AI 失敗時に使用） */
const TAG_CANDIDATES: Partial<Record<LayerTagId, string[]>> = {
  have_resource: ['自分のために使える時間が、週に数時間ある', '挑戦に使えるお金の余裕がある'],
  have_skill: ['自信を持って話せる経験や実績がある', '必要な知識を学び、使える状態になっている'],
  have_support: ['相談できる仲間や、応援してくれる人がいる', '家族の理解と協力がある'],
  have_vitality: ['心と体に余裕があり、疲れをためていない', 'ぐっすり眠れて、朝から元気に動ける'],
  have_context: ['自分の力を試せる場や機会がある', '自分らしく過ごせる環境がある'],
  do_habit: ['毎日少しずつ、続けられる習慣がある', '気になったことを、まず小さく試している'],
  do_plan: ['自分の時間を先に予定に入れている', '優先順位を決めて、無理なく段取りしている'],
  do_relate: ['困ったときに、早めに人に相談している', '自分の気持ちや希望を言葉にして伝えている'],
  do_decide: ['大事なことを自分の基準で選んでいる', 'やらないことを決めて、手放している'],
  do_improve: ['うまくいかなくても、やり方を変えて試している', '小さな挑戦をふり返り、次に活かしている'],
  be_self: ['自分の経験に価値があると感じている', '今の自分にもできることがあると思えている'],
  be_relation: ['頼ることは迷惑ではなく、信頼だと思えている', '人の期待と自分の思いを分けて考えられている'],
  be_outcome: ['「失敗しても試してみればいい」と思えている', '完璧でなくても、やってみたこと自体を認められる'],
  be_compare: ['人と比べず、自分の歩幅で進めばいいと思えている', '評価は自分の一部であって、すべてではないと思えている'],
  be_should: ['不安があっても、小さく動けば大丈夫と思えている', '「こうあるべき」より「どうしたいか」で考えられている'],
};

const LAYER_FALLBACK: LayerCandidates = {
  have: ['目標に必要な知識や経験を身につけている', '応援してくれる人とのつながりがある'],
  do: ['目標に向けて、毎週少しずつ行動している', '気づいたことを記録し、ふり返っている'],
  be: ['今の自分を認めながら、前に進めていると感じている', '自分の気持ちを大切にできている'],
};

function rotate(list: string[], variant: number): string[] {
  if (variant <= 0 || list.length === 0) return list;
  const shift = variant % list.length;
  return [...list.slice(shift), ...list.slice(0, shift)];
}

function uniq(list: string[]): string[] {
  return [...new Set(list.map((s) => s.trim()).filter(Boolean))];
}

export function baseLayerCandidates(ctx: Step05Context, variant = 0): LayerCandidates {
  const refs = readDummyRefs();
  const persona = refs.domainId === ctx.domainId ? refs.candidates ?? {} : {};
  const build = (layer: LayerKey) => {
    const fromTags = ctx.tagEntries[layer].flatMap((e) =>
      e.tagId.endsWith('_other') ? [`${e.label}ができている`] : TAG_CANDIDATES[e.tagId] ?? []
    );
    const pool = uniq([...(persona[layer] ?? []), ...fromTags, ...LAYER_FALLBACK[layer]]);
    return rotate(pool, variant).slice(0, CANDIDATE_COUNT);
  };
  return { have: build('have'), do: build('do'), be: build('be') };
}

export function suggestTagAnswers(tagId: LayerTagId, variant = 0): string[] {
  const layer = tagId.startsWith('do_') ? 'do' : tagId.startsWith('be_') ? 'be' : 'have';
  const pool = uniq([...(TAG_CANDIDATES[tagId] ?? []), ...LAYER_FALLBACK[layer]]);
  return rotate(pool, variant).slice(0, 3);
}
export async function generateLayerCandidates(ctx: Step05Context, variant = 0): Promise<LayerCandidates> {
  await wait();
  return baseLayerCandidates(ctx, variant);
}

function firstTarget(theme: Step05Theme, layer: LayerKey): string {
  return itemsOf(theme, layer).find((i) => i.target.trim())?.target.trim() ?? '';
}

function stripEnd(s: string): string {
  return s.trim().replace(/[。．.]+$/, '');
}

/** AI-2：持ち方の内容 → 「している／もっている」の候補 3案 */
export async function generateGoalStatements(
  ctx: Step05Context,
  theme: Step05Theme,
  variant = 0
): Promise<string[]> {
  await wait();
  return buildGoalStatements(ctx, theme, variant);
}

export function buildGoalStatements(ctx: Step05Context, theme: Step05Theme, variant = 0): string[] {
  const refs = readDummyRefs();
  const persona = refs.domainId === ctx.domainId ? refs.goals ?? [] : [];
  const fromHave = itemsOf(theme, 'have')
    .map((item) => toHaveContent(item.target))
    .filter(Boolean);
  const fallback = [`${ctx.domainLabel}で必要なことを身につけている`];
  return rotate(uniq([...persona.map(toHaveContent), ...fromHave, ...fallback]), variant).slice(0, 3);
}

const SELF_PREDICATE = /(に興味がある|に関心がある|が好きだ?|を大切にしている|を大事にしている|が得意だ?|ができる)$/;

/** Step2 の文「私は、〇〇に興味がある。だから…」から、〇〇の部分を取り出す */
function selfPhrase(sentence: string): string {
  const head = sentence.replace(/^私は、/, '').split('。')[0] ?? sentence;
  const phrase = head.replace(SELF_PREDICATE, '');
  const chars = [...phrase];
  return chars.length > 24 ? `${chars.slice(0, 24).join('')}…` : phrase;
}

const FIT_LAYER: Record<FitKey, LayerKey> = { interest: 'do', values: 'be', strength: 'have' };

/** AI-3：目標＋Step2 の文 → 自分らしさの見立てと、△ のときの調整案 */
export async function generateFitAdvice(ctx: Step05Context, theme: Step05Theme): Promise<FitAdvice> {
  await wait();
  return buildFitAdvice(ctx, theme);
}

export function buildFitAdvice(ctx: Step05Context, theme: Step05Theme): FitAdvice {
  const out = {} as FitAdvice;
  for (const q of FIT_QUESTIONS) {
    const sentence = ctx.self[q.key][0];
    const target = firstTarget(theme, FIT_LAYER[q.key]) || filledItems(theme)[0]?.target.trim() || '';
    if (!sentence) {
      out[q.key] = {
        comment: `Step2 の${q.label}の文がまだないため、目標を読み返して直感で答えてみてください。`,
        suggestion: `${q.label}につながる言葉を、3方向のどこかに1つ加えてみませんか？`,
      };
      continue;
    }
    const phrase = selfPhrase(sentence);
    out[q.key] = {
      comment: target
        ? `Step2 の${q.label}「${phrase}」は、目標の「${stripEnd(target)}」とつながっていそうです。`
        : `Step2 の${q.label}「${phrase}」が、目標のどこに表れているか探してみましょう。`,
      suggestion: `「${phrase}」を活かす項目を、${getStep05Layer(FIT_LAYER[q.key]).name}に1つ加えてみませんか？`,
    };
  }
  return out;
}

/** AI-4：目標の項目＋Step3・Step4 → 項目ごとの「今の自分」下書き */
export async function generateCurrentDrafts(ctx: Step05Context, theme: Step05Theme): Promise<CurrentDrafts> {
  await wait();
  return buildCurrentDrafts(ctx, theme);
}

export function buildCurrentDrafts(ctx: Step05Context, theme: Step05Theme): CurrentDrafts {
  const out: CurrentDrafts = {};
  for (const item of filledItems(theme)) {
    const entry = item.sourceTagId
      ? ctx.tagEntries[item.layer].find((e) => e.tagId === item.sourceTagId)
      : undefined;
    const reason = entry ? ctx.reasons.find((r) => entry.reasonIds.includes(r.id)) : undefined;
    const insight = reason ? ctx.insights.find((i) => i.reasonId === reason.id) : undefined;
    if (item.layer === 'be' && insight?.ownWords) {
      out[item.id] = `今は「${stripEnd(insight.ownWords)}」と感じて、立ち止まりがち`;
    } else if (reason) {
      out[item.id] = `今は、${stripEnd(reason.text)}`;
    } else {
      out[item.id] = `今はまだ「${stripEnd(item.target)}」とは言えない`;
    }
  }
  return out;
}

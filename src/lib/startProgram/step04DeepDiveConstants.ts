/** Step4 こころの深掘り — 型・基本選択肢・仮説テンプレート */

import type { MandalaDomainId } from '@/lib/startProgram/mandalaConstants';
import {
  getLayerOption,
  type BeTagId,
  type ReasonEntry,
} from '@/lib/startProgram/step04Constants';

export const DEEP_DIVE_REFRESH_MAX = 3;
export const DEEP_DIVE_CUSTOM_MAX_CHARS = 40;
export const DEEP_DIVE_VOICE_OWN_MAX_CHARS = 100;
export const DEEP_DIVE_OWN_WORDS_MAX_CHARS = 150;

export type AiStatus = 'idle' | 'loading' | 'ready' | 'error';

export type AiSlot<T> = {
  status: AiStatus;
  data: T | null;
  /** 生成に使った入力。前段の回答が変わったら作り直す */
  inputKey: string | null;
  /** 「Ai更新」の使用回数 */
  refreshCount: number;
  /** 前段の回答変更で作り直したことをモーダルで知らせる */
  refreshedNotice: boolean;
};

/** selected = 選択肢から選んだもの / custom = 「＋これら以外」で追加したもの（追加時点で選択扱い） */
export type PickAnswer = { selected: string[]; custom: string[] };

export type EntryOptions = { sceneQuestion: string; scenes: string[]; actions: string[] };
export type InnerOptions = { feelings: string[]; voices: string[]; protections: string[] };
export type Hypothesis = { id: string; title: string; body: string; links: string[] };
export type WorkingRating = 'strong' | 'some' | 'weak' | 'unknown';

export type DeepDiveEntry = {
  reasonId: string;
  entry: {
    options: AiSlot<EntryOptions>;
    scene: PickAnswer;
    action: PickAnswer;
    savedAt: number | null;
  };
  inner: {
    options: AiSlot<InnerOptions>;
    feeling: PickAnswer;
    voice: PickAnswer;
    voiceOwnWords: string;
    protection: PickAnswer;
    savedAt: number | null;
  };
  working: {
    hypotheses: AiSlot<Hypothesis[]>;
    ratings: Record<string, WorkingRating>;
    ownWords: string;
    savedAt: number | null;
  };
  /** 「この気づきを保存する」日時（Step4 完了判定） */
  insightSavedAt: number | null;
};

export type DeepDiveContext = {
  domainId: MandalaDomainId;
  reasonId: string;
  reasonText: string;
  beTags: { id: BeTagId; label: string }[];
  beOtherText: string;
};

export const WORKING_RATINGS: { id: WorkingRating; mark: string; label: string }[] = [
  { id: 'strong', mark: '◎', label: 'とても当てはまる' },
  { id: 'some', mark: '○', label: '少し当てはまる' },
  { id: 'weak', mark: '△', label: 'あまり当てはまらない' },
  { id: 'unknown', mark: '？', label: '分からない' },
];

export function workingRatingLabel(r: WorkingRating | undefined): string {
  const o = WORKING_RATINGS.find((x) => x.id === r);
  return o ? `${o.mark} ${o.label}` : '未回答';
}

export function emptyAiSlot<T>(): AiSlot<T> {
  return { status: 'idle', data: null, inputKey: null, refreshCount: 0, refreshedNotice: false };
}

export function emptyPick(): PickAnswer {
  return { selected: [], custom: [] };
}

export function emptyDeepDiveEntry(reasonId: string): DeepDiveEntry {
  return {
    reasonId,
    entry: { options: emptyAiSlot(), scene: emptyPick(), action: emptyPick(), savedAt: null },
    inner: {
      options: emptyAiSlot(),
      feeling: emptyPick(),
      voice: emptyPick(),
      voiceOwnWords: '',
      protection: emptyPick(),
      savedAt: null,
    },
    working: { hypotheses: emptyAiSlot(), ratings: {}, ownWords: '', savedAt: null },
    insightSavedAt: null,
  };
}

export function picks(a: PickAnswer): string[] {
  return [...a.selected, ...a.custom];
}

export function hasPick(a: PickAnswer): boolean {
  return picks(a).length > 0;
}

export function buildDeepDiveContext(domainId: MandalaDomainId, reason: ReasonEntry): DeepDiveContext {
  return {
    domainId,
    reasonId: reason.id,
    reasonText: reason.text.trim(),
    beTags: reason.tags.be.map((id) => ({
      id: id as BeTagId,
      label: getLayerOption(id)?.option.label ?? id,
    })),
    beOtherText: reason.otherText.be.trim(),
  };
}

export function beTagLabels(reason: ReasonEntry): string[] {
  return reason.tags.be.map((id) => {
    const opt = getLayerOption(id)?.option;
    if (opt?.isOther) {
      const t = reason.otherText.be.trim();
      return t ? `その他：${t}` : 'その他';
    }
    return opt?.label ?? id;
  });
}

export function entryInputKey(ctx: DeepDiveContext): string {
  return JSON.stringify([ctx.reasonText, ctx.beTags.map((t) => t.id), ctx.beOtherText]);
}

export function innerInputKey(ctx: DeepDiveContext, dd: DeepDiveEntry): string {
  return JSON.stringify([ctx.reasonText, picks(dd.entry.scene), picks(dd.entry.action)]);
}

export function workingInputKey(ctx: DeepDiveContext, dd: DeepDiveEntry): string {
  return JSON.stringify([
    innerInputKey(ctx, dd),
    picks(dd.inner.feeling),
    picks(dd.inner.voice),
    dd.inner.voiceOwnWords.trim(),
    picks(dd.inner.protection),
  ]);
}

/** 「子育てでブランクが10年あり、今の自分に…」→ 最後の読点以降を問いに使う */
export function reasonGist(text: string): string {
  const t = text.trim().replace(/[。．.]+$/, '');
  const idx = t.lastIndexOf('、');
  const tail = idx >= 0 ? t.slice(idx + 1) : t;
  return tail.length >= 6 ? tail : t;
}

/* ===== 基本選択肢（ダミー AI・AI 失敗時に使用） ===== */

export const BASE_SCENES_BY_DOMAIN: Record<MandalaDomainId, string[]> = {
  career: [
    '求人を見ている時',
    'やってみたい仕事を見つけた時',
    '応募しようと考えた時',
    '自分の経験や能力を考えた時',
    '他の人の働き方を見た時',
    '失敗した場合を想像した時',
  ],
  money: [
    '家計や通帳を見た時',
    '大きな買い物を考えた時',
    '将来のお金を想像した時',
    '周りの人の暮らしぶりを見た時',
    'お金の話題が出た時',
    '急な出費があった時',
  ],
  health: [
    '鏡や体重計を見た時',
    '運動を始めようと思った時',
    '疲れを感じた時',
    '忙しい日が続いた時',
    '健康診断の結果を見た時',
    '人と体力を比べた時',
  ],
  spirituality: [
    '一人で考え事をしている時',
    '人から評価された時',
    '思うようにいかなかった時',
    '寝る前にその日を振り返った時',
    '人と自分を比べた時',
    '大事な決断をする時',
  ],
  learning: [
    '新しいことを学ぼうと思った時',
    '勉強の計画を立てる時',
    '人の成果を見た時',
    'うまく覚えられなかった時',
    '時間を作ろうとした時',
    '学んだことを試そうとした時',
  ],
  hobbies: [
    'やりたいことを思い出した時',
    '休日の予定を考える時',
    '道具や費用を調べた時',
    '人の作品や活動を見た時',
    '家族の予定と重なった時',
    '始めるきっかけを探している時',
  ],
  relationships: [
    '家族と話そうとした時',
    '頼みごとをしようとした時',
    '意見が合わなかった時',
    '相手の反応が気になった時',
    '忙しくて時間が取れない時',
    '本音を伝えようとした時',
  ],
  social_contribution: [
    '誰かの役に立ちたいと思った時',
    '地域の活動を知った時',
    '自分の経験を話そうとした時',
    '人の活躍を見た時',
    '参加を誘われた時',
    '自分にできることを考えた時',
  ],
};

export const BASE_SCENES_EXTRA = [
  'そのことを人に話そうとした時',
  '期限や締め切りが近づいた時',
  'うまくいっている人を見た時',
  '一人きりになった時',
];

export const BASE_ACTIONS = [
  '考えるだけで行動に移せない',
  '情報収集ばかりしてしまう',
  '先延ばしにする',
  '人に相談できない',
  '自分には難しいと思ってやめる',
  '十分準備できるまで始めない',
  '周囲を優先して自分のことを後回しにする',
];

export const BASE_ACTIONS_EXTRA = [
  '気にしないふりをする',
  '他のことで忙しくして考えないようにする',
  '完璧にやろうとして疲れてしまう',
  '人の意見に合わせてしまう',
];

export const BASE_FEELINGS = [
  '不安',
  '怖い',
  '焦る',
  '自信がなくなる',
  '恥ずかしい',
  '申し訳ない',
  '面倒に感じる',
  '諦めたくなる',
];

export const BASE_FEELINGS_EXTRA = ['悔しい', 'さみしい', 'イライラする', 'むなしい'];

export const BASE_VOICES = [
  '「私には無理かもしれない」',
  '「失敗したらどうしよう」',
  '「もっと準備してからでないと」',
  '「今さら始めても遅い」',
  '「ちゃんとできなければ意味がない」',
  '「人に迷惑をかけたくない」',
  '「家族を優先すべき」',
];

export const BASE_VOICES_EXTRA = [
  '「どうせ続かない」',
  '「みんなはできているのに」',
  '「わがままだと思われたくない」',
  '「まだその時じゃない」',
];

export const BASE_PROTECTIONS = [
  '失敗して傷つくこと',
  '人から否定されること',
  '嫌われること',
  '自分に力がないと感じること',
  '間違えること',
  '人に迷惑をかけること',
  '期待を裏切ること',
  '弱い自分を見せること',
  '先が分からないことへの不安',
  'よく分からない',
];

export const BASE_PROTECTIONS_EXTRA = ['恥をかくこと', 'ひとりになること', '責められること'];

export function baseEntryOptions(ctx: DeepDiveContext): EntryOptions {
  return {
    sceneQuestion: `「${reasonGist(ctx.reasonText)}」と特に感じるのは、どんな時ですか？`,
    scenes: BASE_SCENES_BY_DOMAIN[ctx.domainId] ?? BASE_SCENES_EXTRA,
    actions: BASE_ACTIONS,
  };
}

export function baseInnerOptions(): InnerOptions {
  return { feelings: BASE_FEELINGS, voices: BASE_VOICES, protections: BASE_PROTECTIONS };
}

/* ===== こころの働き（仮説テンプレート・ダミー用） ===== */

export const HYPOTHESIS_TEMPLATES: Record<string, { title: string; body: string }> = {
  失敗して傷つくこと: {
    title: '失敗して傷つくことから自分を守ろうとする働き',
    body: '新しいことに挑戦したい気持ちがある一方で、「もし失敗したら、自分にはできないということが分かってしまう」という不安から、始める前に慎重になっている可能性があります。',
  },
  人から否定されること: {
    title: '否定されることから自分を守ろうとする働き',
    body: '自分の考えや希望を出したときに否定されるのがつらいため、最初から出さないようにしている部分があるかもしれません。',
  },
  嫌われること: {
    title: '人との関係を壊さないようにする働き',
    body: '相手との関係を大切にするあまり、自分の本音や希望を飲み込んでいる可能性があります。',
  },
  自分に力がないと感じること: {
    title: '「力が足りない自分」と向き合わないようにする働き',
    body: '動き出すと自分の力不足がはっきりしてしまう気がして、確かめる前に立ち止まっている可能性があります。',
  },
  間違えること: {
    title: '間違えないように慎重になる働き',
    body: '「やるなら正しくやらなければ」という思いが強く、準備や確認に時間をかけすぎている可能性があります。',
  },
  人に迷惑をかけること: {
    title: '周囲に迷惑をかけないようにする働き',
    body: '家族や周囲を大切にする気持ちが強いからこそ、自分の希望を後回しにしている部分があるかもしれません。',
  },
  期待を裏切ること: {
    title: '期待に応えられない自分を見せないようにする働き',
    body: '周りの期待に応えたい気持ちが強く、応えられなかったときのことを考えて、踏み出すのをためらっている可能性があります。',
  },
  弱い自分を見せること: {
    title: '十分にできない自分を見せないようにする働き',
    body: '「やるなら、ある程度きちんとできなければならない」という思いが、始める前のハードルを高くしている可能性があります。',
  },
  先が分からないことへの不安: {
    title: '見通しの立たない不安から自分を守ろうとする働き',
    body: '先が見えない状態が落ち着かないため、確実だと思えるまで動かないことで安心を保とうとしている可能性があります。',
  },
};

export const DEFAULT_HYPOTHESIS_KEYS = ['失敗して傷つくこと', '弱い自分を見せること', '人に迷惑をかけること'];

export function hypothesisFromProtection(protection: string): Hypothesis {
  const tpl = HYPOTHESIS_TEMPLATES[protection];
  if (tpl) return { id: protection, title: tpl.title, body: tpl.body, links: [] };
  return {
    id: protection,
    title: `「${protection}」から自分を守ろうとする働き`,
    body: `「${protection}」を避けたい気持ちが、行動の前にブレーキをかけている可能性があります。`,
    links: [],
  };
}

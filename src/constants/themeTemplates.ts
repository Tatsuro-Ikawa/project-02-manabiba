import { CategoryTemplate, MetricTemplate, UserType } from '@/types/themeSelection';

// 願望型のカテゴリテンプレート
export const aspirationCategories: CategoryTemplate[] = [
  {
    name: "自己成長",
    examples: [
      "新しいスキルを身につけたい",
      "社会貢献活動をしたい", 
      "知識を深めたい",
      "資格を取得したい",
      "専門性を高めたい"
    ]
  },
  {
    name: "夢・願望",
    examples: [
      "経済的自由を手に入れたい",
      "趣味を極めたい",
      "旅行をしたい",
      "理想のライフスタイルを実現したい",
      "憧れの職業に就きたい"
    ]
  },
  {
    name: "挑戦",
    examples: [
      "スポーツに挑戦したい",
      "冒険をしたい",
      "精神的修養をしたい",
      "新しい体験をしたい",
      "限界に挑戦したい"
    ]
  },
  {
    name: "関係性",
    examples: [
      "新たな出会いを求めたい",
      "新たな環境に身を置きたい",
      "人間関係を深めたい",
      "コミュニティに参加したい",
      "リーダーシップを発揮したい"
    ]
  }
];

// 課題型のカテゴリテンプレート
export const problemCategories: CategoryTemplate[] = [
  {
    name: "人間関係",
    examples: [
      "職場の人間関係",
      "家族との関係",
      "友人関係",
      "恋人との関係",
      "近所付き合い"
    ]
  },
  {
    name: "自己評価",
    examples: [
      "劣等感",
      "自己否定",
      "完璧主義",
      "自信のなさ",
      "自己肯定感の低さ"
    ]
  },
  {
    name: "感情",
    examples: [
      "不安",
      "怒り",
      "悲しみ",
      "やる気の低下",
      "ストレス"
    ]
  },
  {
    name: "行動パターン",
    examples: [
      "やめられない癖",
      "逃げる",
      "先延ばし",
      "依存",
      "衝動的な行動"
    ]
  },
  {
    name: "過去の出来事",
    examples: [
      "トラウマ的体験",
      "後悔",
      "失敗体験",
      "失恋",
      "喪失体験"
    ]
  }
];

// 願望型の評価指標
export const aspirationMetrics: MetricTemplate[] = [
  {
    key: "desire",
    label: "やりたい度",
    icon: "💪",
    description: "どれくらい実現したいか"
  },
  {
    key: "excitement",
    label: "ワクワク度",
    icon: "✨",
    description: "どれくらいワクワクするか"
  },
  {
    key: "feasibility",
    label: "実現可能性",
    icon: "🎯",
    description: "どれくらい実現できそうか"
  }
];

// 課題型の評価指標
export const problemMetrics: MetricTemplate[] = [
  {
    key: "severity",
    label: "困り度",
    icon: "😰",
    description: "どれくらい困っているか"
  },
  {
    key: "frequency",
    label: "頻度",
    icon: "🔄",
    description: "どれくらい頻繁に起きるか"
  }
];

// ユーザータイプ別のカテゴリ取得
export const getCategoriesByUserType = (userType: UserType): CategoryTemplate[] => {
  return userType === 'aspiration' ? aspirationCategories : problemCategories;
};

// ユーザータイプ別の評価指標取得
export const getMetricsByUserType = (userType: UserType): MetricTemplate[] => {
  return userType === 'aspiration' ? aspirationMetrics : problemMetrics;
};

// ユーザータイプ別のプロンプト
export const getUserTypePrompt = (userType: UserType): string => {
  return userType === 'aspiration' 
    ? "なりたい自分、やってみたいことを書いてください"
    : "困っていること、繰り返す悩みなどを書いてください";
};

// ユーザータイプ別のタイトル
export const getUserTypeTitle = (userType: UserType): string => {
  return userType === 'aspiration' 
    ? "やりたいことがある人"
    : "現状を変えたい人";
};

// ユーザータイプ別の説明
export const getUserTypeDescription = (userType: UserType): string => {
  return userType === 'aspiration' 
    ? "なりたい自分、やってみたいことがある。でも、なかなか実現できない。"
    : "今の状況に不満や悩みがある。問題を解決したい。";
};

// ユーザータイプ別のアイコン
export const getUserTypeIcon = (userType: UserType): string => {
  return userType === 'aspiration' ? "🌟" : "🔄";
};

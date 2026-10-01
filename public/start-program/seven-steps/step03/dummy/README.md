# Step3・Step4（Ai 前）ダミーデータ

| ファイル | 内容 |
|----------|------|
| `yuko-step03-04.json` | 裕子さん想定（パターンA・取組領域＝仕事・キャリア・理由4件） |
| `kota-step03-04.json` | 康太さん想定（パターンB・取組領域＝精神・内面・理由5件） |

## 使い方

1. JSON をテキストエディタで編集
2. Step3 ワークシート上部の「裕子さんを読み込む」または「康太さんを読み込む」を押す
3. ブラウザ `localStorage` に保存される
   - Step1: `startProgram.sevenSteps.step01`（願望は `step01Source` の Step2 ペルソナ JSON から読み込む）
   - Step3: `startProgram.sevenSteps.step03.satisfaction`（満足度・気づきメモ・候補・重要度／ワクワク度／変化可能性・取組領域）
   - Step4: `startProgram.sevenSteps.step04.brakeExplore`（取組領域をテーマに、理由・変えられるか・何が変わればよい？）

## 補足

- 候補数は `/settings` の「取組領域の候補選択の上限」で切り詰められる（上限を下げていると、取組領域が候補から外れて Step4 が空になることがある）
- `tags` に使える ID は `src/lib/startProgram/step04Constants.ts` の `STEP04_LAYERS` を参照
- Step2 のデータは上書きしない（Step2 も揃えたい場合は Step2 ワークシートで同じ人物を読み込む）

本番 AI・Firestore 連結前の画面確認用です。

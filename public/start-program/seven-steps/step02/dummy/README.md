# Step2 ダミーデータ

| ファイル | 内容 |
|----------|------|
| `yuko-persona.json` | 裕子さん想定（母・願望多め） |
| `kota-persona.json` | 康太さん想定（35歳・中間管理職・願望12件） |

## 使い方

1. JSON をテキストエディタで編集
2. Step2 ワークシートで「裕子さんを読み込む」または「康太さんを読み込む」を押す
3. ブラウザ `localStorage` に保存される  
   - Step1: `startProgram.sevenSteps.step01`  
   - Step2: `...step02.interest` / `...values` / `...strength`  
   - 参照元: `...step02.dummySource`（Ai 候補の取得先）

本番 AI・Firestore 連結前の画面確認用です。

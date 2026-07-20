# Stripe 課金仕様（確定）

最終更新: 2026-07-19

## 1. 確定マトリクス

| 項目 | 初回申込 | アップグレード (STD→PRE) | ダウングレード (PRE→STD) | 解約（フリー） | 再申し込み |
|------|----------|--------------------------|--------------------------|----------------|------------|
| **28日トライアル** | **あり**（初回のみ） | なし | なし | — | なし（`trialConsumedAt` あり） |
| **課金タイミング** | トライアル終了後に自動課金 | **即時**・日割り相殺 | **現請求期間の終了後**に切替 | **現請求期間の終了まで**利用可→解約 | **即時課金**（トライアルなし） |
| **期間限定（オープン）価格** | 期間内なら **あり** | 期間内なら **あり** | 期間内なら **あり** | — | 期間内なら **あり** |

補足:

- 「一月消化後」は厳密には **`currentPeriodEnd`（現請求期間の終わり）まで**。
- アップグレード時のトライアル再付与はしない（A案）。
- **期間内であれば**、初回・アップ・ダウン・再申し込みのいずれもオープン価格。

## 2. オープン価格の実現方式

**Coupon 方式**（通常 Price ＋ 期間限定 Coupon）。

| 環境変数 | 役割 |
|----------|------|
| `STRIPE_PRICE_STANDARD_MONTHLY` / `STRIPE_PRICE_PREMIUM_MONTHLY` | **通常価格**の Price ID（税込・Inclusive） |
| `STRIPE_COUPON_OPEN_STANDARD` / `STRIPE_COUPON_OPEN_PREMIUM` | オープン期間用 Coupon ID |
| `OPEN_PRICING_ENDS_AT` または `NEXT_PUBLIC_OPEN_PRICING_ENDS_AT` | 終了日時（ISO）。未設定時は `2026-12-31T23:59:59+09:00` |
| `STRIPE_PRICE_*_OPEN_MONTHLY`（任意） | 旧オープン専用 Price の Webhook 解決用 |

期間判定: `src/lib/stripe/openPricing.ts` の `isOpenPricingPeriodActive()`。

- 期間中かつ Coupon ID が設定されている → Checkout / プラン変更 API が Coupon を付与。
- Coupon 未設定のあいだは Price 金額がそのまま請求される（移行中は Price 側をオープン金額にしてよい。**通常 Price へ切り替えたら必ず Coupon を設定**すること。二重値引きに注意）。

期間延長: Coupon の `redeem_by` を延ばす、および／または `OPEN_PRICING_ENDS_AT` を更新。

## 3. 実装経路

| 操作 | 経路 |
|------|------|
| 初回・再申し込み | `POST /api/stripe/checkout-session`（期間内なら `discounts: [{ coupon }]`。トライアルは初回のみ） |
| STD↔PRE | `POST /api/stripe/change-plan`（アップ: `proration_behavior=always_invoice`、ダウン: Subscription Schedule で期間末切替＋Coupon） |
| 解約・支払い方法 | Stripe Customer Portal（「サブスクリプションをキャンセル」） |
| 契約反映 | Webhook → `syncUserSubscriptionFromStripe` → `users/{uid}.subscription` |

UI: `/courses/change`（`CourseChangePanel`）。

## 4. Stripe 全体設定作業

以下は **Test mode と Live mode で別設定**である。最初に Test mode で完了・検証し、本番公開前に Live mode でも同じ方針で設定する。

### 4.1 アカウント・公開情報

Stripe Dashboard の公開事業者情報と Branding に次を設定する。

- 事業者名、所在地、問い合わせ先、サポートメール
- Web サイト URL
- 利用規約 URL、プライバシーポリシー URL、特商法ページ URL
- 明細書表記（顧客のカード明細で識別できる名称）
- ロゴ、アイコン、ブランドカラー

アプリ側の正本:

- 特商法: `src/app/legal/tokushoho/page.tsx`
- Customer Portal の戻り先: `/courses/change`

### 4.2 Product / Price

Product は Standard と Premium の2商品を作る。

| Product | 通常月額（税込） | Price 設定 |
|---------|------------------|------------|
| Standard | 1,650円 | JPY、月次 recurring、`tax_behavior=inclusive` |
| Premium | 6,600円 | JPY、月次 recurring、`tax_behavior=inclusive` |

設定上の注意:

- Price ID は必ず `price_...`。Product ID（`prod_...`）を環境変数へ入れない。
- Price の金額や確定済みの税処理は原則変更せず、変更時は新しい Price を作る。
- Standard / Premium の税処理は両方 **Inclusive（内税）**で揃える。
- Checkout の `automatic_tax` は現状未使用。Stripe Tax による自動税計算・税額明細が必要になった場合は別途コード対応する。
- 28日トライアルは Product / Price には設定しない。初回 Checkout の `trial_period_days: 28` で付与する。

### 4.3 オープン価格 Coupon

通常 Price に対して、Product ごとに Coupon を作る。

| 対象 | 通常価格 | オープン価格 | 推奨 Coupon |
|------|----------|----------------|-------------|
| Standard | 1,650円 | 1,320円 | **20% off** |
| Premium | 6,600円 | 3,300円 | **50% off** |

Coupon の設定:

- 対象 Product を限定する。
- 適用後の契約では割引を継続するため、Duration は **Forever**。
- Redeem by は **2026-12-31 23:59 JST**（延長時は更新）。
- Promotion code は作成不要。顧客にコード入力させず、サーバーが Coupon ID を自動適用する。
- Customer Portal の Promotion codes も **OFF**にし、再申込者が任意のコードを使う経路を作らない。

判定基準は「サーバーが申込・変更を受け付けた日時」。期間内に受け付けた初回・再申込・アップ・ダウンが対象となる。ダウンは期間内に予約した場合、実際の切替が期間終了後でも予約時に対象 Coupon を次フェーズへ設定する。

#### Coupon 方式への移行手順

1. 通常 Price（STD 1,650円 / PRE 6,600円・税込 Inclusive）を作成する。
2. 上記 Coupon を作成する。
3. `STRIPE_PRICE_*` を通常 Price ID、`STRIPE_COUPON_OPEN_*` を Coupon IDへ更新する。
4. Test mode で Checkout、再申込、アップ、ダウンを確認する。
5. 旧オープン専用 Price を Archive する。
6. 旧 Price の契約を Webhook で解決する必要がある間は、任意の `STRIPE_PRICE_*_OPEN_MONTHLY` に旧 Price ID を残す。

**二重値引き禁止**: オープン金額の旧 Price に Coupon を付けない。通常 Price への切替と Coupon ID の設定は同じリリースで行う。

### 4.4 Customer Portal

Dashboard の **Settings → Billing → Customer portal** を次のとおり設定する。

| 項目 | 設定 | 理由 |
|------|------|------|
| Switch plan / サブスクリプション更新 | **OFF** | STD↔PRE は `/api/stripe/change-plan` が Coupon・日割り・期間末変更を統一制御するため |
| Update quantities | **OFF** | 席数課金ではないため |
| Cancel subscription | **ON** | フリーへの変更に使用 |
| Cancellation timing | **At end of billing period** | `currentPeriodEnd` まで利用可能にするため |
| Cancellation reason | ON（任意） | 解約理由の分析用 |
| Retention coupon | 初期は OFF | オープン価格 Coupon と役割を混同しないため |
| Payment method update | **ON** | カード更新用 |
| Invoice history | **ON** | 請求履歴・領収書確認用 |
| Billing information | 氏名・住所・電話を ON | 顧客自身の訂正用 |
| Promotion codes | **OFF** | Coupon はアプリが自動適用するため |

推奨 Headline:

> コースの解約・お支払い方法の更新・請求履歴の確認はこちらから行えます。コース変更はマナビバのコース変更画面をご利用ください。

Portal の定型ボタン文言自体は変更できない。事業者名、Headline、ロゴ、色、利用規約リンク、戻り先 URL を設定し、アプリとのつながりを明示する。

### 4.5 Webhook

#### Dashboard での登録場所

Webhook は **テスト環境でも登録できる**。Stripe の「設定 → 開発者」画面は API キーや Workbench の表示設定を変更する画面であり、Webhook の登録画面ではない。

次の Workbench を直接開く。

- [Stripe Workbench → Webhooks](https://dashboard.stripe.com/workbench/webhooks)

画面上部で対象環境（Test / Sandbox または Live）を確認する。Test と Live の Webhook は別設定であり、それぞれ作成が必要。

#### 登録手順

1. Workbench の **Webhooks** タブを開く。
2. **Add destination（宛先を追加／新しい宛先を作成）**を選択する。
3. Connect ではなく **Events on your account（このアカウントのイベント）**を選択する。
4. API version はアカウントの現在値（既定値）を選択する。
5. 下記3イベントを選択して続行する。
6. Destination type は **Webhook** を選択する。
7. Endpoint URL と説明を入力して作成する。

本番エンドポイント:

```text
https://<本番ドメイン>/api/stripe/webhook
```

本番ドメインが `jinsei-manabiba.com` の場合:

```text
https://jinsei-manabiba.com/api/stripe/webhook
```

購読するイベント:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

各イベントの用途:

| イベント | Firestore への反映 |
|----------|---------------------|
| `checkout.session.completed` | 初回・再申込の Customer / Subscription / plan / trial を保存 |
| `customer.subscription.updated` | プラン変更、解約予約、`past_due`、トライアル終了などを同期 |
| `customer.subscription.deleted` | `plan=free`、`status=expired` へ移行 |

#### Signing secret の登録

Webhook 作成後、対象 Destination の詳細画面から **Signing secret（署名シークレット）**を表示し、`whsec_...` をコピーする。

- Vercel: Project → Settings → Environment Variables の `STRIPE_WEBHOOK_SECRET`
- ローカル: `.env.local` の `STRIPE_WEBHOOK_SECRET`

Webhook Signing secret はエンドポイント・Test/Live ごとに異なる。Test の `whsec_...` を Live に流用しない。Vercel の値を変更した後は再デプロイする。

#### ローカル開発

Stripe Dashboard から `localhost` へ直接送信することはできない。Stripe CLI で転送する。

```powershell
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

コマンドに表示された `whsec_...` を `.env.local` の `STRIPE_WEBHOOK_SECRET` に設定し、Next.js 開発サーバーを再起動する。この値は Dashboard で作成した Webhook の secret とは別物。

#### 登録後の確認

1. Test 環境でテスト申込またはイベント送信を実行する。
2. Workbench の **Event deliveries** で HTTP `200` を確認する。
3. 失敗時は Response と Vercel の Function Logs を確認する。
4. Firestore の `users/{uid}.subscription` が更新されたことを確認する。
5. 本番公開時に Live 環境でも同じ3イベントを登録し、Live 用 secret をVercel Productionへ設定する。

### 4.6 支払い失敗・再請求

Dashboard の **Billing → Revenue recovery → Retries**:

- Smart Retries: **ON**
- 最大 **8回 / 2週間**
- 回収不能時: **サブスクリプションをキャンセル**

アプリの扱い:

- `past_due`: 再請求猶予中として有料機能を継続。
- `unpaid` / `incomplete` / `paused`: `inactive` として有料機能を停止。
- `canceled`: Webhook 後に `expired` / free へ移行。

「既存のすべてのサブスクリプションで支払い回収を一時停止」は **有効化しない**。通常の自動請求を継続する。Subscription の collection method は **Charge automatically（自動請求）**を使用する。

### 4.7 顧客メール

Dashboard の **Customer emails / Email settings** で少なくとも次を有効化する。

- 支払い失敗・カード更新依頼
- 支払い成功／領収書（運用方針に応じて ON）
- トライアル終了前通知（利用可能な場合）
- サブスクリプション解約・更新に関する通知（利用可能な場合）

送信元表示、サポートメール、ロゴ、公開事業者名を確認する。メール設定は Stripe アカウント全体へ影響するため、Test mode で文面とリンクを確認してから本番へ反映する。

### 4.8 環境変数

ローカル `.env.local` と Vercel に設定する。秘密値は Git にコミットしない。

| 変数 | 必須 | 内容 |
|------|------|------|
| `STRIPE_SECRET_KEY` | 必須 | `sk_test_...` / `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | 必須 | 対象エンドポイントの `whsec_...` |
| `STRIPE_PRICE_STANDARD_MONTHLY` | 必須 | Standard 通常 Price ID |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | 必須 | Premium 通常 Price ID |
| `STRIPE_COUPON_OPEN_STANDARD` | Coupon移行後必須 | Standard オープン Coupon ID |
| `STRIPE_COUPON_OPEN_PREMIUM` | Coupon移行後必須 | Premium オープン Coupon ID |
| `NEXT_PUBLIC_OPEN_PRICING_ENDS_AT` | 推奨 | `2026-12-31T23:59:59+09:00`。UI・サーバー共通の終了日時 |
| `NEXT_PUBLIC_APP_URL` | 本番推奨 | 例: `https://jinsei-manabiba.com` |
| `STRIPE_PRICE_*_OPEN_MONTHLY` | 任意 | 旧オープン Price の Webhook 解決用 |

Hosted Checkout はサーバーで Session を作るため、現行実装では `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` は不要。

Vercel では Production / Preview / Development の対象環境を確認し、Live key を Preview やローカルへ入れない。変更後は再デプロイする。

### 4.9 オープン期間の延長

期限延長時は次を同時に更新する。

1. Stripe Coupon の Redeem by。
2. `NEXT_PUBLIC_OPEN_PRICING_ENDS_AT`（Vercel とローカル）。
3. 特商法ページ、ランディング、コース変更画面の表示期限。
4. 必要に応じて Customer Portal / メールの案内。

Coupon がすでに失効している場合は新しい Coupon を作り、`STRIPE_COUPON_OPEN_*` を差し替える。Stripe 側期限とアプリ側期限がずれると Checkout / プラン変更が失敗し得るため、**Coupon の Redeem by はアプリの終了日時以上**にする。

### 4.10 Test mode 検証

本番反映前に、別ユーザーまたは Test Clock を使って確認する。

- 初回 Standard: 28日 trial ＋ Standard Coupon。
- 初回 Premium: 28日 trial ＋ Premium Coupon。
- STD→PRE: trial なし、即時日割り、Premium Coupon。
- PRE→STD: 期間末切替予約、Standard Coupon。
- 解約: 期間末まで利用可、その後 free / expired。
- 再申込: trial なし、期間内なら Coupon、期間外なら通常価格。
- 支払い失敗: `past_due` 猶予、再請求、回収不能時の停止。
- Webhook 再送: 重複イベントでも二重処理しない。
- Firestore: `plan` / `status` / `currentPeriodEnd` / Stripe IDs が同期される。

### 4.11 本番公開チェックリスト

- [ ] Live mode の Product / Price / Coupon を作成
- [ ] すべての Price を税込 Inclusive に統一
- [ ] Live Customer Portal を設定（Switch plan OFF、期間末解約 ON）
- [ ] Live Webhook endpoint と3イベントを登録
- [ ] Vercel Production 環境変数を Live 値で設定
- [ ] Smart Retries と顧客メールを設定
- [ ] 公開事業者情報・明細書表記・Branding を確認
- [ ] Checkout / Webhook / プラン変更 / 解約を本番相当環境で確認
- [ ] Test key、旧 Price、秘密値が本番コードや公開ログに残っていないことを確認


## 5. 関連コード

- `src/lib/stripe/openPricing.ts`
- `src/lib/stripe/planPrices.ts`（`openCouponIdForPlan`）
- `src/app/api/stripe/checkout-session/route.ts`
- `src/app/api/stripe/change-plan/route.ts`
- `src/components/subscription/CourseChangePanel.tsx`

## 6. 参照

- [04_SUBSCRIPTION_PRODUCT_SCOPE.md](./04_SUBSCRIPTION_PRODUCT_SCOPE.md)
- 特商法: `src/app/legal/tokushoho/page.tsx`

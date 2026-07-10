# わかとぴあ 機能一覧

野菜摂取の習慣化を目的とした育成ゲーム。食事の写真を記録すると、栄養バランスに応じてキャラクターが成長する。
(最終更新: 2026-07-11 — フレンド機能・パーツ見た目・タップ演出・カメラ起動を追加)

## 技術構成

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4** — Vercelにデプロイ
- **Supabase** — Google OAuth / Postgres(RLS) / 写真ストレージ
- **Web Push (VAPID)** — `web-push` + Service Worker。リマインダーはGitHub Actionsの15分cron
- **PWA** — ホーム画面追加・standalone起動対応

## 画面と機能

### `/` ランディング
- Googleログイン(Supabase Auth)。ログイン後 `/home` へ。

### `/home` ホーム
- **キャラクター表示**: レベル・成長段階・気分・パーツ(食生活由来)をSVGで描画。**タップするとjump/spin/squishのランダムリアクション+💚✨パーティクル**(`TappableCharacter`)
- **350gメーター**: きょう(JST)の野菜摂取グラム合計 / 目標350g のプログレスバー
- **ごはん記録モーダル**(`MealUploadModal`):
  - 写真は**「📷 カメラでとる」(capture属性でカメラ直接起動、端末の写真ライブラリに残らない)**と「🖼 アルバムからえらぶ」の2系統(クライアントで1024pxにリサイズ→Storageへ)
  - いつのごはん?(朝/昼/晩。JST時刻から初期値を推定、変更可)
  - 野菜グラム(0/50/100/150/200gのチップ。4段階ラベルに換算表示)
  - タンパク質・主食の有無
  - おいしさ ⭐1〜5(必須)
  - 結果画面: スコア・獲得EXP(おいしさボーナス内訳)・レベルアップ/進化演出・分岐名
- **さいきんのきろく**: 直近12件のサムネイルグリッド
- 初回ログイン時は名前入力(`NameSetup`)でキャラ作成

### `/meals` きろく(食事履歴)
- 直近30日をJSTの日付でグループ化し、日内は朝/昼/晩の行で表示
- 各カード: 写真・スコア・⭐・グラム
- 日ヘッダに その日の野菜グラム合計/350g(達成で🎉)
- **削除**(🗑): 確認ダイアログ→ meals行・Storage写真を削除し、EXP・野菜pt・栄養素累積を差し戻す(ストリークは戻さない仕様)

### `/plaza` ひろば
- キャラ一覧(ストリーク→EXP順、上位100)。カードから個別ページへ
- クライアントページ: ログイン中はRLSにより**フレンド限定キャラも自分のフレンド分だけ表示**される(🔒バッジつき)。未ログインはpublicのみ
- ヘッダに「👥 フレンド」リンク

### `/c/[id]` キャラ個別ページ(シェア用)
- キャラ(タップ演出つき)・レベル・ストリーク・直近9食のグリッド
- **フレンド申請ボタン**(状態: フレンドになる / しんせい中 / こうかんする / ✅フレンド)
- ハイブリッド構成: publicキャラはサーバレンダリング+OGメタデータ、フレンド限定キャラはクライアント再取得(非フレンドには「このキャラはひみつだよ 🔒」、OGに名前は漏れない)

### `/friends` フレンド
- とどいたしんせい(こうかん/ことわる)・おくったしんせい(とりけす)・フレンド一覧(解除)
- 相互承認制。1ペア1行の`friendships`テーブル、拒否/取り消し/解除=行削除

### `/settings` せってい
- **なまえ変更**(12文字まで)
- **公開範囲**: 🌍みんなに見せる / 🔒フレンドだけ(キャラ+食事写真の両方が対象)
- フレンドページへのリンク
- **プッシュ通知**:
  - マスタートグル(許可リクエスト→購読→Supabaseに保存)
  - 朝/昼/晩の時間帯別リマインダー(`<input type="time">`、JST)
  - 「ほかの人の投稿を通知」トグル
  - テスト通知ボタン
  - 状態別の診断表示: https必須 / VAPIDキー未設定 / SW登録失敗 / ブラウザ非対応 / 許可拒否
  - iOS/iPadOSの非standalone時: ブラウザ別(Safari/Chrome/Edge/Firefox)の「ホーム画面に追加」手順を表示
- ログアウト

### `/dev/characters` 開発用ギャラリー
- 全段階×気分(12通り)+ パーツスロット別バリエーション + コンボ例の見た目カタログ

## ゲームロジック(`src/lib/game.ts`)

| 要素 | 仕様 |
|---|---|
| スコア | 野菜4段階(グラム換算: 0 / 1-69 / 70-139 / 140+g)×3 + タンパク質2 + 主食1 = 0〜12点 |
| 獲得EXP | スコア + おいしさボーナス(⭐1-5 → +1/1/2/2/3)。栄養0点でも最低1EXP |
| レベル | 20EXPごとに1レベル |
| 進化段階 | たまご → Lv2ベビー → Lv4こども → Lv8おとな(3食/日で週2回ほど進化する調整) |
| 進化分岐(テキスト) | 累積栄養素(各1食最大3pt)の占有率45%以上で リーフ🥬 / マッスル💪 / もちもち🍚、それ以外は バランス🌈。読み取り時に導出 |
| **パーツ見た目** | `appearanceOf()`が7スロットを統計から導出: 体色=支配栄養素 / 頭=第2栄養素(sprout/はちまき/かさ) / 模様=食事回数10・30 / 持ち物=野菜pt20・60・120(にんじん/バスケット/トロフィー) / オーラ=ストリーク7・14(輪/炎) / 顔=平均おいしさ3.5・4.3 / キラキラ=350g達成1・5・15日。ステージゲート: 体色・顔・キラキラ=ベビー+、頭・持ち物・模様=こども+、オーラ=おとな。組み合わせで数十通り |
| 気分 | 3日以上未記録でsad。直近7日の野菜量平均 ≥1.8でhappy、≥0.8でok、未満でsad |
| ストリーク | 連続記録日数。1日空くとリセット |
| 日付 | すべてJST基準(`jstNow`/`todayStrJst`/`jstDateStr`。VercelサーバはUTCのため必須) |

栄養判定は自己申告のモック(`judgeMeal`)。将来Claude APIの画像解析に差し替える想定。

## 通知(Web Push)

| 種類 | トリガー | 実装 |
|---|---|---|
| 時間帯リマインダー | GitHub Actions(15分ごと)→ `GET /api/cron/reminders`(`CRON_SECRET`認証) | 設定時刻から15分窓。当日送信済み or そのスロット記録済みならスキップ |
| フレンド投稿通知 | 投稿成功後にクライアントから `POST /api/push/notify-post`(fire-and-forget) | **投稿者の承認済みフレンドのみ**(オプトアウト可) |
| フレンド申請通知 | 申請成功後に `POST /api/push/friend-request` | pending行の実在確認つき。/friendsへのリンク |
| テスト通知 | 設定画面のボタン → `POST /api/push/test` | 自分にのみ |
| 購読引き継ぎ | SWの`pushsubscriptionchange` → `POST /api/push/resubscribe` | ブラウザの購読ローテーション対応 |

- 送信は`web-push`+service roleキー(`src/lib/push-server.ts`)。404/410の購読は自動削除
- 送信履歴は`notification_log`に記録(将来の「通知→撮影までの時間学習」用に`opened_at`カラムを予約)
- ブラウザ対応: Chrome/Edge/Firefox(デスクトップ・Android)、macOS Safari 16.1+、iOS/iPadOS 16.4+(ホーム画面追加必須)

## PWA

- `src/app/manifest.ts`(standalone、テーマ色、アイコン192/512/maskable)
- `public/sw.js`(push受信・通知クリックで既存ウィンドウにフォーカス・購読引き継ぎ。オフラインキャッシュは未実装)
- `SwRegister`がlayoutでSW登録。`next.config.ts`で`/sw.js`をno-cache配信

## データベース(Supabase / `supabase/*.sql`)

| テーブル | 内容 | RLS |
|---|---|---|
| `characters` | 1ユーザー1体。name / exp / veggie_points / streak / last_meal_date / recent_veggie_avg / veggie_exp / protein_exp / carb_exp / **visibility / tastiness_total / meals_count / goal_days** | read=public or 本人 or つながりあり(pending含む)、本人insert/update |
| `meals` | 食事記録。photo_url / veggie_amount / veggie_grams / has_protein / has_carbs / score / meal_slot / tastiness / exp_gained | read=`can_view_meals_of()`(public or 本人 or **承認済みフレンド**)、本人insert/delete |
| `friendships` | フレンド関係(1ペア1行、requester→addressee、pending/accepted) | select/delete=当事者、insert=自分発pending、update(承認)=受け手のみ |
| `push_subscriptions` | Web Push購読(endpoint / p256dh / auth) | 本人のみ全操作 |
| `notification_preferences` | 時間帯別リマインダー設定・友だち通知オプトアウト(時刻はJST規約) | 本人のみ |
| `notification_log` | 送信履歴(kind / sent_at / opened_at) | 本人read、書き込みはservice roleのみ |
| Storage `meals` | 写真。`{user_id}/{timestamp}.jpg` | 公開read、本人フォルダのみwrite/delete。**注意: フレンド限定はDB行(一覧表示)を隠す仕組みで、生URLを知っている人のアクセスは防がない(パスは推測不能、試作品の割り切り)** |

RLSの再帰回避のため、`is_friend` / `has_friendship` / `can_view_meals_of` を security definer 関数として定義(003_features.sql)。

## 環境変数

| 変数 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase接続 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push(公開鍵はビルド時インライン化→変更時は再デプロイ必須) |
| `SUPABASE_SERVICE_ROLE_KEY` | 通知送信(サーバ専用) |
| `CRON_SECRET` | cronエンドポイント認証(GitHub Actionsシークレット`APP_URL`/`CRON_SECRET`とペア) |

## 主なファイル

| パス | 内容 |
|---|---|
| `src/lib/game.ts` | スコア・レベル・進化・分岐・**appearanceOf(パーツ導出)**・気分・ストリーク・JST日付 |
| `src/lib/meals.ts` | 投稿・削除・名前変更・履歴取得(キャラ更新含む) |
| `src/lib/friends.ts` | フレンド申請・承認・解除・一覧・公開範囲変更 |
| `src/lib/push-client.ts` / `push-server.ts` / `supabase-admin.ts` | 通知のクライアント/サーバ処理 |
| `src/components/CharacterSvg.tsx` + `character-parts.tsx` | キャラ描画(4段階×3気分×パーツ合成) |
| `src/components/TappableCharacter.tsx` | タップリアクション付きキャラ表示 |
| `src/components/CharacterProfile.tsx` | キャラ個別ページ本体+フレンドボタン+非公開フォールバック |
| `supabase/setup.sql` + `supabase/migrations/002,003_features.sql` | DBスキーマ(SQL Editorで順に実行) |
| `.github/workflows/reminder-cron.yml` | リマインダーの定期実行 |

## 未実装・将来対応

- 通知を受け取ってから撮影までの時間の学習・最適化(`notification_log.opened_at`にフックのみ)
- Claude APIによる写真からの栄養自動判定(`judgeMeal`差し替え)
- オフラインキャッシュ(Serwist等)
- 削除時のストリーク再計算 / 過去日削除時の`goal_days`再計算(当日分のみ対応)
- フレンド投稿通知のキュー化(現在は直列送信、デモ規模想定)
- 写真の署名URL化(フレンド限定でも生URLは到達可能なままの対応)

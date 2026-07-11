# リマインダー通知が届かない問題の修正計画

作成日: 2026-07-11

## 診断結果(確定)

- テスト通知は届く → 購読・VAPID・端末設定は正常
- GitHub Actions の cron は動いているが、レスポンスが `Redirecting...`(308)
  - 原因: リポジトリシークレット `APP_URL` が `http://` で設定されている
  - 検証済み: `https://wakatopia-demo-game.vercel.app/api/cron/reminders` → 401(正常到達)、
    `http://` → 308 リダイレクト(curl は追跡せず終了、3xx は success 扱い)
- GitHub Actions の `*/15` スケジュールは実測 64〜96 分間隔で遅延
  - `WINDOW_MINUTES = 15` では設定時刻のウィンドウをほぼ毎回素通りする

## 結果(2026-07-11 完了)

- 真因は3つ重なっていた:
  1. APP_URL が http:// で308リダイレクト(curlが追跡せず到達ゼロ)
  2. CRON_SECRET の Vercel/GitHub 間不一致
  3. **APP_URL のドメイン自体が別プロジェクトのものだった**。
     本当の本番URLは https://wakatopia-demo-game-nine.vercel.app (`-nine`つき)。
     サフィックスなしURLは他所有(ユーザーの別アカウントの古いデプロイの疑い)
- CRON_SECRET はローテーションして両側同期、APP_URL は -nine に修正
- ワークフロー成功、レスポンス {"sent":0,"checked":2} を確認済み
- 残: iPhone実機E2E、.env.local の CRON_SECRET 更新、サフィックスなしURLの正体調査

## タスク

### P0-1: APP_URL シークレットを https に修正 [pending]

```bash
gh secret set APP_URL --body "https://wakatopia-demo-game.vercel.app"
```

- コード変更なし。GitHub リポジトリシークレットの上書きのみ。

### P0-2: ワークフローにレスポンス検証を追加 [pending]

- 対象: `.github/workflows/reminder-cron.yml`
- レスポンス body に `"sent"` が含まれなければ job を失敗させる
- 「成功に見えて何もしていない」状態の再発を検知可能にする

### P0-3: リマインダー判定ウィンドウを 15 分 → 90 分に拡大 [pending]

- 対象: `src/app/api/cron/reminders/route.ts` の `WINDOW_MINUTES`
- 安全性: `notification_log` で「同種の通知は1日1回」の重複防止済みのため、
  ウィンドウを広げても二重送信は起きない
- cron が最大 96 分遅延しても通知が届くようになる

### P1-1: push-server.ts に送信失敗ログを追加 [pending]

- 対象: `src/lib/push-server.ts`
- `Promise.allSettled` の rejected を statusCode 付きで console.error に出す
- 今回のような無音の失敗を今後 Vercel ログで追えるようにする

### P1-2: 検証 [pending]

1. `npx tsc --noEmit`(またはビルド)で型チェック
2. コミット & push(ワークフロー変更は main に載って初めて有効)
3. `gh workflow run reminder-cron.yml` で手動実行
4. 実行ログに `{"sent":N,"checked":M}` が出ることを確認
5. E2E: iPhone 側でリマインダー時刻を直近過去(90分以内)に設定し、
   手動実行で実機に通知が届くことを確認

## やらないこと

- Vercel Cron への移行(Hobby プランは1日1回制限のため現構成を維持)
- 通知送信のキュー化(デモ規模では不要)

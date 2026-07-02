# セットアップ手順

コードは完成しているので、以下の3ステップで動くようになります。
(1と2でローカル動作、3で公開)

## 1. Supabaseプロジェクトを作る(約5分)

1. https://supabase.com にアクセスしてGitHubアカウント等でサインアップ(無料)
2. 「New project」でプロジェクト作成(リージョンは `Northeast Asia (Tokyo)` 推奨)
3. 左メニューの **SQL Editor** を開き、このリポジトリの `supabase/setup.sql` の中身を全部貼り付けて **Run**
4. 左メニューの **Project Settings > API** から以下をコピー:
   - `Project URL`
   - `anon public` キー
5. このリポジトリ直下に `.env.local` を作成(`.env.local.example` をコピー)して値を貼る

この時点で `npm run dev` → http://localhost:3000 でランディングページが表示されます
(ログインには次のステップ2が必要)。

## 2. Googleログインを設定する(約10分)

### Google Cloud Console側

1. https://console.cloud.google.com にアクセス → 新しいプロジェクトを作成
2. 「APIとサービス > OAuth同意画面」→ User Type: **外部** で作成
   - アプリ名など最低限を入力。テスト中は「テストユーザー」に自分と被験者のGmailを追加
3. 「APIとサービス > 認証情報」→「認証情報を作成 > OAuthクライアントID」
   - アプリケーションの種類: **ウェブアプリケーション**
   - **承認済みのリダイレクトURI** に以下を追加:
     `https://<SupabaseのプロジェクトID>.supabase.co/auth/v1/callback`
     (正確なURLはSupabase側のGoogle設定画面に表示されるのでコピーすればOK)
4. 発行された **クライアントID** と **クライアントシークレット** を控える

### Supabase側

1. Supabaseダッシュボード「Authentication > Sign In / Providers」→ **Google** を有効化
2. GoogleのクライアントIDとシークレットを貼り付けて保存
3. 「Authentication > URL Configuration」で:
   - **Site URL**: `http://localhost:3000`(デプロイ後はVercelのURLに変更)
   - **Redirect URLs** に追加:
     - `http://localhost:3000/home`
     - `https://<あなたのアプリ>.vercel.app/home`(デプロイ後)

これで `npm run dev` からGoogleログイン → キャラ作成 → 食事記録まで一通り動きます。

## 3. Vercelにデプロイする(約5分)

1. GitHubにリポジトリを作ってpush
2. https://vercel.com で「Add New > Project」→ リポジトリをインポート
3. **Environment Variables** に `.env.local` と同じ2つを設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!
5. 発行されたURL(`https://xxx.vercel.app`)を、Supabaseの
   **Authentication > URL Configuration** の Site URL と Redirect URLs
   (`https://xxx.vercel.app/home`)に登録

これでスマホからアクセスして使えるようになります。被験者にはURLを共有するだけでOK。

## トラブルシューティング

- **ログイン後に localhost に戻ってしまう**: SupabaseのSite URL / Redirect URLsの設定漏れ
- **Googleログインで「アクセスをブロック」**: OAuth同意画面のテストユーザーに追加されていない
- **写真アップロードでエラー**: `supabase/setup.sql` のStorage部分が実行されているか確認

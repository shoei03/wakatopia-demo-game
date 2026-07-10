# わかとぴあ 🥬 野菜でそだつ相棒

食事の写真を記録すると、野菜のバランスでキャラクターが成長する育成ゲームの試作品。
20代一人暮らしの野菜摂取を「習慣化」できるかを検証するハッカソン用プロトタイプ。

## あそびかた

1. Googleでログインして、相棒(たまご)に名前をつける
2. ごはんのたびに写真を撮って、野菜の量などを3タップで記録
3. 野菜が多いほどスコアが高く、相棒が早く成長する(たまご → ベビー → こども → おとな)
4. 野菜が足りない日が続くと相棒が元気をなくす
5. 「ひろば」でみんなの相棒と連続記録日数を見せ合える

## 技術構成

- **Next.js (App Router) + TypeScript + Tailwind CSS** — Vercelにデプロイ
- **Supabase** — Googleログイン / Postgres / 写真ストレージ
- 栄養判定は現在**自己申告のモック**(`src/lib/game.ts` の `judgeMeal`)。
  将来Claude APIの画像解析に差し替える想定でここに分離してある

## 起動方法

```bash
npm install
npm run dev
```

初回は **[SETUP.md](./SETUP.md)** の手順でSupabase・Googleログイン・Vercelの設定が必要。

機能の全体像は **[docs/FEATURES.md](./docs/FEATURES.md)** を参照。

## 主なファイル

| パス | 内容 |
|---|---|
| `supabase/setup.sql` | DBスキーマ・RLS・ストレージ設定(SQL Editorで実行) |
| `src/lib/game.ts` | スコア判定・レベル・気分・ストリークのロジック |
| `src/lib/meals.ts` | 写真アップロード〜キャラ更新の一連の処理 |
| `src/components/CharacterSvg.tsx` | キャラの見た目(4段階 × 3つの気分) |
| `src/app/home/page.tsx` | ホーム(自分のキャラ・記録) |
| `src/app/plaza/page.tsx` | ひろば(みんなのキャラ一覧) |
| `src/app/c/[id]/page.tsx` | キャラ個別ページ(シェア用URL) |

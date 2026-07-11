"use client";

// クライアントページ: ログイン中はRLSがフレンド限定キャラも返すため、
// ブラウザクライアント(セッション付き)で取得する。未ログインでもpublic分は見える。

import Link from "next/link";
import { hasSupabaseEnv } from "@/lib/supabase";
import { usePlazaCharacters } from "@/lib/queries";
import CharacterCard from "@/components/CharacterCard";
import BottomNav from "@/components/BottomNav";

export default function PlazaPage() {
  const charactersQuery = usePlazaCharacters();
  // envが無い場合はフェッチしない(enabled: false)ので空一覧の表示にする
  const loading = hasSupabaseEnv() && charactersQuery.isPending;
  const characters = charactersQuery.data ?? [];

  return (
    <main className="flex-1 max-w-md w-full mx-auto p-4 pb-24">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-leaf-700">🌳 ひろば</h1>
          <p className="text-sm text-foreground/60">
            みんなの相棒たち(連続記録順)
          </p>
        </div>
        <Link
          href="/friends"
          className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-leaf-100 text-sm font-bold text-leaf-700"
        >
          👥 フレンド
        </Link>
      </header>

      {loading ? (
        <p className="text-sm text-foreground/50 text-center py-10">
          よみこみ中…
        </p>
      ) : characters.length === 0 ? (
        <p className="text-sm text-foreground/50 bg-white rounded-2xl border border-leaf-100 p-4">
          まだ誰もいません。最初の相棒を育てよう!
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {characters.map((c) => (
            <CharacterCard key={c.id} character={c} />
          ))}
        </div>
      )}

      <BottomNav />
    </main>
  );
}

"use client";

// クライアントページ: ログイン中はRLSがフレンド限定キャラも返すため、
// ブラウザクライアント(セッション付き)で取得する。未ログインでもpublic分は見える。

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase, hasSupabaseEnv } from "@/lib/supabase";
import type { Character } from "@/lib/types";
import CharacterCard from "@/components/CharacterCard";
import BottomNav from "@/components/BottomNav";

export default function PlazaPage() {
  // envが無い場合はフェッチしないので、最初からloading=falseにしておく
  const [loading, setLoading] = useState(() => hasSupabaseEnv());
  const [characters, setCharacters] = useState<Character[]>([]);

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    getSupabase()
      .from("characters")
      .select()
      .order("streak", { ascending: false })
      .order("exp", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setCharacters((data ?? []) as Character[]);
        setLoading(false);
      });
  }, []);

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

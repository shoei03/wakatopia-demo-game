import { getServerAnonClient, hasSupabaseEnv } from "@/lib/supabase";
import type { Character } from "@/lib/types";
import CharacterCard from "@/components/CharacterCard";
import BottomNav from "@/components/BottomNav";

export const dynamic = "force-dynamic";

export default async function PlazaPage() {
  if (!hasSupabaseEnv()) {
    return (
      <main className="flex-1 flex items-center justify-center text-foreground/50">
        Supabaseのセットアップが必要です
      </main>
    );
  }

  const { data } = await getServerAnonClient()
    .from("characters")
    .select()
    .order("streak", { ascending: false })
    .order("exp", { ascending: false })
    .limit(100);
  const characters = (data ?? []) as Character[];

  return (
    <main className="flex-1 max-w-md w-full mx-auto p-4 pb-24">
      <header className="mb-4">
        <h1 className="text-xl font-extrabold text-leaf-700">🌳 ひろば</h1>
        <p className="text-sm text-foreground/60">
          みんなの相棒たち(連続記録順)
        </p>
      </header>

      {characters.length === 0 ? (
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

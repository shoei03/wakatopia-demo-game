"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { fetchMyCharacter, updateCharacterName } from "@/lib/meals";
import type { Character } from "@/lib/types";
import BottomNav from "@/components/BottomNav";
import NotificationSettings from "@/components/NotificationSettings";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);

  useEffect(() => {
    getSupabase()
      .auth.getSession()
      .then(async ({ data }) => {
        const sessionUser = data.session?.user;
        if (!sessionUser) {
          router.replace("/");
          return;
        }
        setUserId(sessionUser.id);
        setCharacter(await fetchMyCharacter(sessionUser.id));
        setLoading(false);
      });
  }, [router]);

  const signOut = async () => {
    await getSupabase().auth.signOut();
    router.replace("/");
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center text-foreground/50">
        よみこみ中…
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-md w-full mx-auto p-4 pb-24 space-y-4">
      <header>
        <h1 className="text-xl font-extrabold text-leaf-700">せってい</h1>
      </header>

      {character && (
        <NameEditor character={character} onUpdated={setCharacter} />
      )}

      {userId && <NotificationSettings userId={userId} />}

      <section className="rounded-2xl bg-white border border-leaf-100 shadow-sm p-4">
        <button
          onClick={signOut}
          className="w-full py-2 text-sm font-bold text-red-400"
        >
          ログアウト
        </button>
      </section>

      <BottomNav />
    </main>
  );
}

function NameEditor({
  character,
  onUpdated,
}: {
  character: Character;
  onUpdated: (c: Character) => void;
}) {
  const [name, setName] = useState(character.name);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === character.name) return;
    setSaving(true);
    setMessage(null);
    try {
      onUpdated(await updateCharacterName(character.id, trimmed));
      setMessage("なまえを変えたよ!");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "変更に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white border border-leaf-100 shadow-sm p-4 space-y-3">
      <h2 className="font-extrabold">✏️ なまえ</h2>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={12}
          placeholder="なまえ(12文字まで)"
          className="flex-1 px-3 py-2 rounded-xl border-2 border-leaf-100 font-bold outline-leaf-500"
        />
        <button
          onClick={save}
          disabled={saving || !name.trim() || name.trim() === character.name}
          className="px-4 rounded-xl bg-leaf-500 text-white font-bold disabled:opacity-40"
        >
          {saving ? "…" : "保存"}
        </button>
      </div>
      {message && (
        <p className="text-sm text-foreground/60 font-bold">{message}</p>
      )}
    </section>
  );
}

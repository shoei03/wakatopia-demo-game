"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { fetchMyCharacter, updateCharacterName } from "@/lib/meals";
import { updateVisibility } from "@/lib/friends";
import type { Character, CharacterVisibility } from "@/lib/types";
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

      {character && (
        <VisibilityEditor character={character} onUpdated={setCharacter} />
      )}

      <section className="rounded-2xl bg-white border border-leaf-100 shadow-sm p-4">
        <Link href="/friends" className="flex items-center justify-between">
          <span className="font-extrabold">👥 フレンド</span>
          <span className="text-foreground/40 text-sm font-bold">→</span>
        </Link>
      </section>

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

function VisibilityEditor({
  character,
  onUpdated,
}: {
  character: Character;
  onUpdated: (c: Character) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options: { value: CharacterVisibility; label: string }[] = [
    { value: "public", label: "🌍 みんなに見せる" },
    { value: "friends", label: "🔒 フレンドだけ" },
  ];

  const change = async (visibility: CharacterVisibility) => {
    if (visibility === character.visibility) return;
    setSaving(true);
    setError(null);
    try {
      onUpdated(await updateVisibility(character.id, visibility));
    } catch (e) {
      setError(e instanceof Error ? e.message : "変更に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white border border-leaf-100 shadow-sm p-4 space-y-3">
      <h2 className="font-extrabold">👀 だれに見せる?</h2>
      <div className="grid grid-cols-2 gap-2">
        {options.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => change(value)}
            disabled={saving}
            className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-colors disabled:opacity-40 ${
              character.visibility === value
                ? "bg-leaf-500 border-leaf-500 text-white"
                : "bg-white border-leaf-100 text-foreground/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-foreground/50">
        {character.visibility === "friends"
          ? "キャラとごはんの写真はフレンドだけに見えるよ"
          : "ひろばでみんなにキャラが見えるよ"}
      </p>
      {error && <p className="text-sm text-red-500 font-bold">{error}</p>}
    </section>
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

"use client";

// キャラ個別ページの表示本体。
// サーバ側でanon取得できたpublicキャラはpropsで受け取り(OGメタデータ維持)、
// フレンド限定キャラは CharacterProfileLoader がブラウザクライアントで再取得する。

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import {
  fetchFriendshipWith,
  sendFriendRequest,
  acceptFriendRequest,
} from "@/lib/friends";
import {
  appearanceOf,
  levelFromExp,
  MOOD_LABELS,
  moodOf,
  stageFromLevel,
  STAGE_NAMES,
  VEGGIE_LABELS,
} from "@/lib/game";
import type { Character, Friendship, Meal } from "@/lib/types";
import TappableCharacter from "./TappableCharacter";

export default function CharacterProfile({
  character,
  meals,
}: {
  character: Character;
  meals: Meal[];
}) {
  const level = levelFromExp(character.exp);
  const stage = stageFromLevel(level);
  const mood = moodOf(character.last_meal_date, character.recent_veggie_avg);

  return (
    <main className="flex-1 max-w-md w-full mx-auto p-4 pb-10 space-y-4">
      <header className="flex items-center justify-between">
        <Link href="/plaza" className="text-sm font-bold text-foreground/50">
          ← ひろば
        </Link>
        <span className="text-sm font-extrabold text-leaf-700">わかとぴあ</span>
      </header>

      <section className="rounded-3xl bg-white border border-leaf-100 shadow-sm p-5 flex flex-col items-center gap-2">
        <TappableCharacter
          stage={stage}
          mood={mood}
          appearance={appearanceOf(character)}
          size={180}
        />
        <h1 className="text-lg font-extrabold">
          {character.visibility === "friends" && "🔒 "}
          {character.name}
        </h1>
        <p className="text-sm text-foreground/60">
          Lv.{level} {STAGE_NAMES[stage]}・{MOOD_LABELS[mood]}
        </p>
        <div className="flex gap-3 text-sm font-bold">
          <span className="text-orange-500">🔥 {character.streak}日連続</span>
          <span className="text-leaf-600">
            🥬 野菜pt {character.veggie_points}
          </span>
        </div>
        <FriendButton ownerUserId={character.user_id} />
      </section>

      {meals.length > 0 && (
        <section>
          <h2 className="font-extrabold mb-2">さいきんのごはん</h2>
          <ul className="grid grid-cols-3 gap-2">
            {meals.map((meal) => (
              <li
                key={meal.id}
                className="rounded-xl overflow-hidden bg-white border border-leaf-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={meal.photo_url}
                  alt="食事の写真"
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
                <p className="p-1.5 text-[11px] font-bold text-leaf-700">
                  {meal.score}てん・🥬{VEGGIE_LABELS[meal.veggie_amount]}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/"
        className="block w-full h-13 py-3.5 rounded-full bg-leaf-500 text-white font-extrabold text-center shadow-md active:scale-95 transition-transform"
      >
        自分の相棒をそだてる
      </Link>
    </main>
  );
}

// フレンド申請ボタン(未ログイン・本人のときは何も出さない)
function FriendButton({ ownerUserId }: { ownerUserId: string }) {
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSupabase()
      .auth.getSession()
      .then(async ({ data }) => {
        const uid = data.session?.user?.id ?? null;
        setViewerId(uid);
        if (uid && uid !== ownerUserId) {
          setFriendship(await fetchFriendshipWith(uid, ownerUserId));
        }
        setReady(true);
      });
  }, [ownerUserId]);

  if (!ready || !viewerId || viewerId === ownerUserId) return null;

  const request = async () => {
    setBusy(true);
    try {
      setFriendship(await sendFriendRequest(viewerId, ownerUserId));
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!friendship) return;
    setBusy(true);
    try {
      setFriendship(await acceptFriendRequest(friendship.id));
    } finally {
      setBusy(false);
    }
  };

  if (!friendship) {
    return (
      <button
        onClick={request}
        disabled={busy}
        className="mt-1 px-5 py-2 rounded-full bg-leaf-500 text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-transform"
      >
        {busy ? "…" : "👥 フレンドになる"}
      </button>
    );
  }
  if (friendship.status === "accepted") {
    return (
      <p className="mt-1 px-5 py-2 rounded-full bg-leaf-50 text-leaf-700 text-sm font-bold">
        ✅ フレンド
      </p>
    );
  }
  if (friendship.addressee_id === viewerId) {
    return (
      <button
        onClick={accept}
        disabled={busy}
        className="mt-1 px-5 py-2 rounded-full bg-leaf-500 text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-transform"
      >
        {busy ? "…" : "✅ しんせいをこうかんする"}
      </button>
    );
  }
  return (
    <p className="mt-1 px-5 py-2 rounded-full bg-leaf-50 text-foreground/50 text-sm font-bold">
      しんせい中…
    </p>
  );
}

// フレンド限定キャラ用: ブラウザクライアント(セッション付き)で再取得
export function CharacterProfileLoader({ characterId }: { characterId: string }) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "hidden" }
    | { kind: "loaded"; character: Character; meals: Meal[] }
  >({ kind: "loading" });

  useEffect(() => {
    const supabase = getSupabase();
    (async () => {
      const { data: character } = await supabase
        .from("characters")
        .select()
        .eq("id", characterId)
        .maybeSingle();
      if (!character) {
        setState({ kind: "hidden" });
        return;
      }
      const { data: meals } = await supabase
        .from("meals")
        .select()
        .eq("user_id", (character as Character).user_id)
        .order("created_at", { ascending: false })
        .limit(9);
      setState({
        kind: "loaded",
        character: character as Character,
        meals: (meals ?? []) as Meal[],
      });
    })();
  }, [characterId]);

  if (state.kind === "loading") {
    return (
      <main className="flex-1 flex items-center justify-center text-foreground/50">
        よみこみ中…
      </main>
    );
  }
  if (state.kind === "hidden") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-4xl">🔒</p>
        <p className="font-extrabold">このキャラはひみつだよ</p>
        <p className="text-sm text-foreground/50">
          フレンドになると見られるようになるかも
        </p>
        <Link href="/plaza" className="text-sm font-bold text-leaf-600">
          ← ひろばへもどる
        </Link>
      </main>
    );
  }
  return <CharacterProfile character={state.character} meals={state.meals} />;
}

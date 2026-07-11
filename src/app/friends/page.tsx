"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  acceptFriendRequest,
  removeFriendship,
  type FriendEntry,
} from "@/lib/friends";
import { useFriendLists, useRequireUserId } from "@/lib/queries";
import { appearanceOf, levelFromExp, moodOf, stageFromLevel } from "@/lib/game";
import CharacterSvg from "@/components/CharacterSvg";
import BottomNav from "@/components/BottomNav";

export default function FriendsPage() {
  const queryClient = useQueryClient();
  const { userId, checking } = useRequireUserId();
  const listsQuery = useFriendLists(userId);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const lists = listsQuery.data ?? null;

  const act = async (friendshipId: string, action: "accept" | "remove") => {
    if (!userId) return;
    setBusyId(friendshipId);
    setError(null);
    try {
      if (action === "accept") await acceptFriendRequest(friendshipId);
      else await removeFriendship(friendshipId);
      // 再取得完了まで待ってからボタンの busy を解除する
      await queryClient.invalidateQueries({ queryKey: ["friends", userId] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作に失敗しました");
    } finally {
      setBusyId(null);
    }
  };

  // キャッシュ済みなら即表示。スピナーは初回(キャッシュなし)のみ
  if (checking || listsQuery.isPending) {
    return (
      <main className="flex-1 flex items-center justify-center text-foreground/50">
        よみこみ中…
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-md w-full mx-auto p-4 pb-24 space-y-5">
      <header>
        <h1 className="text-xl font-extrabold text-leaf-700">👥 フレンド</h1>
        <p className="text-xs text-foreground/50 mt-0.5">
          ひろばで気になるキャラを見つけたら、キャラのページからしんせいしよう
        </p>
      </header>

      {error && <p className="text-sm text-red-500 font-bold">{error}</p>}

      {lists && lists.incoming.length > 0 && (
        <section>
          <h2 className="font-extrabold mb-2">📩 とどいたしんせい</h2>
          <ul className="space-y-2">
            {lists.incoming.map((entry) => (
              <FriendRow key={entry.friendship.id} entry={entry}>
                <button
                  onClick={() => act(entry.friendship.id, "accept")}
                  disabled={busyId === entry.friendship.id}
                  className="px-3 py-1.5 rounded-full bg-leaf-500 text-white text-xs font-bold disabled:opacity-40"
                >
                  ✅ こうかん
                </button>
                <button
                  onClick={() => act(entry.friendship.id, "remove")}
                  disabled={busyId === entry.friendship.id}
                  className="px-3 py-1.5 rounded-full bg-leaf-50 text-foreground/60 text-xs font-bold disabled:opacity-40"
                >
                  ことわる
                </button>
              </FriendRow>
            ))}
          </ul>
        </section>
      )}

      {lists && lists.outgoing.length > 0 && (
        <section>
          <h2 className="font-extrabold mb-2">📤 おくったしんせい</h2>
          <ul className="space-y-2">
            {lists.outgoing.map((entry) => (
              <FriendRow key={entry.friendship.id} entry={entry}>
                <button
                  onClick={() => act(entry.friendship.id, "remove")}
                  disabled={busyId === entry.friendship.id}
                  className="px-3 py-1.5 rounded-full bg-leaf-50 text-foreground/60 text-xs font-bold disabled:opacity-40"
                >
                  とりけす
                </button>
              </FriendRow>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-extrabold mb-2">🌳 フレンド</h2>
        {!lists || lists.friends.length === 0 ? (
          <p className="text-sm text-foreground/50 bg-white rounded-2xl border border-leaf-100 p-4">
            まだフレンドがいません。ひろばでキャラをタップして、しんせいしてみよう!
          </p>
        ) : (
          <ul className="space-y-2">
            {lists.friends.map((entry) => (
              <FriendRow key={entry.friendship.id} entry={entry} linked>
                <button
                  onClick={() => {
                    if (window.confirm("フレンドを解除する?")) {
                      act(entry.friendship.id, "remove");
                    }
                  }}
                  disabled={busyId === entry.friendship.id}
                  className="px-3 py-1.5 rounded-full bg-leaf-50 text-foreground/40 text-xs font-bold disabled:opacity-40"
                >
                  解除
                </button>
              </FriendRow>
            ))}
          </ul>
        )}
      </section>

      <BottomNav />
    </main>
  );
}

function FriendRow({
  entry,
  linked = false,
  children,
}: {
  entry: FriendEntry;
  linked?: boolean;
  children: React.ReactNode;
}) {
  const c = entry.character;
  const avatar = c ? (
    <CharacterSvg
      stage={stageFromLevel(levelFromExp(c.exp))}
      mood={moodOf(c.last_meal_date, c.recent_veggie_avg)}
      appearance={appearanceOf(c)}
      size={48}
    />
  ) : (
    <span className="w-12 h-12 flex items-center justify-center text-2xl">🥚</span>
  );

  return (
    <li className="rounded-2xl bg-white border border-leaf-100 p-3 flex items-center gap-3">
      {linked && c ? (
        <Link href={`/c/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          {avatar}
          <span className="font-bold text-sm truncate">{c.name}</span>
        </Link>
      ) : (
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {avatar}
          <span className="font-bold text-sm truncate">
            {c?.name ?? "???"}
          </span>
        </div>
      )}
      <div className="flex gap-1.5 shrink-0">{children}</div>
    </li>
  );
}

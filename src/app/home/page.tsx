"use client";

import { useState } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { createCharacter, type MealResult } from "@/lib/meals";
import {
  applyMealMutation,
  setCharacterCache,
  useMyCharacter,
  useRecentMeals,
  useRequireUserId,
  useTodayMeals,
} from "@/lib/queries";
import {
  appearanceOf,
  BRANCH_LABELS,
  BRANCH_VISIBLE_STAGE,
  branchOf,
  EXP_PER_LEVEL,
  levelFromExp,
  levelProgress,
  MOOD_LABELS,
  moodOf,
  stageFromLevel,
  STAGE_NAMES,
  VEGGIE_LABELS,
} from "@/lib/game";
import type { Character } from "@/lib/types";
import CharacterSvg from "@/components/CharacterSvg";
import TappableCharacter from "@/components/TappableCharacter";
import MealUploadModal from "@/components/MealUploadModal";
import BottomNav from "@/components/BottomNav";
import VeggieMeter from "@/components/VeggieMeter";

export default function HomePage() {
  const queryClient = useQueryClient();
  const { userId, checking } = useRequireUserId();
  const characterQuery = useMyCharacter(userId);
  const recentQuery = useRecentMeals(userId);
  const todayQuery = useTodayMeals(userId);
  const [modalOpen, setModalOpen] = useState(false);

  const character = characterQuery.data ?? null;
  const meals = recentQuery.data ?? [];
  const todayGrams = (todayQuery.data ?? []).reduce(
    (sum, m) => sum + (m.veggie_grams ?? 0),
    0
  );

  const onMealComplete = (result: MealResult) => {
    if (userId) applyMealMutation(queryClient, userId, result.character);
  };

  // キャッシュ済みなら即表示。スピナーは初回(キャッシュなし)のみ
  if (
    checking ||
    characterQuery.isPending ||
    recentQuery.isPending ||
    todayQuery.isPending
  ) {
    return (
      <main className="flex-1 flex items-center justify-center text-foreground/50">
        よみこみ中…
      </main>
    );
  }

  if (userId && !character) {
    return (
      <NameSetup
        userId={userId}
        onCreated={(c) => setCharacterCache(queryClient, userId, c)}
      />
    );
  }

  if (!character) return null;

  const level = levelFromExp(character.exp);
  const stage = stageFromLevel(level);
  const mood = moodOf(character.last_meal_date, character.recent_veggie_avg);
  const branch = branchOf(character);

  return (
    <main className="flex-1 max-w-md w-full mx-auto p-4 pb-24 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-leaf-700">わかとぴあ</h1>
      </header>

      {/* キャラクター */}
      <section className="rounded-3xl bg-white border border-leaf-100 shadow-sm p-5 flex flex-col items-center gap-2">
        <TappableCharacter
          stage={stage}
          mood={mood}
          appearance={appearanceOf(character)}
          size={190}
        />
        <h2 className="text-lg font-extrabold">{character.name}</h2>
        <p className="text-sm text-foreground/60">
          Lv.{level} {STAGE_NAMES[stage]}・{MOOD_LABELS[mood]}
        </p>
        {stage >= BRANCH_VISIBLE_STAGE && (
          <p className="text-xs font-bold text-leaf-600">
            {BRANCH_LABELS[branch]}
          </p>
        )}

        {/* EXPバー */}
        <div className="w-full mt-1">
          <div className="h-3 rounded-full bg-leaf-50 overflow-hidden">
            <div
              className="h-full bg-leaf-300 rounded-full transition-all duration-700"
              style={{ width: `${levelProgress(character.exp) * 100}%` }}
            />
          </div>
          <p className="text-right text-[11px] text-foreground/40 mt-1">
            つぎのレベルまで {EXP_PER_LEVEL - (character.exp % EXP_PER_LEVEL)}{" "}
            EXP
          </p>
        </div>

        <div className="flex gap-3 text-sm font-bold">
          <span className="text-orange-500">🔥 {character.streak}日連続</span>
          <span className="text-leaf-600">
            🥬 野菜pt {character.veggie_points}
          </span>
        </div>
      </section>

      {/* 350gメーター */}
      <VeggieMeter todayGrams={todayGrams} />

      <button
        onClick={() => setModalOpen(true)}
        className="w-full h-16 rounded-full bg-leaf-500 text-white font-extrabold text-xl shadow-lg active:scale-95 transition-transform"
      >
        📸 ごはんをあげる
      </button>

      {/* 食事履歴 */}
      <section>
        <h3 className="font-extrabold mb-2">さいきんのきろく</h3>
        {meals.length === 0 ? (
          <p className="text-sm text-foreground/50 bg-white rounded-2xl border border-leaf-100 p-4">
            まだ記録がありません。最初のごはんをあげてみよう!
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {meals.map((meal) => (
              <li
                key={meal.id}
                className="rounded-xl overflow-hidden bg-white border border-leaf-100"
              >
                <Image
                  src={meal.photo_url}
                  alt="食事の写真"
                  width={200}
                  height={200}
                  sizes="(max-width: 448px) 33vw, 144px"
                  className="w-full aspect-square object-cover"
                />
                <div className="p-1.5 text-[11px] leading-tight">
                  <p className="font-bold text-leaf-700">{meal.score}てん</p>
                  <p className="text-foreground/50">
                    🥬{VEGGIE_LABELS[meal.veggie_amount]}・
                    {new Date(meal.created_at).toLocaleDateString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modalOpen && character && (
        <MealUploadModal
          character={character}
          onClose={() => setModalOpen(false)}
          onComplete={onMealComplete}
        />
      )}

      <BottomNav />
    </main>
  );
}

function NameSetup({
  userId,
  onCreated,
}: {
  userId: string;
  onCreated: (c: Character) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      onCreated(await createCharacter(userId, trimmed));
    } catch (e) {
      setError(e instanceof Error ? e.message : "作成に失敗しました");
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="animate-bob">
        <CharacterSvg stage={1} mood="ok" size={160} />
      </div>
      <div>
        <h1 className="text-xl font-extrabold mb-1">たまごが生まれた!</h1>
        <p className="text-sm text-foreground/60">
          相棒に名前をつけてあげよう
        </p>
      </div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={12}
        placeholder="なまえ(12文字まで)"
        className="w-full max-w-xs h-13 px-4 py-3 rounded-2xl border-2 border-leaf-200 bg-white text-center font-bold outline-leaf-500"
      />
      {error && <p className="text-sm text-red-500 font-bold">{error}</p>}
      <button
        onClick={create}
        disabled={!name.trim() || saving}
        className="h-13 px-10 py-3 rounded-full bg-leaf-500 text-white font-extrabold text-lg shadow-md disabled:opacity-40 active:scale-95 transition-transform"
      >
        {saving ? "うまれるよ…" : "けってい"}
      </button>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { deleteMeal } from "@/lib/meals";
import {
  applyMealMutation,
  removeMealFromCache,
  useMealHistory,
  useMyCharacter,
  useRequireUserId,
} from "@/lib/queries";
import { jstDateStr } from "@/lib/game";
import type { Meal } from "@/lib/types";
import BottomNav from "@/components/BottomNav";
import MealDayGroup from "@/components/MealDayGroup";

const HISTORY_DAYS = 30;

export default function MealsPage() {
  const queryClient = useQueryClient();
  const { userId, checking } = useRequireUserId();
  const characterQuery = useMyCharacter(userId);
  const mealsQuery = useMealHistory(userId, HISTORY_DAYS);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const character = characterQuery.data ?? null;
  const meals = mealsQuery.data ?? [];

  const onDelete = async (meal: Meal) => {
    if (!character || !userId) return;
    if (!window.confirm("この記録を削除する?もらったEXPも戻るよ")) return;
    setDeletingId(meal.id);
    setError(null);
    try {
      const updated = await deleteMeal(character, meal);
      removeMealFromCache(queryClient, meal.id);
      applyMealMutation(queryClient, userId, updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  // キャッシュ済みなら即表示。スピナーは初回(キャッシュなし)のみ
  if (checking || characterQuery.isPending || mealsQuery.isPending) {
    return (
      <main className="flex-1 flex items-center justify-center text-foreground/50">
        よみこみ中…
      </main>
    );
  }

  // JSTの日付でグループ化(新しい日付が先頭)
  const byDate = new Map<string, Meal[]>();
  for (const meal of meals) {
    const date = jstDateStr(meal.created_at);
    const list = byDate.get(date);
    if (list) list.push(meal);
    else byDate.set(date, [meal]);
  }

  return (
    <main className="flex-1 max-w-md w-full mx-auto p-4 pb-24 space-y-4">
      <header>
        <h1 className="text-xl font-extrabold text-leaf-700">ごはんのきろく</h1>
        <p className="text-xs text-foreground/50 mt-0.5">
          直近{HISTORY_DAYS}日分
        </p>
      </header>

      {error && <p className="text-sm text-red-500 font-bold">{error}</p>}

      {byDate.size === 0 ? (
        <p className="text-sm text-foreground/50 bg-white rounded-2xl border border-leaf-100 p-4">
          まだ記録がありません。ホームからごはんをあげてみよう!
        </p>
      ) : (
        [...byDate.entries()].map(([date, dayMeals]) => (
          <MealDayGroup
            key={date}
            date={date}
            meals={dayMeals}
            onDelete={onDelete}
            deletingId={deletingId}
          />
        ))
      )}

      <BottomNav />
    </main>
  );
}

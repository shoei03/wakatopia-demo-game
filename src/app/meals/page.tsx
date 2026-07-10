"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import {
  deleteMeal,
  fetchMealsSince,
  fetchMyCharacter,
} from "@/lib/meals";
import { jstDateStr } from "@/lib/game";
import type { Character, Meal } from "@/lib/types";
import BottomNav from "@/components/BottomNav";
import MealDayGroup from "@/components/MealDayGroup";

const HISTORY_DAYS = 30;

export default function MealsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [character, setCharacter] = useState<Character | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (userId: string) => {
    const since = new Date(
      Date.now() - HISTORY_DAYS * 86_400_000
    ).toISOString();
    const [char, recent] = await Promise.all([
      fetchMyCharacter(userId),
      fetchMealsSince(userId, since),
    ]);
    setCharacter(char);
    setMeals(recent);
  }, []);

  useEffect(() => {
    getSupabase()
      .auth.getSession()
      .then(async ({ data }) => {
        const sessionUser = data.session?.user;
        if (!sessionUser) {
          router.replace("/");
          return;
        }
        await loadData(sessionUser.id);
        setLoading(false);
      });
  }, [router, loadData]);

  const onDelete = async (meal: Meal) => {
    if (!character) return;
    if (!window.confirm("この記録を削除する?もらったEXPも戻るよ")) return;
    setDeletingId(meal.id);
    setError(null);
    try {
      const updated = await deleteMeal(character, meal);
      setCharacter(updated);
      setMeals((prev) => prev.filter((m) => m.id !== meal.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
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

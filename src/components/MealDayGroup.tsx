"use client";

import Image from "next/image";
import {
  DAILY_VEGGIE_TARGET_G,
  defaultSlot,
  SLOT_LABELS,
  type MealSlot,
} from "@/lib/game";
import type { Meal } from "@/lib/types";

const SLOT_ORDER: MealSlot[] = ["morning", "noon", "evening"];

// 002マイグレーション以前の行はスロットがnullなので撮影時刻(JST)から補完
export function slotOfMeal(meal: Meal): MealSlot {
  return meal.meal_slot ?? defaultSlot(new Date(meal.created_at));
}

// 1日分の食事を朝/昼/晩の行で表示するカード
export default function MealDayGroup({
  date,
  meals,
  onDelete,
  deletingId,
}: {
  date: string; // "YYYY-MM-DD"(JST)
  meals: Meal[];
  onDelete: (meal: Meal) => void;
  deletingId: string | null;
}) {
  const totalGrams = meals.reduce((sum, m) => sum + (m.veggie_grams ?? 0), 0);
  const d = new Date(`${date}T00:00:00+09:00`);
  const dateLabel = d.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Tokyo",
  });

  return (
    <section className="rounded-2xl bg-white border border-leaf-100 shadow-sm p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-extrabold">{dateLabel}</h2>
        <p
          className={`text-xs font-bold ${
            totalGrams >= DAILY_VEGGIE_TARGET_G
              ? "text-amber-500"
              : "text-foreground/50"
          }`}
        >
          🥬 {totalGrams} / {DAILY_VEGGIE_TARGET_G}g
          {totalGrams >= DAILY_VEGGIE_TARGET_G && " 🎉"}
        </p>
      </div>

      {SLOT_ORDER.map((slot) => {
        const slotMeals = meals.filter((m) => slotOfMeal(m) === slot);
        return (
          <div key={slot} className="flex gap-2">
            <span className="w-8 shrink-0 pt-1 text-xs font-bold text-foreground/50">
              {SLOT_LABELS[slot]}
            </span>
            {slotMeals.length === 0 ? (
              <span className="text-xs text-foreground/30 pt-1">—</span>
            ) : (
              <ul className="flex-1 grid grid-cols-3 gap-2">
                {slotMeals.map((meal) => (
                  <li
                    key={meal.id}
                    className="relative rounded-xl overflow-hidden bg-white border border-leaf-100"
                  >
                    <Image
                      src={meal.photo_url}
                      alt="食事の写真"
                      width={200}
                      height={200}
                      sizes="(max-width: 448px) 33vw, 144px"
                      className="w-full aspect-square object-cover"
                    />
                    <button
                      onClick={() => onDelete(meal)}
                      disabled={deletingId === meal.id}
                      aria-label="この記録を削除"
                      className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/50 text-white text-xs disabled:opacity-40"
                    >
                      {deletingId === meal.id ? "…" : "🗑"}
                    </button>
                    <div className="p-1.5 text-[11px] leading-tight">
                      <p className="font-bold text-leaf-700">
                        {meal.score}てん
                        {meal.tastiness != null && (
                          <span className="text-amber-500">
                            {" "}
                            ⭐{meal.tastiness}
                          </span>
                        )}
                      </p>
                      <p className="text-foreground/50">
                        🥬{meal.veggie_grams ?? 0}g
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}

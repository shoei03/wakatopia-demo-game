"use client";

import CharacterSvg from "./CharacterSvg";
import {
  appearanceOf,
  BRANCH_LABELS,
  BRANCH_VISIBLE_STAGE,
  levelFromExp,
  MAX_SCORE,
  moodOf,
  stageFromLevel,
  STAGE_NAMES,
  TASTINESS_BONUS,
} from "@/lib/game";
import type { MealResult } from "@/lib/meals";

export default function MealResultView({
  result,
  tastiness,
  onFinish,
}: {
  result: MealResult;
  tastiness: number;
  onFinish: () => void;
}) {
  const c = result.character;
  const level = levelFromExp(c.exp);
  const stage = stageFromLevel(level);
  const mood = moodOf(c.last_meal_date, c.recent_veggie_avg);
  const bonus = TASTINESS_BONUS[tastiness] ?? 0;

  return (
    <div className="py-4 flex flex-col items-center gap-4 text-center animate-pop-in">
      <div className="animate-bob">
        <CharacterSvg
          stage={stage}
          mood={mood}
          appearance={appearanceOf(c)}
          size={150}
        />
      </div>

      {result.evolved ? (
        <p className="text-xl font-extrabold text-leaf-600">
          🎉 {STAGE_NAMES[stage]}に進化した!
        </p>
      ) : result.leveledUp ? (
        <p className="text-xl font-extrabold text-leaf-600">
          ⬆️ レベルアップ! Lv.{result.newLevel}
        </p>
      ) : (
        <p className="text-xl font-extrabold text-leaf-600">ごちそうさま!</p>
      )}

      <div className="w-full rounded-2xl bg-leaf-50 p-4">
        <p className="text-sm text-foreground/60 font-bold mb-1">
          きょうのごはんスコア
        </p>
        <p className="text-3xl font-extrabold text-leaf-700">
          {result.score}
          <span className="text-base text-foreground/50"> / {MAX_SCORE}</span>
        </p>
        <p className="text-sm text-foreground/60 mt-1">
          +{result.expGained} EXP
          {bonus > 0 && (
            <span className="text-foreground/50">
            (スコア{result.score} + おいしさ{bonus})
            </span>
          )}
          {" "}/ 🔥 {c.streak}日連続
        </p>
      </div>

      {stage >= BRANCH_VISIBLE_STAGE && (
        <p className="text-sm font-bold text-leaf-700">
          いまの育ちかた: {BRANCH_LABELS[result.branch]}
        </p>
      )}

      {result.score < 6 && (
        <p className="text-sm text-foreground/60">
          次は野菜をもうすこし足してみよう🥬
        </p>
      )}

      <button
        onClick={onFinish}
        className="w-full h-12 rounded-full bg-leaf-500 text-white font-bold active:scale-95 transition-transform"
      >
        とじる
      </button>
    </div>
  );
}

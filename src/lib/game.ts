// 育成ゲームのコアロジック(判定・レベル・気分・ストリーク)

export type MealReport = {
  veggieAmount: 0 | 1 | 2 | 3; // なし / 少し / 普通 / たっぷり
  hasProtein: boolean;
  hasCarbs: boolean;
};

export const MAX_SCORE = 12;

// モック判定: 自己申告からスコアを計算する。
// 将来Claude APIの画像解析に差し替える場合はこの関数を置き換える。
export function judgeMeal(report: MealReport): number {
  return (
    report.veggieAmount * 3 +
    (report.hasProtein ? 2 : 0) +
    (report.hasCarbs ? 1 : 0)
  );
}

export const VEGGIE_LABELS = ["なし", "少し", "ふつう", "たっぷり"] as const;

// ---------- レベル・成長段階 ----------

export const EXP_PER_LEVEL = 20;

export function levelFromExp(exp: number): number {
  return Math.floor(exp / EXP_PER_LEVEL) + 1;
}

// 現在レベル内での進捗(0〜1)
export function levelProgress(exp: number): number {
  return (exp % EXP_PER_LEVEL) / EXP_PER_LEVEL;
}

export type Stage = 1 | 2 | 3 | 4;

export function stageFromLevel(level: number): Stage {
  if (level >= 10) return 4;
  if (level >= 5) return 3;
  if (level >= 2) return 2;
  return 1;
}

export const STAGE_NAMES: Record<Stage, string> = {
  1: "たまご",
  2: "ベビー",
  3: "こども",
  4: "おとな",
};

// ---------- 気分(直近の野菜摂取と記録の間隔で決まる) ----------

export type Mood = "happy" | "ok" | "sad";

export const MOOD_LABELS: Record<Mood, string> = {
  happy: "げんき!",
  ok: "まあまあ",
  sad: "野菜が足りない…",
};

export function moodOf(
  lastMealDate: string | null,
  recentVeggieAvg: number,
  today: string = todayStr()
): Mood {
  if (!lastMealDate) return "ok";
  const days = daysBetween(lastMealDate, today);
  if (days >= 3) return "sad"; // 3日以上放置でしょんぼり
  if (recentVeggieAvg >= 1.8) return "happy";
  if (recentVeggieAvg >= 0.8) return "ok";
  return "sad";
}

// ---------- ストリーク・日付 ----------

export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000
  );
}

export function nextStreak(
  streak: number,
  lastMealDate: string | null,
  today: string = todayStr()
): number {
  if (!lastMealDate) return 1;
  const days = daysBetween(lastMealDate, today);
  if (days === 0) return Math.max(streak, 1); // 同日2回目以降は変化なし
  if (days === 1) return streak + 1;
  return 1; // 途切れたらリセット
}

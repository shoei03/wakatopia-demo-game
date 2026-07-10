// 育成ゲームのコアロジック(判定・レベル・気分・ストリーク・分岐)

// ---------- 食事の申告と判定 ----------

export type MealSlot = "morning" | "noon" | "evening";

export const SLOT_LABELS: Record<MealSlot, string> = {
  morning: "朝",
  noon: "昼",
  evening: "晩",
};

export type MealReport = {
  veggieGrams: number;
  hasProtein: boolean;
  hasCarbs: boolean;
  tastiness: 1 | 2 | 3 | 4 | 5;
  slot: MealSlot;
};

export const MAX_SCORE = 12;

// 1日の野菜摂取目標(厚労省の推奨値)
export const DAILY_VEGGIE_TARGET_G = 350;

// グラム数を従来の4段階(なし/少し/ふつう/たっぷり)に変換する
export function veggieAmountFromGrams(grams: number): 0 | 1 | 2 | 3 {
  if (grams >= 140) return 3;
  if (grams >= 70) return 2;
  if (grams >= 1) return 1;
  return 0;
}

export const VEGGIE_LABELS = ["なし", "少し", "ふつう", "たっぷり"] as const;

// モック判定: 自己申告からスコアを計算する。
// 将来Claude APIの画像解析に差し替える場合はこの関数を置き換える。
export function judgeMeal(report: MealReport): number {
  return (
    veggieAmountFromGrams(report.veggieGrams) * 3 +
    (report.hasProtein ? 2 : 0) +
    (report.hasCarbs ? 1 : 0)
  );
}

// おいしさボーナス(⭐1〜5)。栄養0点の食事でも最低1EXPは入る
export const TASTINESS_BONUS = [0, 1, 1, 2, 2, 3] as const;

export function expFromMeal(score: number, tastiness: number): number {
  return score + (TASTINESS_BONUS[tastiness] ?? 0);
}

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

// 1日約20〜27EXP(3食×スコア6〜8+おいしさ)想定で週2回ほど進化する調整
export function stageFromLevel(level: number): Stage {
  if (level >= 8) return 4; // exp 140 ≒ 6〜7日目
  if (level >= 4) return 3; // exp 60 ≒ 3日目
  if (level >= 2) return 2; // exp 20 ≒ 1日目
  return 1;
}

export const STAGE_NAMES: Record<Stage, string> = {
  1: "たまご",
  2: "ベビー",
  3: "こども",
  4: "おとな",
};

// ---------- 進化の分岐(累積栄養素から読み取り時に導出) ----------

export type Branch = "leaf" | "muscle" | "mochi" | "balance";

export const BRANCH_NAMES: Record<Branch, string> = {
  leaf: "リーフ",
  muscle: "マッスル",
  mochi: "もちもち",
  balance: "バランス",
};

export const BRANCH_LABELS: Record<Branch, string> = {
  leaf: "🥬 野菜が大すき",
  muscle: "💪 タンパク質でムキムキ",
  mochi: "🍚 主食でもちもち",
  balance: "🌈 バランスばっちり",
};

// 各栄養素は1食あたり最大3ポイントで累積する(meals.ts参照)。
// 占有率45%以上かつ単独最大の栄養素があればその分岐、なければバランス。
export function branchOf(c: {
  veggie_exp: number;
  protein_exp: number;
  carb_exp: number;
}): Branch {
  const v = c.veggie_exp;
  const p = c.protein_exp;
  const cb = c.carb_exp;
  const total = v + p + cb;
  if (total <= 0) return "balance";
  if (v / total >= 0.45 && v > p && v > cb) return "leaf";
  if (p / total >= 0.45 && p > v && p > cb) return "muscle";
  if (cb / total >= 0.45 && cb > v && cb > p) return "mochi";
  return "balance";
}

// 分岐が見た目に反映されはじめるステージ
export const BRANCH_VISIBLE_STAGE: Stage = 3;

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
  today: string = todayStrJst()
): Mood {
  if (!lastMealDate) return "ok";
  const days = daysBetween(lastMealDate, today);
  if (days >= 3) return "sad"; // 3日以上放置でしょんぼり
  if (recentVeggieAvg >= 1.8) return "happy";
  if (recentVeggieAvg >= 0.8) return "ok";
  return "sad";
}

// ---------- 日付(すべてJST基準。VercelのサーバはUTCで動くため必須) ----------

const JST_OFFSET_MS = 9 * 3_600_000;

// JSTの壁時計時刻を持つDate(読み出しはgetUTC*系メソッドで行うこと)
export function jstNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + JST_OFFSET_MS);
}

function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// JSTでの今日の日付 "YYYY-MM-DD"
export function todayStrJst(now: Date = new Date()): string {
  return formatDate(jstNow(now));
}

// ISO文字列をJSTの日付 "YYYY-MM-DD" に変換(履歴の日付グループ化用)
export function jstDateStr(iso: string): string {
  return formatDate(jstNow(new Date(iso)));
}

// JSTの時刻から食事スロットの初期値を推定する
export function defaultSlot(now: Date = new Date()): MealSlot {
  const hour = jstNow(now).getUTCHours();
  if (hour >= 4 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "noon";
  return "evening";
}

export function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000
  );
}

// ---------- ストリーク ----------

export function nextStreak(
  streak: number,
  lastMealDate: string | null,
  today: string = todayStrJst()
): number {
  if (!lastMealDate) return 1;
  const days = daysBetween(lastMealDate, today);
  if (days === 0) return Math.max(streak, 1); // 同日2回目以降は変化なし
  if (days === 1) return streak + 1;
  return 1; // 途切れたらリセット
}

import { getSupabase } from "./supabase";
import { resizeImage } from "./image";
import {
  branchOf,
  DAILY_VEGGIE_TARGET_G,
  expFromMeal,
  jstDateStr,
  jstTodayStartIso,
  judgeMeal,
  levelFromExp,
  nextStreak,
  stageFromLevel,
  todayStrJst,
  veggieAmountFromGrams,
  type Branch,
  type MealReport,
} from "./game";
import type { Character, Meal } from "./types";

export type MealResult = {
  score: number;
  expGained: number;
  character: Character;
  leveledUp: boolean;
  evolved: boolean;
  newLevel: number;
  branch: Branch;
};

// 分岐用の栄養素累積: 各次元とも1食あたり最大3ptに揃える
// (スコアの重みをそのまま使うと野菜が常に支配的になり全員リーフになるため)
function nutrientGains(report: {
  veggie_amount: number;
  has_protein: boolean;
  has_carbs: boolean;
}) {
  return {
    veggie: report.veggie_amount,
    protein: report.has_protein ? 3 : 0,
    carb: report.has_carbs ? 3 : 0,
  };
}

// 写真アップロード → 食事記録 → キャラ更新までの一連の処理
export async function submitMeal(
  character: Character,
  file: File,
  report: MealReport
): Promise<MealResult> {
  const supabase = getSupabase();
  const userId = character.user_id;

  const blob = await resizeImage(file);
  const path = `${userId}/${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("meals")
    .upload(path, blob, { contentType: "image/jpeg" });
  if (uploadError) throw uploadError;

  const photoUrl = supabase.storage.from("meals").getPublicUrl(path)
    .data.publicUrl;

  const veggieAmount = veggieAmountFromGrams(report.veggieGrams);
  const score = judgeMeal(report);
  const expGained = expFromMeal(score, report.tastiness);
  const { error: mealError } = await supabase.from("meals").insert({
    user_id: userId,
    photo_url: photoUrl,
    veggie_amount: veggieAmount,
    has_protein: report.hasProtein,
    has_carbs: report.hasCarbs,
    score,
    meal_slot: report.slot,
    veggie_grams: report.veggieGrams,
    tastiness: report.tastiness,
    exp_gained: expGained,
  });
  if (mealError) throw mealError;

  const recentVeggieAvg = await computeRecentVeggieAvg(userId, veggieAmount);

  // 350g達成日数: 今回の投稿で当日合計が350gを初めて超えたら+1
  // (今回の投稿はすでにinsert済みなので当日合計には含まれている)
  const todayGrams = await fetchTodayGrams(userId);
  const crossedGoal =
    todayGrams >= DAILY_VEGGIE_TARGET_G &&
    todayGrams - report.veggieGrams < DAILY_VEGGIE_TARGET_G;

  const today = todayStrJst();
  const oldLevel = levelFromExp(character.exp);
  const newExp = character.exp + expGained;
  const newLevel = levelFromExp(newExp);

  const gains = nutrientGains({
    veggie_amount: veggieAmount,
    has_protein: report.hasProtein,
    has_carbs: report.hasCarbs,
  });
  const updates = {
    exp: newExp,
    veggie_points: character.veggie_points + veggieAmount,
    streak: nextStreak(character.streak, character.last_meal_date, today),
    last_meal_date: today,
    recent_veggie_avg: recentVeggieAvg,
    veggie_exp: character.veggie_exp + gains.veggie,
    protein_exp: character.protein_exp + gains.protein,
    carb_exp: character.carb_exp + gains.carb,
    tastiness_total: character.tastiness_total + report.tastiness,
    meals_count: character.meals_count + 1,
    goal_days: character.goal_days + (crossedGoal ? 1 : 0),
  };
  const { data: updated, error: updateError } = await supabase
    .from("characters")
    .update(updates)
    .eq("id", character.id)
    .select()
    .single();
  if (updateError) throw updateError;

  const newCharacter = updated as Character;
  return {
    score,
    expGained,
    character: newCharacter,
    leveledUp: newLevel > oldLevel,
    evolved: stageFromLevel(newLevel) > stageFromLevel(oldLevel),
    newLevel,
    branch: branchOf(newCharacter),
  };
}

// 当日(JST)の野菜グラム合計(350g達成日数の判定に使う)
async function fetchTodayGrams(userId: string): Promise<number> {
  const { data } = await getSupabase()
    .from("meals")
    .select("veggie_grams")
    .eq("user_id", userId)
    .gte("created_at", jstTodayStartIso());
  return (data ?? []).reduce((sum, m) => sum + (m.veggie_grams ?? 0), 0);
}

// 直近7日の野菜量平均を再計算(気分の判定に使う)
async function computeRecentVeggieAvg(
  userId: string,
  fallback: number
): Promise<number> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: recentMeals } = await getSupabase()
    .from("meals")
    .select("veggie_amount")
    .eq("user_id", userId)
    .gte("created_at", since);
  const amounts = (recentMeals ?? []).map((m) => m.veggie_amount);
  return amounts.length > 0
    ? amounts.reduce((a, b) => a + b, 0) / amounts.length
    : fallback;
}

// 食事記録の削除(誤投稿の取り消し)。キャラへの加算分を差し戻す。
// streakは戻さない(履歴の再計算が要るためハッカソンでは簡略化)。
export async function deleteMeal(
  character: Character,
  meal: Meal
): Promise<Character> {
  const supabase = getSupabase();

  const { error: deleteError } = await supabase
    .from("meals")
    .delete()
    .eq("id", meal.id);
  if (deleteError) throw deleteError;

  // Storageの写真も削除(public URLの "/meals/" 以降がパス)
  const marker = "/meals/";
  const idx = meal.photo_url.indexOf(marker);
  if (idx >= 0) {
    const path = meal.photo_url.slice(idx + marker.length);
    await supabase.storage.from("meals").remove([path]);
  }

  const gains = nutrientGains(meal);
  const expGained = meal.exp_gained ?? meal.score;
  const recentVeggieAvg = await computeRecentVeggieAvg(character.user_id, 0);

  // goal_days: 当日分の削除で合計が350gを割り込んだ場合のみ-1
  // (過去日の削除では再計算しない。streakと同じ簡略化)
  let goalDaysDelta = 0;
  if (jstDateStr(meal.created_at) === todayStrJst()) {
    const todayGrams = await fetchTodayGrams(character.user_id); // 削除後の合計
    if (
      todayGrams < DAILY_VEGGIE_TARGET_G &&
      todayGrams + (meal.veggie_grams ?? 0) >= DAILY_VEGGIE_TARGET_G
    ) {
      goalDaysDelta = -1;
    }
  }

  const updates = {
    exp: Math.max(0, character.exp - expGained),
    veggie_points: Math.max(0, character.veggie_points - meal.veggie_amount),
    recent_veggie_avg: recentVeggieAvg,
    veggie_exp: Math.max(0, character.veggie_exp - gains.veggie),
    protein_exp: Math.max(0, character.protein_exp - gains.protein),
    carb_exp: Math.max(0, character.carb_exp - gains.carb),
    tastiness_total: Math.max(
      0,
      character.tastiness_total - (meal.tastiness ?? 0)
    ),
    meals_count: Math.max(0, character.meals_count - 1),
    goal_days: Math.max(0, character.goal_days + goalDaysDelta),
  };
  const { data: updated, error: updateError } = await supabase
    .from("characters")
    .update(updates)
    .eq("id", character.id)
    .select()
    .single();
  if (updateError) throw updateError;
  return updated as Character;
}

export async function updateCharacterName(
  characterId: string,
  name: string
): Promise<Character> {
  const { data, error } = await getSupabase()
    .from("characters")
    .update({ name })
    .eq("id", characterId)
    .select()
    .single();
  if (error) throw error;
  return data as Character;
}

export async function fetchMyCharacter(
  userId: string
): Promise<Character | null> {
  const { data, error } = await getSupabase()
    .from("characters")
    .select()
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Character | null;
}

export async function createCharacter(
  userId: string,
  name: string
): Promise<Character> {
  const { data, error } = await getSupabase()
    .from("characters")
    .insert({ user_id: userId, name })
    .select()
    .single();
  if (error) throw error;
  return data as Character;
}

export async function fetchRecentMeals(
  userId: string,
  limit = 12
): Promise<Meal[]> {
  const { data, error } = await getSupabase()
    .from("meals")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Meal[];
}

// 履歴ページ・日次メーター用: 指定日時以降の食事を新しい順で取得
export async function fetchMealsSince(
  userId: string,
  sinceIso: string
): Promise<Meal[]> {
  const { data, error } = await getSupabase()
    .from("meals")
    .select()
    .eq("user_id", userId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Meal[];
}

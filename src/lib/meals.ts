import { getSupabase } from "./supabase";
import { resizeImage } from "./image";
import {
  judgeMeal,
  levelFromExp,
  nextStreak,
  stageFromLevel,
  todayStr,
  type MealReport,
} from "./game";
import type { Character, Meal } from "./types";

export type MealResult = {
  score: number;
  character: Character;
  leveledUp: boolean;
  evolved: boolean;
  newLevel: number;
};

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

  const score = judgeMeal(report);
  const { error: mealError } = await supabase.from("meals").insert({
    user_id: userId,
    photo_url: photoUrl,
    veggie_amount: report.veggieAmount,
    has_protein: report.hasProtein,
    has_carbs: report.hasCarbs,
    score,
  });
  if (mealError) throw mealError;

  // 直近7日の野菜量平均を再計算(気分の判定に使う)
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: recentMeals } = await supabase
    .from("meals")
    .select("veggie_amount")
    .eq("user_id", userId)
    .gte("created_at", since);
  const amounts = (recentMeals ?? []).map((m) => m.veggie_amount);
  const recentVeggieAvg =
    amounts.length > 0
      ? amounts.reduce((a, b) => a + b, 0) / amounts.length
      : report.veggieAmount;

  const today = todayStr();
  const oldLevel = levelFromExp(character.exp);
  const newExp = character.exp + score;
  const newLevel = levelFromExp(newExp);

  const updates = {
    exp: newExp,
    veggie_points: character.veggie_points + report.veggieAmount,
    streak: nextStreak(character.streak, character.last_meal_date, today),
    last_meal_date: today,
    recent_veggie_avg: recentVeggieAvg,
  };
  const { data: updated, error: updateError } = await supabase
    .from("characters")
    .update(updates)
    .eq("id", character.id)
    .select()
    .single();
  if (updateError) throw updateError;

  return {
    score,
    character: updated as Character,
    leveledUp: newLevel > oldLevel,
    evolved: stageFromLevel(newLevel) > stageFromLevel(oldLevel),
    newLevel,
  };
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

import type { MealSlot } from "./game";

export type CharacterVisibility = "public" | "friends";

export type Character = {
  id: string;
  user_id: string;
  name: string;
  exp: number;
  veggie_points: number;
  streak: number;
  last_meal_date: string | null;
  recent_veggie_avg: number;
  veggie_exp: number;
  protein_exp: number;
  carb_exp: number;
  visibility: CharacterVisibility;
  tastiness_total: number;
  meals_count: number;
  goal_days: number;
  created_at: string;
};

export type FriendshipStatus = "pending" | "accepted";

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  accepted_at: string | null;
};

export type Meal = {
  id: string;
  user_id: string;
  photo_url: string;
  veggie_amount: number;
  has_protein: boolean;
  has_carbs: boolean;
  score: number;
  // 002マイグレーション以前の行はnull
  meal_slot: MealSlot | null;
  veggie_grams: number;
  tastiness: number | null;
  exp_gained: number | null;
  created_at: string;
};

export type NotificationPrefs = {
  user_id: string;
  remind_morning: boolean;
  morning_time: string; // "HH:MM:SS" JST規約
  remind_noon: boolean;
  noon_time: string;
  remind_evening: boolean;
  evening_time: string;
  notify_on_friend_post: boolean;
  updated_at: string;
};

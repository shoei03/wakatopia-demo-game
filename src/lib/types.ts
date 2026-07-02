export type Character = {
  id: string;
  user_id: string;
  name: string;
  exp: number;
  veggie_points: number;
  streak: number;
  last_meal_date: string | null;
  recent_veggie_avg: number;
  created_at: string;
};

export type Meal = {
  id: string;
  user_id: string;
  photo_url: string;
  veggie_amount: number;
  has_protein: boolean;
  has_carbs: boolean;
  score: number;
  created_at: string;
};

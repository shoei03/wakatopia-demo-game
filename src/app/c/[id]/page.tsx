import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerAnonClient, hasSupabaseEnv } from "@/lib/supabase";
import {
  levelFromExp,
  MOOD_LABELS,
  moodOf,
  stageFromLevel,
  STAGE_NAMES,
  VEGGIE_LABELS,
} from "@/lib/game";
import type { Character, Meal } from "@/lib/types";
import CharacterSvg from "@/components/CharacterSvg";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function fetchCharacter(id: string): Promise<Character | null> {
  const { data } = await getServerAnonClient()
    .from("characters")
    .select()
    .eq("id", id)
    .maybeSingle();
  return data as Character | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!hasSupabaseEnv()) return {};
  const { id } = await params;
  const character = await fetchCharacter(id);
  if (!character) return {};
  const level = levelFromExp(character.exp);
  return {
    title: `${character.name} Lv.${level} | わかとぴあ`,
    description: `${character.name}は🔥${character.streak}日連続で食事を記録中!野菜でそだつ育成ゲーム「わかとぴあ」`,
  };
}

export default async function CharacterPage({ params }: Props) {
  if (!hasSupabaseEnv()) {
    return (
      <main className="flex-1 flex items-center justify-center text-foreground/50">
        Supabaseのセットアップが必要です
      </main>
    );
  }

  const { id } = await params;
  const character = await fetchCharacter(id);
  if (!character) notFound();

  const { data: mealsData } = await getServerAnonClient()
    .from("meals")
    .select()
    .eq("user_id", character.user_id)
    .order("created_at", { ascending: false })
    .limit(9);
  const meals = (mealsData ?? []) as Meal[];

  const level = levelFromExp(character.exp);
  const stage = stageFromLevel(level);
  const mood = moodOf(character.last_meal_date, character.recent_veggie_avg);

  return (
    <main className="flex-1 max-w-md w-full mx-auto p-4 pb-10 space-y-4">
      <header className="flex items-center justify-between">
        <Link href="/plaza" className="text-sm font-bold text-foreground/50">
          ← ひろば
        </Link>
        <span className="text-sm font-extrabold text-leaf-700">わかとぴあ</span>
      </header>

      <section className="rounded-3xl bg-white border border-leaf-100 shadow-sm p-5 flex flex-col items-center gap-2">
        <div className="animate-bob">
          <CharacterSvg stage={stage} mood={mood} size={180} />
        </div>
        <h1 className="text-lg font-extrabold">{character.name}</h1>
        <p className="text-sm text-foreground/60">
          Lv.{level} {STAGE_NAMES[stage]}・{MOOD_LABELS[mood]}
        </p>
        <div className="flex gap-3 text-sm font-bold">
          <span className="text-orange-500">🔥 {character.streak}日連続</span>
          <span className="text-leaf-600">
            🥬 野菜pt {character.veggie_points}
          </span>
        </div>
      </section>

      {meals.length > 0 && (
        <section>
          <h2 className="font-extrabold mb-2">さいきんのごはん</h2>
          <ul className="grid grid-cols-3 gap-2">
            {meals.map((meal) => (
              <li
                key={meal.id}
                className="rounded-xl overflow-hidden bg-white border border-leaf-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={meal.photo_url}
                  alt="食事の写真"
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
                <p className="p-1.5 text-[11px] font-bold text-leaf-700">
                  {meal.score}てん・🥬{VEGGIE_LABELS[meal.veggie_amount]}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/"
        className="block w-full h-13 py-3.5 rounded-full bg-leaf-500 text-white font-extrabold text-center shadow-md active:scale-95 transition-transform"
      >
        自分の相棒をそだてる
      </Link>
    </main>
  );
}

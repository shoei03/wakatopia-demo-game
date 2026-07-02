import Link from "next/link";
import CharacterSvg from "./CharacterSvg";
import {
  levelFromExp,
  moodOf,
  stageFromLevel,
  STAGE_NAMES,
} from "@/lib/game";
import type { Character } from "@/lib/types";

// ひろば用のキャラ1体分のカード
export default function CharacterCard({ character }: { character: Character }) {
  const level = levelFromExp(character.exp);
  const stage = stageFromLevel(level);
  const mood = moodOf(character.last_meal_date, character.recent_veggie_avg);

  return (
    <Link
      href={`/c/${character.id}`}
      className="rounded-2xl bg-white border border-leaf-100 shadow-sm p-3 flex flex-col items-center gap-1 active:scale-95 transition-transform"
    >
      <CharacterSvg stage={stage} mood={mood} size={96} />
      <p className="font-bold text-sm truncate max-w-full">{character.name}</p>
      <p className="text-xs text-foreground/60">
        Lv.{level} {STAGE_NAMES[stage]}
      </p>
      <p className="text-xs text-orange-500 font-bold">
        🔥 {character.streak}日連続
      </p>
    </Link>
  );
}

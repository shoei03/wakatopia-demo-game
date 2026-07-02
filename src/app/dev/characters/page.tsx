import CharacterSvg from "@/components/CharacterSvg";
import type { Mood, Stage } from "@/lib/game";
import { MOOD_LABELS, STAGE_NAMES } from "@/lib/game";

// 開発用: 全成長段階×気分の見た目を一覧確認するページ
export default function CharacterGalleryPage() {
  const stages: Stage[] = [1, 2, 3, 4];
  const moods: Mood[] = ["happy", "ok", "sad"];

  return (
    <main className="p-6">
      <h1 className="font-extrabold mb-4">キャラ見た目カタログ(開発用)</h1>
      <div className="grid grid-cols-4 gap-4 max-w-3xl">
        {moods.map((mood) =>
          stages.map((stage) => (
            <div
              key={`${mood}-${stage}`}
              className="bg-white rounded-2xl border border-leaf-100 p-2 text-center"
            >
              <CharacterSvg stage={stage} mood={mood} size={140} />
              <p className="text-xs font-bold">
                {STAGE_NAMES[stage]} / {MOOD_LABELS[mood]}
              </p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

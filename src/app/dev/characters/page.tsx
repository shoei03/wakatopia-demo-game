import CharacterSvg from "@/components/CharacterSvg";
import type { Branch, Mood, Stage } from "@/lib/game";
import { BRANCH_NAMES, MOOD_LABELS, STAGE_NAMES } from "@/lib/game";

// 開発用: 全成長段階×気分×分岐の見た目を一覧確認するページ
export default function CharacterGalleryPage() {
  const stages: Stage[] = [1, 2, 3, 4];
  const moods: Mood[] = ["happy", "ok", "sad"];
  const branches: Branch[] = ["leaf", "muscle", "mochi", "balance"];

  return (
    <main className="p-6 space-y-8">
      <section>
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
      </section>

      <section>
        <h2 className="font-extrabold mb-4">
          進化の分岐(こども・おとな × 4分岐)
        </h2>
        <div className="grid grid-cols-4 gap-4 max-w-3xl">
          {([3, 4] as Stage[]).map((stage) =>
            branches.map((branch) => (
              <div
                key={`${stage}-${branch}`}
                className="bg-white rounded-2xl border border-leaf-100 p-2 text-center"
              >
                <CharacterSvg
                  stage={stage}
                  mood="happy"
                  branch={branch}
                  size={140}
                />
                <p className="text-xs font-bold">
                  {STAGE_NAMES[stage]} / {BRANCH_NAMES[branch]}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

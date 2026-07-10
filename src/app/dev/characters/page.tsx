import CharacterSvg from "@/components/CharacterSvg";
import type { Appearance, Mood, Stage } from "@/lib/game";
import { DEFAULT_APPEARANCE, MOOD_LABELS, STAGE_NAMES } from "@/lib/game";

// 開発用: 成長段階×気分×パーツの見た目を一覧確認するページ
export default function CharacterGalleryPage() {
  const stages: Stage[] = [1, 2, 3, 4];
  const moods: Mood[] = ["happy", "ok", "sad"];

  // スロット別のバリエーション(それ以外はデフォルト)
  const slotVariants: { label: string; items: [string, Partial<Appearance>][] }[] = [
    {
      label: "体色(支配栄養素)",
      items: [
        ["base", { bodyColor: "base" }],
        ["leaf", { bodyColor: "leaf" }],
        ["muscle", { bodyColor: "muscle" }],
        ["mochi", { bodyColor: "mochi" }],
        ["rainbow", { bodyColor: "rainbow" }],
      ],
    },
    {
      label: "頭(第2栄養素)",
      items: [
        ["sprout", { headgear: "sprout" }],
        ["band", { headgear: "band" }],
        ["riceHat", { headgear: "riceHat" }],
      ],
    },
    {
      label: "模様(食事回数)",
      items: [
        ["dots", { pattern: "dots" }],
        ["stripes", { pattern: "stripes" }],
      ],
    },
    {
      label: "持ち物(野菜pt)",
      items: [
        ["carrot", { heldItem: "carrot" }],
        ["basket", { heldItem: "basket" }],
        ["trophy", { heldItem: "trophy" }],
      ],
    },
    {
      label: "オーラ(ストリーク)",
      items: [
        ["ring", { aura: "ring" }],
        ["flame", { aura: "flame" }],
      ],
    },
    {
      label: "顔(平均おいしさ)",
      items: [
        ["sparkle", { face: "sparkle" }],
        ["star", { face: "star" }],
      ],
    },
    {
      label: "キラキラ(350g達成)",
      items: [
        ["tier1", { sparkle: 1 }],
        ["tier2", { sparkle: 2 }],
        ["tier3", { sparkle: 3 }],
      ],
    },
  ];

  const combos: [string, Appearance][] = [
    ["ゼロ統計", DEFAULT_APPEARANCE],
    [
      "リーフ全部盛り",
      {
        bodyColor: "leaf", pattern: "stripes", headgear: "band",
        heldItem: "trophy", aura: "flame", face: "star", sparkle: 3,
      },
    ],
    [
      "マッスル中堅",
      {
        bodyColor: "muscle", pattern: "dots", headgear: "sprout",
        heldItem: "carrot", aura: "ring", face: "sparkle", sparkle: 1,
      },
    ],
    [
      "もちもち×バスケット",
      {
        bodyColor: "mochi", pattern: "dots", headgear: "riceHat",
        heldItem: "basket", aura: "none", face: "normal", sparkle: 2,
      },
    ],
    [
      "レインボー",
      {
        bodyColor: "rainbow", pattern: "stripes", headgear: "sprout",
        heldItem: "basket", aura: "ring", face: "star", sparkle: 2,
      },
    ],
  ];

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

      {slotVariants.map(({ label, items }) => (
        <section key={label}>
          <h2 className="font-extrabold mb-4">{label}</h2>
          <div className="grid grid-cols-5 gap-4 max-w-4xl">
            {items.map(([name, override]) =>
              ([3, 4] as Stage[]).map((stage) => (
                <div
                  key={`${name}-${stage}`}
                  className="bg-white rounded-2xl border border-leaf-100 p-2 text-center"
                >
                  <CharacterSvg
                    stage={stage}
                    mood="happy"
                    appearance={{ ...DEFAULT_APPEARANCE, ...override }}
                    size={120}
                  />
                  <p className="text-xs font-bold">
                    {STAGE_NAMES[stage]} / {name}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      ))}

      <section>
        <h2 className="font-extrabold mb-4">コンボ例</h2>
        <div className="grid grid-cols-5 gap-4 max-w-4xl">
          {combos.map(([name, appearance]) => (
            <div
              key={name}
              className="bg-white rounded-2xl border border-leaf-100 p-2 text-center"
            >
              <CharacterSvg
                stage={4}
                mood="happy"
                appearance={appearance}
                size={140}
              />
              <p className="text-xs font-bold">{name}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

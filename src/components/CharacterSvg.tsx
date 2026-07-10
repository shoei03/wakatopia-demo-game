import type { Appearance, BodyColorId, Mood, Stage } from "@/lib/game";
import { DEFAULT_APPEARANCE } from "@/lib/game";
import {
  Aura,
  BodyPattern,
  Cheeks,
  Face,
  Headgear,
  HeldItem,
  Leaf,
  Sparkles,
  type Palette,
} from "./character-parts";

const PALETTES: Record<Mood, Palette> = {
  happy: { body: "#8ED081", shade: "#6BB864", leaf: "#4C9F4C", cheek: "#FFAFA6" },
  ok: { body: "#AEDBA3", shade: "#8FC488", leaf: "#6FAE6F", cheek: "#FFC9C2" },
  sad: { body: "#C2CEBD", shade: "#A6B5A2", leaf: "#93A78F", cheek: "none" },
};

// 体色パーツによる上書き(sadのときは灰色を優先して適用しない)
const BODY_TINTS: Record<BodyColorId, Partial<Palette>> = {
  base: {},
  leaf: { body: "#79C46F", shade: "#57A84F", leaf: "#2F8A2F" },
  muscle: { body: "#F2B36B", shade: "#DD974A" },
  mochi: { body: "#F5DC97", shade: "#E2C46E" },
  rainbow: { body: "#9AD8C0", shade: "#76BFA3" },
};

// ステージ別の描画アンカー
const GEO = {
  2: { cx: 100, cy: 128, r: 48, faceCy: 126, faceS: 1, headTopY: 80 },
  3: { cx: 100, cy: 120, r: 58, faceCy: 118, faceS: 1.15, headTopY: 62 },
  4: { cx: 100, cy: 116, r: 66, faceCy: 114, faceS: 1.3, headTopY: 50 },
} as const;

// 成長段階 × 気分 × パーツ(食生活由来)で見た目が変わるキャラクター
export default function CharacterSvg({
  stage,
  mood,
  appearance = DEFAULT_APPEARANCE,
  size = 200,
  className,
}: {
  stage: Stage;
  mood: Mood;
  appearance?: Appearance;
  size?: number;
  className?: string;
}) {
  const base = PALETTES[mood];
  // パーツのステージゲート: 体色・顔・キラキラ=stage2+ / 頭・持ち物・模様=stage3+ / オーラ=stage4
  const showColor = stage >= 2 && mood !== "sad";
  const showParts = stage >= 3;
  const showAura = stage === 4;
  const p: Palette = showColor
    ? { ...base, ...BODY_TINTS[appearance.bodyColor] }
    : base;
  const face = stage >= 2 ? appearance.face : "normal";

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="キャラクター"
    >
      {/* 影 */}
      <ellipse cx={100} cy={182} rx={stage >= 3 ? 56 : 44} ry={9} fill="#000000" opacity={0.08} />

      {stage === 1 && (
        <g>
          <path
            d="M 100 42 C 66 42 48 84 48 118 C 48 152 71 174 100 174 C 129 174 152 152 152 118 C 152 84 134 42 100 42"
            fill="#FFF4D9" stroke="#EAD9B0" strokeWidth={3}
          />
          <circle cx={72} cy={120} r={8} fill={p.leaf} opacity={0.4} />
          <circle cx={126} cy={140} r={6} fill={p.leaf} opacity={0.4} />
          <circle cx={112} cy={70} r={7} fill={p.leaf} opacity={0.4} />
          <Face mood={mood} cx={100} cy={112} s={0.9} />
          <Cheeks palette={p} cx={100} cy={112} s={0.9} />
        </g>
      )}

      {stage === 2 && (
        <g>
          <Leaf x={100} y={82} angle={0} size={0.9} color={p.leaf} />
          <circle cx={100} cy={128} r={48} fill={p.body} stroke={p.shade} strokeWidth={3} />
          <path d="M 62 145 A 48 48 0 0 0 138 145 A 60 60 0 0 1 62 145" fill={p.shade} opacity={0.35} />
          <Face mood={mood} style={face} cx={100} cy={126} s={1} />
          <Cheeks palette={p} cx={100} cy={126} s={1} />
        </g>
      )}

      {stage === 3 && (
        <g>
          <Leaf x={90} y={66} angle={-24} size={1} color={p.leaf} />
          <Leaf x={110} y={66} angle={24} size={1} color={p.leaf} />
          {/* うで */}
          <ellipse cx={40} cy={124} rx={13} ry={20} fill={p.body} stroke={p.shade} strokeWidth={3} transform="rotate(20 40 124)" />
          <ellipse cx={160} cy={124} rx={13} ry={20} fill={p.body} stroke={p.shade} strokeWidth={3} transform="rotate(-20 160 124)" />
          <circle cx={100} cy={120} r={58} fill={p.body} stroke={p.shade} strokeWidth={3} />
          <path d="M 54 140 A 58 58 0 0 0 146 140 A 72 72 0 0 1 54 140" fill={p.shade} opacity={0.35} />
          {showParts && (
            <>
              <BodyPattern pattern={appearance.pattern} cx={GEO[3].cx} cy={GEO[3].cy} r={GEO[3].r} color={p.shade} />
              <Headgear headgear={appearance.headgear} cx={100} topY={GEO[3].headTopY} s={1} leafColor={p.leaf} />
              <HeldItem item={appearance.heldItem} x={158} y={150} s={1.1} />
            </>
          )}
          <Face mood={mood} style={face} cx={100} cy={118} s={1.15} />
          <Cheeks palette={p} cx={100} cy={118} s={1.15} />
        </g>
      )}

      {stage === 4 && (
        <g>
          {showAura && (
            <Aura aura={appearance.aura} cx={GEO[4].cx} cy={GEO[4].cy} r={GEO[4].r} />
          )}
          <Leaf x={78} y={58} angle={-38} size={1} color={p.leaf} />
          <Leaf x={100} y={50} angle={0} size={1.2} color={p.leaf} />
          <Leaf x={122} y={58} angle={38} size={1} color={p.leaf} />
          {/* うで */}
          <ellipse cx={32} cy={118} rx={14} ry={24} fill={p.body} stroke={p.shade} strokeWidth={3} transform="rotate(24 32 118)" />
          <ellipse cx={168} cy={118} rx={14} ry={24} fill={p.body} stroke={p.shade} strokeWidth={3} transform="rotate(-24 168 118)" />
          <circle cx={100} cy={116} r={66} fill={p.body} stroke={p.shade} strokeWidth={3} />
          <path d="M 48 140 A 66 66 0 0 0 152 140 A 82 82 0 0 1 48 140" fill={p.shade} opacity={0.35} />
          {/* おとなの証の王冠風スター */}
          <path d="M 100 20 L 104 30 L 114 30 L 106 37 L 109 47 L 100 41 L 91 47 L 94 37 L 86 30 L 96 30 Z" fill="#FFD666" />
          {showParts && (
            <>
              <BodyPattern pattern={appearance.pattern} cx={GEO[4].cx} cy={GEO[4].cy} r={GEO[4].r} color={p.shade} />
              <Headgear headgear={appearance.headgear} cx={100} topY={GEO[4].headTopY} s={1.15} leafColor={p.leaf} />
              <HeldItem item={appearance.heldItem} x={164} y={152} s={1.25} />
            </>
          )}
          <Face mood={mood} style={face} cx={100} cy={114} s={1.3} />
          <Cheeks palette={p} cx={100} cy={114} s={1.3} />
        </g>
      )}

      {stage >= 2 && <Sparkles tier={appearance.sparkle} />}
    </svg>
  );
}

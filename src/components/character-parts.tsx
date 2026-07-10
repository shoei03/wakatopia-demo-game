// キャラのSVGパーツ群(純SVG。クライアント/サーバ両方から使える)
// 座標系は CharacterSvg の viewBox 200x200 前提

import type {
  AuraId,
  FaceStyleId,
  HeadgearId,
  HeldItemId,
  Mood,
  PatternId,
  SparkleTier,
} from "@/lib/game";

export type Palette = {
  body: string;
  shade: string;
  leaf: string;
  cheek: string;
};

// ---------- 基本パーツ(顔・ほっぺ・葉) ----------

export function Face({
  mood,
  style = "normal",
  cx,
  cy,
  s,
}: {
  mood: Mood;
  style?: FaceStyleId;
  cx: number;
  cy: number;
  s: number;
}) {
  const eyeY = cy - 4 * s;
  const eyeDX = 14 * s;
  // sadのときは表情を優先し、おいしさスタイルは適用しない
  const eyeStyle = mood === "sad" ? "normal" : style;
  return (
    <g>
      {mood === "happy" ? (
        // にっこり閉じ目
        <>
          <path
            d={`M ${cx - eyeDX - 5 * s} ${eyeY} q ${5 * s} ${-6 * s} ${10 * s} 0`}
            stroke="#3D3D3D" strokeWidth={3 * s} fill="none" strokeLinecap="round"
          />
          <path
            d={`M ${cx + eyeDX - 5 * s} ${eyeY} q ${5 * s} ${-6 * s} ${10 * s} 0`}
            stroke="#3D3D3D" strokeWidth={3 * s} fill="none" strokeLinecap="round"
          />
        </>
      ) : eyeStyle === "star" ? (
        <>
          <Star cx={cx - eyeDX} cy={eyeY} size={5.5 * s} fill="#3D3D3D" />
          <Star cx={cx + eyeDX} cy={eyeY} size={5.5 * s} fill="#3D3D3D" />
        </>
      ) : (
        <>
          <circle cx={cx - eyeDX} cy={eyeY} r={3.4 * s} fill="#3D3D3D" />
          <circle cx={cx + eyeDX} cy={eyeY} r={3.4 * s} fill="#3D3D3D" />
          {eyeStyle === "sparkle" && (
            <>
              <circle cx={cx - eyeDX + 1.3 * s} cy={eyeY - 1.3 * s} r={1.2 * s} fill="#FFFFFF" />
              <circle cx={cx + eyeDX + 1.3 * s} cy={eyeY - 1.3 * s} r={1.2 * s} fill="#FFFFFF" />
            </>
          )}
        </>
      )}
      {mood === "happy" && (
        <path
          d={`M ${cx - 7 * s} ${cy + 7 * s} q ${7 * s} ${8 * s} ${14 * s} 0`}
          stroke="#3D3D3D" strokeWidth={3 * s} fill="none" strokeLinecap="round"
        />
      )}
      {mood === "ok" && (
        <path
          d={`M ${cx - 5 * s} ${cy + 9 * s} q ${5 * s} ${3 * s} ${10 * s} 0`}
          stroke="#3D3D3D" strokeWidth={3 * s} fill="none" strokeLinecap="round"
        />
      )}
      {mood === "sad" && (
        <>
          <path
            d={`M ${cx - 6 * s} ${cy + 12 * s} q ${6 * s} ${-6 * s} ${12 * s} 0`}
            stroke="#3D3D3D" strokeWidth={3 * s} fill="none" strokeLinecap="round"
          />
          <ellipse cx={cx + 24 * s} cy={eyeY + 10 * s} rx={4 * s} ry={6 * s} fill="#9ECBEB" />
        </>
      )}
    </g>
  );
}

export function Cheeks({
  palette, cx, cy, s,
}: { palette: Palette; cx: number; cy: number; s: number }) {
  if (palette.cheek === "none") return null;
  return (
    <g opacity={0.85}>
      <ellipse cx={cx - 26 * s} cy={cy + 5 * s} rx={7 * s} ry={4.5 * s} fill={palette.cheek} />
      <ellipse cx={cx + 26 * s} cy={cy + 5 * s} rx={7 * s} ry={4.5 * s} fill={palette.cheek} />
    </g>
  );
}

export function Leaf({
  x, y, angle, size, color,
}: { x: number; y: number; angle: number; size: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path
        d={`M 0 0 C ${-14 * size} ${-10 * size} ${-10 * size} ${-30 * size} 0 ${-34 * size} C ${10 * size} ${-30 * size} ${14 * size} ${-10 * size} 0 0`}
        fill={color}
      />
      <line x1={0} y1={-4 * size} x2={0} y2={-26 * size} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={2 * size} strokeLinecap="round" />
    </g>
  );
}

export function Star({
  cx, cy, size, fill,
}: { cx: number; cy: number; size: number; fill: string }) {
  const pts = [0, 1, 2, 3, 4]
    .flatMap((i) => {
      const outer = ((i * 72 - 90) * Math.PI) / 180;
      const inner = ((i * 72 - 54) * Math.PI) / 180;
      return [
        `${cx + Math.cos(outer) * size},${cy + Math.sin(outer) * size}`,
        `${cx + Math.cos(inner) * size * 0.45},${cy + Math.sin(inner) * size * 0.45}`,
      ];
    })
    .join(" ");
  return <polygon points={pts} fill={fill} />;
}

// ---------- 体の模様(食事回数) ----------

export function BodyPattern({
  pattern, cx, cy, r, color,
}: { pattern: PatternId; cx: number; cy: number; r: number; color: string }) {
  if (pattern === "none") return null;
  if (pattern === "dots") {
    // 体の下半分に水玉
    return (
      <g fill={color} opacity={0.3}>
        <circle cx={cx - r * 0.45} cy={cy + r * 0.45} r={r * 0.1} />
        <circle cx={cx + r * 0.5} cy={cy + r * 0.35} r={r * 0.12} />
        <circle cx={cx} cy={cy + r * 0.62} r={r * 0.09} />
        <circle cx={cx - r * 0.15} cy={cy + r * 0.3} r={r * 0.07} />
      </g>
    );
  }
  // stripes: 体の下部に2本のアーチ縞
  return (
    <g stroke={color} strokeWidth={r * 0.1} fill="none" opacity={0.3} strokeLinecap="round">
      <path d={`M ${cx - r * 0.72} ${cy + r * 0.3} Q ${cx} ${cy + r * 0.55} ${cx + r * 0.72} ${cy + r * 0.3}`} />
      <path d={`M ${cx - r * 0.55} ${cy + r * 0.58} Q ${cx} ${cy + r * 0.8} ${cx + r * 0.55} ${cy + r * 0.58}`} />
    </g>
  );
}

// ---------- 頭のパーツ(第2栄養素) ----------

export function Headgear({
  headgear, cx, topY, s, leafColor,
}: { headgear: HeadgearId; cx: number; topY: number; s: number; leafColor: string }) {
  if (headgear === "none") return null;
  if (headgear === "sprout") {
    // ふた葉のスプラウト
    return (
      <g>
        <Leaf x={cx - 8 * s} y={topY + 2} angle={-40} size={0.55 * s} color={leafColor} />
        <Leaf x={cx + 8 * s} y={topY + 2} angle={40} size={0.55 * s} color={leafColor} />
      </g>
    );
  }
  if (headgear === "band") {
    // タンパク質のはちまき
    return (
      <g>
        <path
          d={`M ${cx - 30 * s} ${topY + 14 * s} Q ${cx} ${topY + 4 * s} ${cx + 30 * s} ${topY + 14 * s}`}
          stroke="#F0784E" strokeWidth={7 * s} fill="none" strokeLinecap="round"
        />
        <circle cx={cx + 30 * s} cy={topY + 14 * s} r={4 * s} fill="#F0784E" />
        <path
          d={`M ${cx + 32 * s} ${topY + 16 * s} l ${9 * s} ${7 * s} M ${cx + 33 * s} ${topY + 13 * s} l ${11 * s} ${2 * s}`}
          stroke="#F0784E" strokeWidth={3 * s} strokeLinecap="round"
        />
      </g>
    );
  }
  // riceHat: 米俵風のかさ
  return (
    <g>
      <path
        d={`M ${cx - 26 * s} ${topY + 10 * s} L ${cx} ${topY - 12 * s} L ${cx + 26 * s} ${topY + 10 * s} Z`}
        fill="#EFD68A" stroke="#D9BC64" strokeWidth={2 * s} strokeLinejoin="round"
      />
      <line x1={cx - 18 * s} y1={topY + 4 * s} x2={cx + 18 * s} y2={topY + 4 * s} stroke="#D9BC64" strokeWidth={1.6 * s} />
    </g>
  );
}

// ---------- 持ち物(野菜ptマイルストーン) ----------

export function HeldItem({
  item, x, y, s,
}: { item: HeldItemId; x: number; y: number; s: number }) {
  if (item === "none") return null;
  if (item === "carrot") {
    return (
      <g transform={`translate(${x} ${y}) rotate(18)`}>
        <path d={`M 0 ${-6 * s} L ${5 * s} ${-6 * s} L ${2.5 * s} ${14 * s} Z`} fill="#F49E4C" />
        <path d={`M 0 ${-7 * s} q ${-4 * s} ${-6 * s} ${-1 * s} ${-9 * s} M ${2.5 * s} ${-7 * s} q 0 ${-8 * s} ${2 * s} ${-10 * s} M ${5 * s} ${-7 * s} q ${5 * s} ${-5 * s} ${3 * s} ${-9 * s}`}
          stroke="#4C9F4C" strokeWidth={2 * s} fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (item === "basket") {
    return (
      <g transform={`translate(${x} ${y})`}>
        <path d={`M ${-10 * s} 0 A ${10 * s} ${9 * s} 0 0 0 ${10 * s} 0 Z`} fill="#C89B6C" stroke="#A87D4F" strokeWidth={1.6 * s} />
        <path d={`M ${-8 * s} 0 A ${8 * s} ${8 * s} 0 0 1 ${8 * s} 0`} stroke="#A87D4F" strokeWidth={1.8 * s} fill="none" />
        <circle cx={-3 * s} cy={-2.5 * s} r={2.6 * s} fill="#E5533C" />
        <circle cx={3.5 * s} cy={-3 * s} r={2.4 * s} fill="#8ED081" />
      </g>
    );
  }
  // trophy
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M ${-7 * s} ${-10 * s} h ${14 * s} v ${5 * s} a ${7 * s} ${7 * s} 0 0 1 ${-14 * s} 0 Z`}
        fill="#FFD666" stroke="#E8B93E" strokeWidth={1.6 * s}
      />
      <rect x={-2 * s} y={2 * s} width={4 * s} height={4 * s} fill="#E8B93E" />
      <rect x={-5 * s} y={6 * s} width={10 * s} height={3 * s} rx={1.5 * s} fill="#E8B93E" />
    </g>
  );
}

// ---------- オーラ(ストリーク) ----------

export function Aura({
  aura, cx, cy, r,
}: { aura: AuraId; cx: number; cy: number; r: number }) {
  if (aura === "none") return null;
  if (aura === "ring") {
    return (
      <circle
        cx={cx} cy={cy} r={r + 10}
        fill="none" stroke="#FFD666" strokeWidth={4}
        strokeDasharray="10 12" strokeLinecap="round" opacity={0.8}
      />
    );
  }
  // flame: 体の後ろにゆらめく炎
  return (
    <g opacity={0.75}>
      {[-1, 0, 1].map((i) => (
        <path
          key={i}
          d={`M ${cx + i * r * 0.55} ${cy - r * 0.65}
             q ${8 - i * 4} ${-22} 0 ${-34}
             q ${-10 - i * 2} ${14} ${-4} ${20}
             q ${-8} ${-6} ${-10} ${-14}
             q ${-6} ${18} ${6} ${26} Z`}
          fill={i === 0 ? "#F49E4C" : "#F0784E"}
        />
      ))}
    </g>
  );
}

// ---------- キラキラ(350g達成日数) ----------

const SPARKLE_SPOTS: [number, number][] = [
  [34, 62], [166, 70], [46, 160], [158, 152], [100, 30], [26, 110],
];

export function Sparkles({ tier }: { tier: SparkleTier }) {
  if (tier === 0) return null;
  const count = tier * 2;
  return (
    <g fill="#FFD666" opacity={0.9}>
      {SPARKLE_SPOTS.slice(0, count).map(([x, y], i) => {
        const s = 4 + (i % 2) * 2;
        return (
          <path
            key={`${x}-${y}`}
            d={`M ${x} ${y - s} Q ${x + 1.2} ${y - 1.2} ${x + s} ${y} Q ${x + 1.2} ${y + 1.2} ${x} ${y + s} Q ${x - 1.2} ${y + 1.2} ${x - s} ${y} Q ${x - 1.2} ${y - 1.2} ${x} ${y - s} Z`}
          />
        );
      })}
    </g>
  );
}

import type { Branch, Mood, Stage } from "@/lib/game";
import { BRANCH_VISIBLE_STAGE } from "@/lib/game";

type Palette = {
  body: string;
  shade: string;
  leaf: string;
  cheek: string;
};

const PALETTES: Record<Mood, Palette> = {
  happy: { body: "#8ED081", shade: "#6BB864", leaf: "#4C9F4C", cheek: "#FFAFA6" },
  ok: { body: "#AEDBA3", shade: "#8FC488", leaf: "#6FAE6F", cheek: "#FFC9C2" },
  sad: { body: "#C2CEBD", shade: "#A6B5A2", leaf: "#93A78F", cheek: "none" },
};

// 分岐ごとの体色の上書き(sadのときは灰色を優先して適用しない)
const BRANCH_TINTS: Record<Branch, Partial<Palette>> = {
  leaf: { body: "#79C46F", shade: "#57A84F", leaf: "#2F8A2F" },
  muscle: { body: "#F2B36B", shade: "#DD974A" },
  mochi: { body: "#F5DC97", shade: "#E2C46E" },
  balance: {},
};

function Face({ mood, cx, cy, s }: { mood: Mood; cx: number; cy: number; s: number }) {
  const eyeY = cy - 4 * s;
  const eyeDX = 14 * s;
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
      ) : (
        <>
          <circle cx={cx - eyeDX} cy={eyeY} r={3.4 * s} fill="#3D3D3D" />
          <circle cx={cx + eyeDX} cy={eyeY} r={3.4 * s} fill="#3D3D3D" />
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

function Cheeks({ palette, cx, cy, s }: { palette: Palette; cx: number; cy: number; s: number }) {
  if (palette.cheek === "none") return null;
  return (
    <g opacity={0.85}>
      <ellipse cx={cx - 26 * s} cy={cy + 5 * s} rx={7 * s} ry={4.5 * s} fill={palette.cheek} />
      <ellipse cx={cx + 26 * s} cy={cy + 5 * s} rx={7 * s} ry={4.5 * s} fill={palette.cheek} />
    </g>
  );
}

function Leaf({
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

function Star({ cx, cy, size, fill }: { cx: number; cy: number; size: number; fill: string }) {
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

// 分岐アクセサリ(ステージ3以上で表示)
function BranchDecoration({
  branch,
  stage,
  leafColor,
}: {
  branch: Branch;
  stage: Stage;
  leafColor: string;
}) {
  const armY = stage === 4 ? 118 : 124;
  const armLX = stage === 4 ? 32 : 40;
  const armRX = stage === 4 ? 168 : 160;
  const headTopY = stage === 4 ? 46 : 58;

  switch (branch) {
    case "leaf":
      // 頭のわきに小さな葉を追加
      return (
        <g>
          <Leaf x={70} y={headTopY + 26} angle={-58} size={0.7} color={leafColor} />
          <Leaf x={130} y={headTopY + 26} angle={58} size={0.7} color={leafColor} />
        </g>
      );
    case "muscle":
      // うでに星
      return (
        <g>
          <Star cx={armLX} cy={armY} size={7} fill="#FFD666" />
          <Star cx={armRX} cy={armY} size={7} fill="#FFD666" />
        </g>
      );
    case "mochi":
      // 頭の上に米粒
      return (
        <g>
          <ellipse cx={84} cy={headTopY - 4} rx={5} ry={8} fill="#FFFDF5" stroke="#E3C46E" strokeWidth={1.5} transform={`rotate(-18 84 ${headTopY - 4})`} />
          <ellipse cx={100} cy={headTopY - 10} rx={5.5} ry={9} fill="#FFFDF5" stroke="#E3C46E" strokeWidth={1.5} />
          <ellipse cx={116} cy={headTopY - 4} rx={5} ry={8} fill="#FFFDF5" stroke="#E3C46E" strokeWidth={1.5} transform={`rotate(18 116 ${headTopY - 4})`} />
        </g>
      );
    case "balance":
      // 頭の上に虹の輪
      return (
        <g opacity={0.85}>
          {["#FF9E9E", "#FFD666", "#8ED081", "#9ECBEB"].map((color, i) => (
            <path
              key={color}
              d={`M ${62 + i * 4} ${headTopY + 6} A ${38 - i * 4} ${30 - i * 4} 0 0 1 ${138 - i * 4} ${headTopY + 6}`}
              stroke={color}
              strokeWidth={3.5}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </g>
      );
  }
}

// 成長段階 × 気分(× 分岐)で見た目が変わるキャラクター
export default function CharacterSvg({
  stage,
  mood,
  branch,
  size = 200,
  className,
}: {
  stage: Stage;
  mood: Mood;
  branch?: Branch;
  size?: number;
  className?: string;
}) {
  const base = PALETTES[mood];
  const showBranch = branch !== undefined && stage >= BRANCH_VISIBLE_STAGE;
  const p: Palette =
    showBranch && mood !== "sad"
      ? { ...base, ...BRANCH_TINTS[branch] }
      : base;

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
          <Face mood={mood} cx={100} cy={126} s={1} />
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
          {showBranch && (
            <BranchDecoration branch={branch} stage={3} leafColor={p.leaf} />
          )}
          <Face mood={mood} cx={100} cy={118} s={1.15} />
          <Cheeks palette={p} cx={100} cy={118} s={1.15} />
        </g>
      )}

      {stage === 4 && (
        <g>
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
          {showBranch && (
            <BranchDecoration branch={branch} stage={4} leafColor={p.leaf} />
          )}
          <Face mood={mood} cx={100} cy={114} s={1.3} />
          <Cheeks palette={p} cx={100} cy={114} s={1.3} />
        </g>
      )}
    </svg>
  );
}

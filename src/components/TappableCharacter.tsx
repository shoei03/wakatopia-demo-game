"use client";

import { useState, type ComponentProps, type CSSProperties } from "react";
import CharacterSvg from "./CharacterSvg";

type Reaction = "jump" | "spin" | "squish";

const REACTIONS: Reaction[] = ["jump", "spin", "squish"];
const PARTICLE_EMOJIS = ["💚", "✨", "❤️", "🌟"];

type Particle = { id: number; emoji: string; x: number; y: number };

// タップするとランダムなリアクション+パーティクルが出るキャラ表示
// (アイドル時のぷかぷか=animate-bobも内包するので、呼び出し側でのラップは不要)
export default function TappableCharacter(
  props: ComponentProps<typeof CharacterSvg>
) {
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [tapCount, setTapCount] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);

  const onTap = () => {
    setReaction(REACTIONS[Math.floor(Math.random() * REACTIONS.length)]);
    setTapCount((c) => c + 1); // keyを変えてアニメーションを再トリガー
    const base = Date.now();
    setParticles(
      Array.from({ length: 5 }, (_, i) => ({
        id: base + i,
        emoji:
          PARTICLE_EMOJIS[Math.floor(Math.random() * PARTICLE_EMOJIS.length)],
        x: (Math.random() - 0.5) * 100,
        y: -36 - Math.random() * 56,
      }))
    );
  };

  return (
    <div
      className="relative inline-block cursor-pointer select-none touch-manipulation"
      onPointerDown={onTap}
      role="button"
      aria-label="キャラクターをなでる"
    >
      <div className="animate-bob">
        <div
          key={tapCount}
          className={reaction ? `animate-char-${reaction}` : undefined}
          onAnimationEnd={() => setReaction(null)}
        >
          <CharacterSvg {...props} />
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p) => (
          <span
            key={p.id}
            className="animate-burst absolute left-1/2 top-1/3 -ml-3 text-2xl"
            style={
              {
                "--burst-x": `${p.x}px`,
                "--burst-y": `${p.y}px`,
              } as CSSProperties
            }
          >
            {p.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import CharacterSvg from "./CharacterSvg";
import {
  levelFromExp,
  MAX_SCORE,
  moodOf,
  stageFromLevel,
  STAGE_NAMES,
  VEGGIE_LABELS,
  type MealReport,
} from "@/lib/game";
import { submitMeal, type MealResult } from "@/lib/meals";
import type { Character } from "@/lib/types";

type Step = "input" | "submitting" | "result";

export default function MealUploadModal({
  character,
  onClose,
  onComplete,
}: {
  character: Character;
  onClose: () => void;
  onComplete: (result: MealResult) => void;
}) {
  const [step, setStep] = useState<Step>("input");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [veggieAmount, setVeggieAmount] = useState<0 | 1 | 2 | 3 | null>(null);
  const [hasProtein, setHasProtein] = useState<boolean | null>(null);
  const [hasCarbs, setHasCarbs] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MealResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const pickFile = (f: File) => {
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const canSubmit =
    file !== null &&
    veggieAmount !== null &&
    hasProtein !== null &&
    hasCarbs !== null;

  const submit = async () => {
    if (!canSubmit || !file || veggieAmount === null) return;
    setStep("submitting");
    setError(null);
    const report: MealReport = {
      veggieAmount,
      hasProtein: hasProtein!,
      hasCarbs: hasCarbs!,
    };
    try {
      const r = await submitMeal(character, file, report);
      setResult(r);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "記録に失敗しました");
      setStep("input");
    }
  };

  const finish = () => {
    if (result) onComplete(result);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[92dvh] overflow-y-auto">
        {step !== "result" && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold">🍽️ ごはんをきろく</h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-leaf-50 text-foreground/60 font-bold"
              aria-label="とじる"
            >
              ✕
            </button>
          </div>
        )}

        {step === "input" && (
          <div className="space-y-5">
            {/* 写真 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickFile(f);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-leaf-200 bg-leaf-50 flex items-center justify-center overflow-hidden"
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="食事のプレビュー"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-foreground/50 font-bold">
                  📸 タップして写真をえらぶ
                </span>
              )}
            </button>

            {/* 質問1: 野菜 */}
            <div>
              <p className="font-bold mb-2">🥗 野菜はどのくらい?</p>
              <div className="grid grid-cols-4 gap-2">
                {VEGGIE_LABELS.map((label, i) => (
                  <button
                    key={label}
                    onClick={() => setVeggieAmount(i as 0 | 1 | 2 | 3)}
                    className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${
                      veggieAmount === i
                        ? "bg-leaf-500 border-leaf-500 text-white"
                        : "bg-white border-leaf-100 text-foreground/70"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 質問2・3 */}
            {(
              [
                ["🍖 タンパク質はある?", hasProtein, setHasProtein],
                ["🍚 主食はある?", hasCarbs, setHasCarbs],
              ] as const
            ).map(([q, value, setValue]) => (
              <div key={q}>
                <p className="font-bold mb-2">{q}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      onClick={() => setValue(v)}
                      className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${
                        value === v
                          ? "bg-leaf-500 border-leaf-500 text-white"
                          : "bg-white border-leaf-100 text-foreground/70"
                      }`}
                    >
                      {v ? "ある" : "ない"}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {error && (
              <p className="text-sm text-red-500 font-bold">{error}</p>
            )}

            <button
              onClick={submit}
              disabled={!canSubmit}
              className="w-full h-14 rounded-full bg-leaf-500 text-white font-extrabold text-lg shadow-md disabled:opacity-40 active:scale-95 transition-transform"
            >
              ごはんをあげる
            </button>
          </div>
        )}

        {step === "submitting" && (
          <div className="py-16 flex flex-col items-center gap-4">
            <div className="animate-bob">
              <CharacterSvg
                stage={stageFromLevel(levelFromExp(character.exp))}
                mood="ok"
                size={120}
              />
            </div>
            <p className="font-bold text-foreground/60">もぐもぐ…</p>
          </div>
        )}

        {step === "result" && result && (
          <ResultView result={result} onFinish={finish} />
        )}
      </div>
    </div>
  );
}

function ResultView({
  result,
  onFinish,
}: {
  result: MealResult;
  onFinish: () => void;
}) {
  const c = result.character;
  const level = levelFromExp(c.exp);
  const stage = stageFromLevel(level);
  const mood = moodOf(c.last_meal_date, c.recent_veggie_avg);

  return (
    <div className="py-4 flex flex-col items-center gap-4 text-center animate-pop-in">
      <div className="animate-bob">
        <CharacterSvg stage={stage} mood={mood} size={150} />
      </div>

      {result.evolved ? (
        <p className="text-xl font-extrabold text-leaf-600">
          🎉 {STAGE_NAMES[stage]}に進化した!
        </p>
      ) : result.leveledUp ? (
        <p className="text-xl font-extrabold text-leaf-600">
          ⬆️ レベルアップ! Lv.{result.newLevel}
        </p>
      ) : (
        <p className="text-xl font-extrabold text-leaf-600">
          ごちそうさま!
        </p>
      )}

      <div className="w-full rounded-2xl bg-leaf-50 p-4">
        <p className="text-sm text-foreground/60 font-bold mb-1">
          きょうのごはんスコア
        </p>
        <p className="text-3xl font-extrabold text-leaf-700">
          {result.score}
          <span className="text-base text-foreground/50"> / {MAX_SCORE}</span>
        </p>
        <p className="text-sm text-foreground/60 mt-1">
          +{result.score} EXP / 🔥 {c.streak}日連続
        </p>
      </div>

      {result.score < 6 && (
        <p className="text-sm text-foreground/60">
          次は野菜をもうすこし足してみよう🥬
        </p>
      )}

      <button
        onClick={onFinish}
        className="w-full h-12 rounded-full bg-leaf-500 text-white font-bold active:scale-95 transition-transform"
      >
        とじる
      </button>
    </div>
  );
}

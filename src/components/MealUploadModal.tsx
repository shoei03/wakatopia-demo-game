"use client";

import { useEffect, useRef, useState } from "react";
import CharacterSvg from "./CharacterSvg";
import MealResultView from "./MealResultView";
import {
  defaultSlot,
  levelFromExp,
  SLOT_LABELS,
  stageFromLevel,
  VEGGIE_LABELS,
  veggieAmountFromGrams,
  type MealReport,
  type MealSlot,
} from "@/lib/game";
import { submitMeal, type MealResult } from "@/lib/meals";
import type { Character } from "@/lib/types";

type Step = "input" | "submitting" | "result";

const GRAM_PRESETS = [0, 50, 100, 150, 200] as const;
const SLOTS: MealSlot[] = ["morning", "noon", "evening"];

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
  const [slot, setSlot] = useState<MealSlot>(defaultSlot());
  const [veggieGrams, setVeggieGrams] = useState<number | null>(null);
  const [hasProtein, setHasProtein] = useState<boolean | null>(null);
  const [hasCarbs, setHasCarbs] = useState<boolean | null>(null);
  const [tastiness, setTastiness] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MealResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
    veggieGrams !== null &&
    hasProtein !== null &&
    hasCarbs !== null &&
    tastiness !== null;

  const submit = async () => {
    if (
      !file ||
      veggieGrams === null ||
      hasProtein === null ||
      hasCarbs === null ||
      tastiness === null
    )
      return;
    setStep("submitting");
    setError(null);
    const report: MealReport = {
      veggieGrams,
      hasProtein,
      hasCarbs,
      tastiness,
      slot,
    };
    try {
      const r = await submitMeal(character, file, report);
      setResult(r);
      setStep("result");
      notifyFriends(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "記録に失敗しました");
      setStep("input");
    }
  };

  // 他ユーザへの投稿通知(失敗しても投稿フローは止めない)
  const notifyFriends = (r: MealResult) => {
    import("@/lib/push-client")
      .then((m) => m.notifyFriendPost(r.character.name, r.score))
      .catch(() => {});
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
            {/* 写真(アルバム選択 / カメラ直接起動の2系統) */}
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
            {/* capture指定でモバイルはカメラが直接開く(端末の写真ライブラリには保存されない) */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickFile(f);
              }}
            />
            <div>
              <button
                onClick={() => cameraInputRef.current?.click()}
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
                    📸 タップしてカメラでとる
                  </span>
                )}
              </button>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-2.5 rounded-xl text-sm font-bold border-2 bg-white border-leaf-100 text-foreground/70"
                >
                  📷 カメラでとる
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2.5 rounded-xl text-sm font-bold border-2 bg-white border-leaf-100 text-foreground/70"
                >
                  🖼 アルバムからえらぶ
                </button>
              </div>
            </div>

            {/* いつのごはん? */}
            <div>
              <p className="font-bold mb-2">🕐 いつのごはん?</p>
              <div className="grid grid-cols-3 gap-2">
                {SLOTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlot(s)}
                    className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${
                      slot === s
                        ? "bg-leaf-500 border-leaf-500 text-white"
                        : "bg-white border-leaf-100 text-foreground/70"
                    }`}
                  >
                    {SLOT_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* 野菜のグラム数 */}
            <div>
              <p className="font-bold mb-2">
                🥗 野菜はどのくらい?
                {veggieGrams !== null && (
                  <span className="text-leaf-600 font-bold text-sm ml-2">
                    {veggieGrams}g(
                    {VEGGIE_LABELS[veggieAmountFromGrams(veggieGrams)]})
                  </span>
                )}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {GRAM_PRESETS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setVeggieGrams(g)}
                    className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${
                      veggieGrams === g
                        ? "bg-leaf-500 border-leaf-500 text-white"
                        : "bg-white border-leaf-100 text-foreground/70"
                    }`}
                  >
                    {g}g
                  </button>
                ))}
              </div>
            </div>

            {/* タンパク質・主食 */}
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

            {/* おいしさ */}
            <div>
              <p className="font-bold mb-2">😋 おいしかった?</p>
              <div className="grid grid-cols-5 gap-2">
                {([1, 2, 3, 4, 5] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTastiness(t)}
                    aria-label={`おいしさ${t}`}
                    className={`py-2.5 rounded-xl text-lg border-2 transition-colors ${
                      tastiness !== null && t <= tastiness
                        ? "bg-amber-100 border-amber-300"
                        : "bg-white border-leaf-100 opacity-50"
                    }`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-500 font-bold">{error}</p>}

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

        {step === "result" && result && tastiness !== null && (
          <MealResultView
            result={result}
            tastiness={tastiness}
            onFinish={finish}
          />
        )}
      </div>
    </div>
  );
}

import { DAILY_VEGGIE_TARGET_G } from "@/lib/game";

// 1日350gの野菜摂取メーター
export default function VeggieMeter({ todayGrams }: { todayGrams: number }) {
  const ratio = Math.min(todayGrams / DAILY_VEGGIE_TARGET_G, 1);
  const remaining = Math.max(DAILY_VEGGIE_TARGET_G - todayGrams, 0);
  const done = remaining === 0;

  return (
    <section className="rounded-2xl bg-white border border-leaf-100 shadow-sm p-4">
      <div className="flex items-baseline justify-between mb-2">
        <p className="font-extrabold text-sm">🥬 きょうの野菜</p>
        <p className="text-sm font-bold text-leaf-700">
          {todayGrams}
          <span className="text-foreground/40 text-xs">
            {" "}/ {DAILY_VEGGIE_TARGET_G}g
          </span>
        </p>
      </div>
      <div className="h-4 rounded-full bg-leaf-50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            done ? "bg-amber-400" : "bg-leaf-400"
          }`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <p className="text-[11px] text-foreground/50 mt-1.5 font-bold">
        {done
          ? "🎉 目標たっせい!きょうはバッチリ!"
          : `目標まであと ${remaining}g`}
      </p>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  getPushState,
  sendTestNotification,
  subscribeToPush,
  unsubscribeFromPush,
  type PushState,
} from "@/lib/push-client";
import type { NotificationPrefs } from "@/lib/types";

type SlotKey = "morning" | "noon" | "evening";

const SLOT_FIELDS: {
  key: SlotKey;
  label: string;
  enabledCol: "remind_morning" | "remind_noon" | "remind_evening";
  timeCol: "morning_time" | "noon_time" | "evening_time";
}[] = [
  { key: "morning", label: "朝", enabledCol: "remind_morning", timeCol: "morning_time" },
  { key: "noon", label: "昼", enabledCol: "remind_noon", timeCol: "noon_time" },
  { key: "evening", label: "晩", enabledCol: "remind_evening", timeCol: "evening_time" },
];

const DEFAULT_PREFS = {
  remind_morning: false,
  morning_time: "08:00",
  remind_noon: false,
  noon_time: "12:30",
  remind_evening: false,
  evening_time: "19:00",
  notify_on_friend_post: true,
};

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export default function NotificationSettings({ userId }: { userId: string }) {
  const [pushState, setPushState] = useState<PushState | null>(null);
  const [needsInstall, setNeedsInstall] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getPushState().then((state) => {
      setPushState(state);
      setNeedsInstall(isIos() && !isStandalone());
    });
    getSupabase()
      .from("notification_preferences")
      .select()
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const p = data as NotificationPrefs;
          setPrefs({
            remind_morning: p.remind_morning,
            morning_time: p.morning_time.slice(0, 5),
            remind_noon: p.remind_noon,
            noon_time: p.noon_time.slice(0, 5),
            remind_evening: p.remind_evening,
            evening_time: p.evening_time.slice(0, 5),
            notify_on_friend_post: p.notify_on_friend_post,
          });
        }
      });
  }, [userId]);

  const savePrefs = async (next: typeof DEFAULT_PREFS) => {
    setPrefs(next);
    const { error } = await getSupabase()
      .from("notification_preferences")
      .upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() });
    if (error) setMessage("設定の保存に失敗しました");
  };

  const togglePush = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (pushState === "subscribed") {
        await unsubscribeFromPush();
      } else {
        await subscribeToPush(userId);
      }
      setPushState(await getPushState());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "通知の設定に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setMessage(null);
    try {
      await sendTestNotification();
      setMessage("テスト通知を送りました(数秒後に届きます)");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "送信に失敗しました");
    }
  };

  const subscribed = pushState === "subscribed";

  return (
    <section className="rounded-2xl bg-white border border-leaf-100 shadow-sm p-4 space-y-4">
      <h2 className="font-extrabold">🔔 通知</h2>

      {needsInstall ? (
        <div className="rounded-xl bg-leaf-50 p-3 text-sm text-foreground/70 space-y-1">
          <p className="font-bold">iPhoneで通知を受け取るには</p>
          <p>
            Safariの共有ボタン →「ホーム画面に追加」でアプリとして開いてね。
            そのあとこの画面で通知をオンにできるよ。
          </p>
        </div>
      ) : pushState === "unsupported" ? (
        <p className="text-sm text-foreground/50">
          このブラウザはプッシュ通知に対応していません
        </p>
      ) : pushState === "denied" ? (
        <p className="text-sm text-foreground/50">
          通知がブロックされています。ブラウザの設定から許可してね。
        </p>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">プッシュ通知</p>
          <button
            onClick={togglePush}
            disabled={busy || pushState === null}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors disabled:opacity-40 ${
              subscribed
                ? "bg-leaf-500 text-white"
                : "bg-leaf-50 text-foreground/60"
            }`}
          >
            {busy ? "…" : subscribed ? "オン" : "オフ"}
          </button>
        </div>
      )}

      {subscribed && (
        <>
          <div className="space-y-2">
            <p className="text-sm font-bold text-foreground/70">
              ごはんの時間にリマインド
            </p>
            {SLOT_FIELDS.map(({ key, label, enabledCol, timeCol }) => (
              <div key={key} className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={prefs[enabledCol]}
                    onChange={(e) =>
                      savePrefs({ ...prefs, [enabledCol]: e.target.checked })
                    }
                    className="w-4 h-4 accent-leaf-500"
                  />
                  {label}ごはん
                </label>
                <input
                  type="time"
                  value={prefs[timeCol]}
                  disabled={!prefs[enabledCol]}
                  onChange={(e) =>
                    savePrefs({ ...prefs, [timeCol]: e.target.value })
                  }
                  className="px-2 py-1 rounded-lg border border-leaf-100 text-sm font-bold disabled:opacity-40"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={prefs.notify_on_friend_post}
                onChange={(e) =>
                  savePrefs({ ...prefs, notify_on_friend_post: e.target.checked })
                }
                className="w-4 h-4 accent-leaf-500"
              />
              🌳 ほかの人の投稿を通知
            </label>
          </div>

          <button
            onClick={test}
            className="w-full py-2 rounded-full bg-leaf-50 text-leaf-700 text-sm font-bold"
          >
            テスト通知を送る
          </button>
        </>
      )}

      {message && (
        <p className="text-sm text-foreground/60 font-bold">{message}</p>
      )}
    </section>
  );
}

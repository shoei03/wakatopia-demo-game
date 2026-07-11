import { NextResponse } from "next/server";
import { jstNow, todayStrJst, type MealSlot } from "@/lib/game";
import { getServiceRoleClient } from "@/lib/supabase-admin";
import { sendPushToUser, type NotificationKind } from "@/lib/push-server";
import type { NotificationPrefs } from "@/lib/types";

// 15分ごとに外部スケジューラ(GitHub Actions等)から叩かれるリマインダー送信
// 各ユーザーの設定時刻(JST)からWINDOW_MINUTES以内なら送信する
export const dynamic = "force-dynamic";

// GitHub Actionsのscheduleは実測で60〜96分遅延することがあるため広めに取る。
// notification_logの「同種は1日1回」チェックがあるので二重送信にはならない。
const WINDOW_MINUTES = 90;

const SLOTS: {
  slot: MealSlot;
  kind: NotificationKind;
  enabledCol: keyof NotificationPrefs;
  timeCol: keyof NotificationPrefs;
}[] = [
  {
    slot: "morning",
    kind: "reminder_morning",
    enabledCol: "remind_morning",
    timeCol: "morning_time",
  },
  {
    slot: "noon",
    kind: "reminder_noon",
    enabledCol: "remind_noon",
    timeCol: "noon_time",
  },
  {
    slot: "evening",
    kind: "reminder_evening",
    enabledCol: "remind_evening",
    timeCol: "evening_time",
  },
];

// "HH:MM" または "HH:MM:SS" を0時からの分数に変換
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getServiceRoleClient();
  const now = jstNow();
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  // JSTの今日0時(重複送信チェックと当日の食事チェック用)
  const todayStartIso = new Date(
    `${todayStrJst()}T00:00:00+09:00`
  ).toISOString();

  const { data: prefsRows } = await admin
    .from("notification_preferences")
    .select();
  const allPrefs = (prefsRows ?? []) as NotificationPrefs[];

  let sent = 0;
  for (const prefs of allPrefs) {
    for (const { slot, kind, enabledCol, timeCol } of SLOTS) {
      if (!prefs[enabledCol]) continue;
      const diff = nowMinutes - toMinutes(prefs[timeCol] as string);
      if (diff < 0 || diff >= WINDOW_MINUTES) continue;

      // きょう同じ種類の通知を送っていたらスキップ
      const { count: alreadySent } = await admin
        .from("notification_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", prefs.user_id)
        .eq("kind", kind)
        .gte("sent_at", todayStartIso);
      if ((alreadySent ?? 0) > 0) continue;

      // きょうそのスロットの食事をもう記録していたらスキップ
      const { count: alreadyAte } = await admin
        .from("meals")
        .select("id", { count: "exact", head: true })
        .eq("user_id", prefs.user_id)
        .eq("meal_slot", slot)
        .gte("created_at", todayStartIso);
      if ((alreadyAte ?? 0) > 0) continue;

      const { data: character } = await admin
        .from("characters")
        .select("name")
        .eq("user_id", prefs.user_id)
        .maybeSingle();
      const name = character?.name ?? "相棒";

      sent += await sendPushToUser(admin, prefs.user_id, kind, {
        title: "わかとぴあ",
        body: `🥬 ごはんの時間だよ!${name}がおなかをすかせてる`,
        url: "/home",
      });
    }
  }

  return NextResponse.json({ sent, checked: allPrefs.length });
}

import { NextResponse } from "next/server";
import {
  getServiceRoleClient,
  getUserIdFromAuthHeader,
} from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push-server";

// 投稿完了時に他ユーザへ「ごはんを食べたよ」通知を送る
export async function POST(req: Request) {
  const posterId = await getUserIdFromAuthHeader(req);
  if (!posterId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let characterName = "だれか";
  try {
    const body = (await req.json()) as { characterName?: string };
    if (typeof body.characterName === "string" && body.characterName.trim()) {
      characterName = body.characterName.trim().slice(0, 12);
    }
  } catch {
    // bodyが壊れていてもデフォルト名で送る
  }

  const admin = getServiceRoleClient();

  // 購読者(投稿者以外)のうち、友だち投稿通知をオフにしていない人へ送る
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id")
    .neq("user_id", posterId);
  const candidateIds = [...new Set((subs ?? []).map((s) => s.user_id))];
  if (candidateIds.length === 0) return NextResponse.json({ sent: 0 });

  const { data: optOuts } = await admin
    .from("notification_preferences")
    .select("user_id")
    .eq("notify_on_friend_post", false)
    .in("user_id", candidateIds);
  const optOutSet = new Set((optOuts ?? []).map((p) => p.user_id));
  const targets = candidateIds.filter((id) => !optOutSet.has(id));

  let sent = 0;
  // デモ規模なので直列送信で十分。ユーザーが増えたらキュー化する。
  for (const userId of targets) {
    sent += await sendPushToUser(admin, userId, "friend_post", {
      title: "わかとぴあ",
      body: `🌳 ${characterName}がごはんを食べたよ!`,
      url: "/plaza",
    });
  }

  return NextResponse.json({ sent });
}

import { NextResponse } from "next/server";
import {
  getServiceRoleClient,
  getUserIdFromAuthHeader,
} from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push-server";

// 投稿完了時にフレンドへ「ごはんを食べたよ」通知を送る
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

  // 投稿者の承認済みフレンドを取得(フレンド機能導入後は全員配信ではなくフレンドのみ)
  const { data: friendships } = await admin
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${posterId},addressee_id.eq.${posterId}`);
  const friendIds = [
    ...new Set(
      (friendships ?? []).map((f) =>
        f.requester_id === posterId ? f.addressee_id : f.requester_id
      )
    ),
  ];
  if (friendIds.length === 0) return NextResponse.json({ sent: 0 });

  // フレンドのうち購読していて、投稿通知をオフにしていない人へ送る
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id")
    .in("user_id", friendIds);
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

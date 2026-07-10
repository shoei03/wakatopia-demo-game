import { NextResponse } from "next/server";
import {
  getServiceRoleClient,
  getUserIdFromAuthHeader,
} from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push-server";

// フレンド申請時に相手へプッシュ通知を送る
export async function POST(req: Request) {
  const requesterId = await getUserIdFromAuthHeader(req);
  if (!requesterId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let targetUserId: string;
  try {
    const body = (await req.json()) as { targetUserId?: string };
    if (!body.targetUserId) throw new Error();
    targetUserId = body.targetUserId;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const admin = getServiceRoleClient();

  // スパム対策: 実際にpendingの申請行が存在する場合のみ送る
  const { count } = await admin
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("requester_id", requesterId)
    .eq("addressee_id", targetUserId)
    .eq("status", "pending");
  if ((count ?? 0) === 0) {
    return NextResponse.json({ error: "no pending request" }, { status: 400 });
  }

  const { data: character } = await admin
    .from("characters")
    .select("name")
    .eq("user_id", requesterId)
    .maybeSingle();
  const name = character?.name ?? "だれか";

  const sent = await sendPushToUser(admin, targetUserId, "friend_request", {
    title: "わかとぴあ",
    body: `👥 ${name}からフレンドしんせいがきたよ!`,
    url: "/friends",
  });

  return NextResponse.json({ sent });
}

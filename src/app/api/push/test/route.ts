import { NextResponse } from "next/server";
import {
  getServiceRoleClient,
  getUserIdFromAuthHeader,
} from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push-server";

// 設定画面の「テスト通知」ボタン用: 自分にだけ送る
export async function POST(req: Request) {
  const userId = await getUserIdFromAuthHeader(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sent = await sendPushToUser(getServiceRoleClient(), userId, "test", {
    title: "わかとぴあ",
    body: "🥬 テスト通知だよ!ちゃんと届いてるね",
    url: "/home",
  });

  return NextResponse.json({ sent });
}

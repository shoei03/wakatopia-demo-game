import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase-admin";

// Service Workerのpushsubscriptionchangeから呼ばれる購読引き継ぎ
// SWコンテキストには認証セッションがないため、旧endpointの所有をもって本人とみなす
// (endpointはpushサービスが発行する推測不能なURLなのでなりすましは実質できない)
export async function POST(req: Request) {
  let body: {
    oldEndpoint?: string;
    subscription?: {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { oldEndpoint, subscription } = body;
  if (
    !oldEndpoint ||
    !subscription?.endpoint ||
    !subscription.keys?.p256dh ||
    !subscription.keys?.auth
  ) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const admin = getServiceRoleClient();
  const { data: updated, error } = await admin
    .from("push_subscriptions")
    .update({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })
    .eq("endpoint", oldEndpoint)
    .select("id");

  if (error) {
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
  return NextResponse.json({ updated: (updated ?? []).length });
}

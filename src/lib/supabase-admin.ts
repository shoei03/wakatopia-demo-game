import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerAnonClient } from "./supabase";

// service role クライアント(RLSをバイパスする。APIルート内でのみ使うこと)
export function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください"
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Authorization: Bearer <supabase access token> を検証してユーザーIDを返す
export async function getUserIdFromAuthHeader(
  req: Request
): Promise<string | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length);
  const { data, error } = await getServerAnonClient().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

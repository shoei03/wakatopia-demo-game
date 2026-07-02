import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasSupabaseEnv(): boolean {
  return Boolean(url && anonKey);
}

let browserClient: SupabaseClient | null = null;

// ブラウザ用クライアント(認証セッションを保持する)
export function getSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      ".env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください"
    );
  }
  if (!browserClient) {
    browserClient = createClient(url, anonKey);
  }
  return browserClient;
}

// サーバー用クライアント(公開データの読み取り専用。セッションは持たない)
export function getServerAnonClient(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      ".env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください"
    );
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

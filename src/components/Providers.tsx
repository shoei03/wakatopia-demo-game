"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getSupabase, hasSupabaseEnv } from "@/lib/supabase";

// TanStack Queryのルートプロバイダ。
// staleTime内(30秒)のタブ間往復はキャッシュ即表示になり、再フェッチしない。
export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      })
  );

  // 認証状態とキャッシュを同期する(ログアウトで全破棄、更新でセッション差し替え)
  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        queryClient.clear();
      } else {
        queryClient.setQueryData(["session"], session);
      }
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

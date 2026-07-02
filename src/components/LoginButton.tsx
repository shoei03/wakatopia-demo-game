"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function LoginButton() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // ログイン済みならそのままホームへ
  useEffect(() => {
    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) {
          router.replace("/home");
        } else {
          setChecking(false);
        }
      });
  }, [router]);

  const signIn = async () => {
    await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/home` },
    });
  };

  if (checking) {
    return <div className="h-14 flex items-center text-foreground/50">…</div>;
  }

  return (
    <button
      onClick={signIn}
      className="h-14 px-8 rounded-full bg-leaf-500 text-white font-bold text-lg shadow-md active:scale-95 transition-transform"
    >
      Googleではじめる
    </button>
  );
}

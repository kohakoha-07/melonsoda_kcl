"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthStatus() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("確認中…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function checkUser() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) throw error;

        if (!data.user) {
          setMessage("ログインしていません");
          return;
        }

        setName(data.user.user_metadata.username || "音楽好きのあなた");
        setMessage("");
      } catch {
        setMessage("ログイン情報を取得できませんでした");
      }
    }

    void checkUser();
  }, []);

  async function logout() {
    setBusy(true);
    setMessage("");

    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;

      router.replace("/login");
      router.refresh();
    } catch {
      setMessage("ログアウトできませんでした。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {name && (
        <>
          <button
            className="button soft"
            onClick={logout}
            disabled={busy}
          >
            {busy ? "処理中…" : "ログアウト"}
          </button>
        </>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
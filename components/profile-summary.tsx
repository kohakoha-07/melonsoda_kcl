"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadMyProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  username: string | null;
  bio: string | null;
};

export default function ProfileSummary() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const supabase = createClient();
        const { data: auth, error: authError } =
          await supabase.auth.getUser();

        if (authError || !auth.user) {
          throw new Error("ログインしてください。");
        }

        const data = await loadMyProfile();

        if (active) {
          setUserId(auth.user.id);
          setProfile(data);
        }
      } catch (error) {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "プロフィールを読み込めませんでした。",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p role="status">プロフィールを読み込み中…</p>;
  }

  if (error) {
    return (
      <section className="profile-card">
        <p role="alert">{error}</p>
        <Link href="/login">ログイン画面へ</Link>
      </section>
    );
  }

  return (
    <section className="profile-card">
      <div className="profile-cover">♪ ♫ ✧</div>
      <span className="avatar profile-avatar mint">🎧</span>
      <span className="profile-label">MY PROFILE</span>

      <h2>{profile?.username || "名前を設定しよう"}</h2>

      <p style={{ whiteSpace: "pre-wrap" }}>
        {profile?.bio || "自己紹介はまだありません。"}
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Link href="/profile/edit" className="button primary">
          プロフィール編集
        </Link>

        {profile && userId && (
          <Link href={`/profile/${userId}`} className="button soft">
            ♫ プロフィールを共有
          </Link>
        )}
      </div>

      {!profile && (
        <p>共有するには、先にプロフィールを保存してください。</p>
      )}
    </section>
  );
}
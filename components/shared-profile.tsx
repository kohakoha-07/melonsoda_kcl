"use client";

import FollowConnections from "@/components/follow-connections";
import ProfileQr from "@/components/profile-qr";
import FollowButton from "@/components/follow-button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  username: string | null;
  bio: string | null;
};

export default function SharedProfile({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      setProfile(null);

      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("profiles")
          .select("username, bio")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) throw error;
        if (active) setProfile(data);
      } catch {
        if (active) {
          setError("プロフィールを読み込めませんでした。");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) return <p role="status">読み込み中…</p>;
  if (error) return <p role="alert">{error}</p>;

  if (!profile) {
    return (
      <section className="auth-card">
        <p>プロフィールが見つからないか、閲覧する権限がありません。</p>
        <Link href="/login">ログイン画面へ</Link>
      </section>
    );
  }

  return (
    <section className="profile-card">
      <div className="profile-cover">♪ ♫ ✧</div>
      <span className="avatar profile-avatar mint">🎧</span>
      <h1>{profile.username || "音楽好きのユーザー"}</h1>

      <p style={{ whiteSpace: "pre-wrap" }}>
        {profile.bio || "自己紹介はまだありません。"}
      </p>

     <FollowConnections key={`connections-${userId}`} userId={userId} />
<FollowButton key={`follow-${userId}`} userId={userId} />
<ProfileQr userId={userId} />

      <Link href="/" className="button soft">
        ホームへ
      </Link>
    </section>
  );
}
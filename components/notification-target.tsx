"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import MeloopLogo from "@/components/meloop-logo";
import AuthStatus from "@/components/auth-status";
import NotificationBell from "@/components/notification-bell";
import PostFeed from "@/components/post-feed";
import LiveCalendar from "@/components/live-calendar";
import { loadNotificationLiveDate, notificationError } from "@/lib/notifications";

export default function NotificationTarget({ kind, targetId }: { kind: "post" | "live"; targetId: string }) {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let changed = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      changed = true;
      if (active) setUserId(session?.user.id ?? null);
    });
    void supabase.auth.getUser().then(({ data, error }) => {
      if (active && !changed) setUserId(error ? null : data.user?.id ?? null);
    }).catch(() => { if (active && !changed) setUserId(null); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  return <div style={{ maxWidth: 980, margin: "0 auto", padding: "20px 16px 80px" }}>
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
      <Link href="/" aria-label="meloop ホームへ"><MeloopLogo /></Link>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><NotificationBell /><AuthStatus /></div>
    </header>
    <nav aria-label="通知からの移動先メニュー" style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
      <Link href="/">ホーム</Link><Link href="/live">ライブ</Link><Link href="/profile">プロフィール</Link>
    </nav>
    <main>
      {userId === undefined ? <p role="status">読み込み中…</p> : !userId ? (
        <section><p>通知の内容を見るにはログインしてください。</p><Link href="/login" className="button primary">ログイン</Link></section>
      ) : kind === "post" ? (
        <section key={`${userId}-${targetId}`}><h1>通知の投稿</h1><PostFeed tab="all" postId={targetId} /></section>
      ) : <LiveTarget key={`${userId}-${targetId}`} targetId={targetId} />}
    </main>
  </div>;
}

function LiveTarget({ targetId }: { targetId: string }) {
  const [date, setDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void loadNotificationLiveDate(targetId).then((value) => {
      if (active) setDate(value);
    }).catch((error) => { if (active) setError(notificationError(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [targetId, revision]);
  if (loading) return <p role="status">ライブ予定を読み込み中…</p>;
  if (error) return <section><p role="alert">{error}</p><button type="button" className="button soft" onClick={() => setRevision((value) => value + 1)}>再読み込み</button></section>;
  if (!date) return <p>この予定は削除されたか、フォロー関係の変更などで閲覧できなくなっています。</p>;
  return <LiveCalendar initialDate={date} initialEventId={targetId} />;
}

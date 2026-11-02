"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import UserAvatar from "@/components/user-avatar";
import { unreadNotificationCount, loadNotifications, markNotificationsRead,
  notificationHref, notificationError, type ActivityNotification } from "@/lib/notifications";
import styles from "./notification-bell.module.css";

export default function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null);
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
  return userId ? <UserBell key={userId} userId={userId} /> : null;
}

function UserBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [items, setItems] = useState<ActivityNotification[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const generation = useRef(0);
  const locked = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current += 1; };
  }, []);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    if (open) setLoading(true);
    try {
      const [unread, list] = await Promise.all([
        unreadNotificationCount(userId),
        open ? loadNotifications(userId, page) : Promise.resolve(null),
      ]);
      if (!mounted.current || current !== generation.current) return;
      setCount(unread);
      if (list) { setItems(list.items); setHasMore(list.hasMore); }
      setError("");
    } catch (error) {
      if (mounted.current && current === generation.current) setError(notificationError(error));
    } finally {
      if (mounted.current && current === generation.current) setLoading(false);
    }
  }, [userId, open, page]);

  useEffect(() => {
    void refresh();
    function foregroundRefresh() {
      if (document.visibilityState === "visible" && !locked.current) void refresh();
    }
    const timer = window.setInterval(foregroundRefresh, 30000);
    window.addEventListener("focus", foregroundRefresh);
    document.addEventListener("visibilitychange", foregroundRefresh);
    return () => {
      generation.current += 1;
      window.clearInterval(timer);
      window.removeEventListener("focus", foregroundRefresh);
      document.removeEventListener("visibilitychange", foregroundRefresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    title.current?.focus();
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); button.current?.focus(); }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  async function readAll() {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    generation.current += 1;
    try {
      await markNotificationsRead(userId);
      await refresh();
    } catch (error) {
      if (mounted.current) setError(notificationError(error));
    } finally { locked.current = false; if (mounted.current) setBusy(false); }
  }
  async function visit(item: ActivityNotification) {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    generation.current += 1;
    try {
      if (!item.readAt) await markNotificationsRead(userId, item.id);
      if (!mounted.current) return;
      setOpen(false);
      router.push(notificationHref(item));
    } catch (error) {
      if (mounted.current) setError(notificationError(error));
    } finally { locked.current = false; if (mounted.current) setBusy(false); }
  }

  return <div ref={root} className={styles.root}>
    <button ref={button} type="button" className={styles.bell} aria-expanded={open}
      aria-controls={panelId} aria-label={`通知${count === null ? "" : `、未読${count}件`}${error ? "、更新エラーあり" : ""}`}
      onClick={() => { setPage(0); setOpen((value) => !value); }}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4M12 2V1" />
      </svg>
      {(count ?? 0) > 0 && <span className={styles.badge} aria-hidden="true">{count! > 99 ? "99+" : count}</span>}
      {error && <span className={styles.errorDot} aria-hidden="true">!</span>}
    </button>
    {open && <section id={panelId} className={styles.panel} aria-labelledby={`${panelId}-title`}>
      <div className={styles.heading}>
        <h2 id={`${panelId}-title`} ref={title} tabIndex={-1}>お知らせ</h2>
        <button type="button" className={styles.textButton} onClick={() => { setOpen(false); button.current?.focus(); }}>閉じる</button>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.textButton} disabled={loading || busy} onClick={() => void refresh()}>更新</button>
        <button type="button" className={styles.textButton} disabled={busy || loading || !count} onClick={() => void readAll()}>すべて既読にする</button>
      </div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {loading ? <p role="status" className={styles.message}>読み込み中…</p> : !error && items.length === 0 ? (
        <p className={styles.message}>まだ通知はありません。</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => <li key={item.id}>
            <button type="button" disabled={busy} onClick={() => void visit(item)}
              className={`${styles.item} ${!item.readAt ? styles.unread : ""}`}>
              <UserAvatar url={item.avatarUrl} emoji={item.avatarEmoji} name={item.actorName} size={38} />
              <span className={styles.content}>
                <span><b>{item.actorName}</b>{item.kind === "comment" ? "さんが投稿にコメントしました" :
                  item.kind === "follow" ? "さんにフォローされました" : "さんがライブに「私も行きたい！」を付けました"}</span>
                {item.kind === "comment" && item.preview && <span className={styles.preview}>{item.preview}</span>}
                <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("ja-JP")}</time>
                {!item.readAt && <span className={styles.unreadLabel}>未読</span>}
              </span>
            </button>
          </li>)}
        </ul>
      )}
      <div className={styles.pagination}>
        <button type="button" className={styles.textButton} disabled={loading || busy || page === 0} onClick={() => setPage((value) => value - 1)}>前へ</button>
        <span>{page + 1}ページ</span>
        <button type="button" className={styles.textButton} disabled={loading || busy || !hasMore} onClick={() => setPage((value) => value + 1)}>次へ</button>
      </div>
      <p className={styles.footnote}>アプリを開いている間、約30秒ごとに更新します。</p>
    </section>}
  </div>;
}

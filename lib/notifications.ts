import { createClient } from "@/lib/supabase/client";

export const NOTIFICATION_PAGE_SIZE = 20;
export type ActivityNotification = {
  id: string;
  createdAt: string;
  readAt: string | null;
  actorId: string;
  actorName: string;
  avatarUrl: string | null;
  avatarEmoji: string;
  kind: "comment" | "follow" | "live_interest";
  postId: string | null;
  liveEventId: string | null;
  preview: string;
};
export function notificationError(error: unknown): string {
  return typeof error === "object" && error !== null && "message" in error
    ? String(error.message) : "通知を読み込めませんでした。";
}
export function notificationHref(item: ActivityNotification): string {
  if (item.kind === "comment" && item.postId) return `/notifications/post/${item.postId}`;
  if (item.kind === "live_interest" && item.liveEventId) return `/notifications/live/${item.liveEventId}`;
  return `/profile/${item.actorId}`;
}
export async function unreadNotificationCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase.from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId).is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
export async function loadNotifications(userId: string, page: number) {
  const supabase = createClient();
  const offset = Math.max(0, page) * NOTIFICATION_PAGE_SIZE;
  const { data, error } = await supabase.from("notifications")
    .select("id, created_at, read_at, actor_id, kind, post_id, live_event_id, preview")
    .eq("recipient_id", userId).order("created_at", { ascending: false })
    .order("id", { ascending: false }).range(offset, offset + NOTIFICATION_PAGE_SIZE);
  if (error) throw new Error(error.message);
  const visible = (data ?? []).slice(0, NOTIFICATION_PAGE_SIZE);
  const actors = [...new Set(visible.map((row) => row.actor_id))];
  const names = new Map<string, { name: string; url: string | null; emoji: string }>();
  if (actors.length) {
    const { data: profiles, error } = await supabase.from("profiles")
      .select("user_id, username, avatar_url, avatar_emoji").in("user_id", actors);
    if (error) throw new Error(error.message);
    for (const profile of profiles ?? []) names.set(profile.user_id, {
      name: profile.username || "名前未設定", url: profile.avatar_url || null, emoji: profile.avatar_emoji || "🎧",
    });
  }
  const items: ActivityNotification[] = visible.map((row) => ({
    id: String(row.id), createdAt: row.created_at, readAt: row.read_at,
    actorId: row.actor_id, actorName: names.get(row.actor_id)?.name ?? "ユーザー",
    avatarUrl: names.get(row.actor_id)?.url ?? null, avatarEmoji: names.get(row.actor_id)?.emoji ?? "🎧",
    kind: row.kind as ActivityNotification["kind"],
    postId: row.post_id === null ? null : String(row.post_id),
    liveEventId: row.live_event_id === null ? null : String(row.live_event_id),
    preview: row.preview || "",
  }));
  return { items, hasMore: (data?.length ?? 0) > NOTIFICATION_PAGE_SIZE };
}
export async function markNotificationsRead(userId: string, id?: string): Promise<void> {
  const supabase = createClient();
  let query = supabase.from("notifications").update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId).is("read_at", null);
  if (id) query = query.eq("id", id);
  const { error } = await query;
  if (error) throw new Error(error.message);
}
export async function loadNotificationPost(postId: string) {
  if (!/^[0-9]+$/.test(postId)) throw new Error("投稿IDが正しくありません。");
  const supabase = createClient();
  const { data, error } = await supabase.from("posts")
    .select("id, author_id, spotify_track_id, body, created_at")
    .eq("id", postId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? [data] : [];
}
export async function loadNotificationLiveDate(id: string): Promise<string | null> {
  if (!/^[0-9]+$/.test(id)) throw new Error("ライブのIDが正しくありません。");
  const supabase = createClient();
  const { data, error } = await supabase.from("live_events")
    .select("event_date").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.event_date ?? null;
}

import { createClient } from "@/lib/supabase/client";

export const LIVE_COLORS = [
  { value: "pink", label: "ピンク", background: "#f9e5e5", border: "#b96579" },
  { value: "blue", label: "青", background: "#e5edf7", border: "#567dae" },
  { value: "green", label: "緑", background: "#e2eddf", border: "#527b57" },
  { value: "yellow", label: "黄", background: "#f6efd8", border: "#9b7a25" },
  { value: "purple", label: "紫", background: "#eee4f6", border: "#8b64a6" },
] as const;
export type LiveColor = (typeof LIVE_COLORS)[number]["value"];
export type LiveDraft = {
  title: string;
  artist: string;
  eventDate: string;
  startTime: string;
  venue: string;
  officialUrl: string;
  note: string;
  color: LiveColor;
};
export type LivePerson = {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarEmoji: string;
};
export type LiveEvent = LiveDraft & {
  id: string;
  authorId: string;
  author: LivePerson;
  attendees: LivePerson[];
};
export function liveError(error: unknown): string {
  return typeof error === "object" && error !== null && "message" in error
    ? String(error.message) : "ライブ情報を処理できませんでした。";
}
export function officialLink(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}
function validId(id: string) {
  if (!/^[0-9]+$/.test(id)) throw new Error("ライブのIDが正しくありません。");
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
async function authenticated() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!user) throw new Error("ライブ情報を使うにはログインしてください。");
  return { supabase, user };
}

export async function loadLiveMonth(month: string): Promise<LiveEvent[]> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("月が正しくありません。");
  const { supabase } = await authenticated();
  const [year, number] = month.split("-").map(Number);
  const next = number === 12 ? `${year + 1}-01-01` : `${year}-${String(number + 1).padStart(2, "0")}-01`;
  type Row = { id: string | number; author_id: string; title: string; artist: string;
    event_date: string; start_time: string | null; venue: string; official_url: string;
    note: string; color: string };
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("live_events")
      .select("id, author_id, title, artist, event_date, start_time, venue, official_url, note, color")
      .gte("event_date", `${month}-01`).lt("event_date", next)
      .order("event_date").order("id").range(offset, offset + 499);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 500) break;
  }
  if (!rows.length) return [];
  const attendance: { event_id: string | number; user_id: string }[] = [];
  // 表示中の月に含まれる予定だけを取得する。
  for (let start = 0; start < rows.length; start += 100) {
    const ids = rows.slice(start, start + 100).map((row) => row.id);
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from("live_event_attendees")
        .select("event_id, user_id").in("event_id", ids)
        .order("event_id").order("user_id").range(offset, offset + 499);
      if (error) throw new Error(error.message);
      attendance.push(...(data ?? []));
      if ((data?.length ?? 0) < 500) break;
    }
  }
  const userIds = [...new Set([...rows.map((row) => row.author_id), ...attendance.map((row) => row.user_id)])];
  const people = new Map<string, LivePerson>();
  for (let start = 0; start < userIds.length; start += 100) {
    const { data, error } = await supabase.from("profiles")
      .select("user_id, username, avatar_url, avatar_emoji").in("user_id", userIds.slice(start, start + 100));
    if (error) throw new Error(error.message);
    for (const person of data ?? []) people.set(person.user_id, {
      id: person.user_id, name: person.username || "名前未設定",
      avatarUrl: person.avatar_url || null, avatarEmoji: person.avatar_emoji || "🎧",
    });
  }
  function person(id: string): LivePerson {
    return people.get(id) ?? { id, name: "名前未設定", avatarUrl: null, avatarEmoji: "🎧" };
  }
  const participants = new Map<string, LivePerson[]>();
  for (const entry of attendance) {
    const key = String(entry.event_id);
    const list = participants.get(key) ?? [];
    list.push(person(entry.user_id));
    participants.set(key, list);
  }
  return rows.map((row) => ({
    id: String(row.id), authorId: row.author_id, author: person(row.author_id),
    title: row.title, artist: row.artist, eventDate: row.event_date,
    startTime: row.start_time?.slice(0, 5) ?? "", venue: row.venue,
    officialUrl: row.official_url, note: row.note,
    color: LIVE_COLORS.some((color) => color.value === row.color) ? row.color as LiveColor : "pink",
    attendees: participants.get(String(row.id)) ?? [],
  }));
}

export async function saveLiveEvent(draft: LiveDraft, eventId?: string): Promise<void> {
  function text(value: string, label: string, max: number) {
    const clean = value.trim();
    if (!clean || Array.from(clean).length > max) throw new Error(`${label}は1〜${max}文字で入力してください。`);
    return clean;
  }
  const rawUrl = draft.officialUrl.trim();
  const url = rawUrl ? officialLink(rawUrl) : "";
  if (url === null || url.length > 2000) {
    throw new Error("公式リンクを入力する場合は、https://で始まる有効なURLにしてください。");
  }
  if (!validDate(draft.eventDate)) throw new Error("日付を選んでください。");
  if (draft.startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.startTime)) throw new Error("開演時刻を確認してください。");
  if (!LIVE_COLORS.some((color) => color.value === draft.color)) throw new Error("色を選んでください。");
  if (Array.from(draft.note).length > 280) throw new Error("ひとことは280文字以内で入力してください。");
  const values = {
    title: text(draft.title, "公演名", 100), artist: text(draft.artist, "アーティスト", 100),
    event_date: draft.eventDate, start_time: draft.startTime || null,
    venue: text(draft.venue, "会場", 150), official_url: url, note: draft.note.trim(), color: draft.color,
  };
  const { supabase, user } = await authenticated();
  if (eventId) {
    validId(eventId);
    const { data, error } = await supabase.from("live_events").update(values)
      .eq("id", eventId).eq("author_id", user.id).select("id");
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error("編集できませんでした。自分の予定か、削除されていないか確認してください。");
  } else {
    const { error } = await supabase.from("live_events").insert({ ...values, author_id: user.id }).select("id").single();
    if (error) throw new Error(error.message);
  }
}
export async function deleteLiveEvent(id: string): Promise<void> {
  validId(id);
  const { supabase, user } = await authenticated();
  const { data, error } = await supabase.from("live_events").delete()
    .eq("id", id).eq("author_id", user.id).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("削除できませんでした。予定を更新して確認してください。");
}
export async function setLiveAttendance(id: string, attending: boolean): Promise<void> {
  validId(id);
  const { supabase, user } = await authenticated();
  if (attending) {
    const { error } = await supabase.from("live_event_attendees").upsert({ event_id: id, user_id: user.id },
      { onConflict: "event_id,user_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("live_event_attendees").delete().eq("event_id", id).eq("user_id", user.id);
    if (error) throw new Error(error.message);
  }
}

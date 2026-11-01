"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import UserAvatar from "@/components/user-avatar";
import { LIVE_COLORS, loadLiveMonth, saveLiveEvent, deleteLiveEvent,
  setLiveAttendance, officialLink, liveError, type LiveDraft, type LiveEvent } from "@/lib/live-events";
import styles from "./live-calendar.module.css";

function todayInJapan() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo",
    year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function shiftMonth(month: string, amount: number) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
function colors(value: string) { return LIVE_COLORS.find((color) => color.value === value) ?? LIVE_COLORS[0]; }

export default function LiveCalendar() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [authError, setAuthError] = useState("");
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let changed = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      changed = true;
      if (active) { setUserId(session?.user.id ?? null); setAuthError(""); }
    });
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active || changed) return;
      setUserId(data.user?.id ?? null);
      if (error && data.user) setAuthError(error.message);
    }).catch((error) => {
      if (active && !changed) { setUserId(null); setAuthError(liveError(error)); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  if (userId === undefined) return <p role="status">ログインを確認中…</p>;
  if (!userId) return <section className={styles.panel}>
    <h1>ライブカレンダー</h1>
    <p>ログインすると、フォローでつながっている友達と予定を共有できます。</p>
    {authError && <p role="alert">{authError}</p>}
    <Link href="/login" className="button primary">ログインする</Link>
  </section>;
  return <CalendarBody key={userId} userId={userId} />;
}

function CalendarBody({ userId }: { userId: string }) {
  const [today] = useState(todayInJapan);
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<{ event?: LiveEvent; date: string } | null>(null);
  const actionLock = useRef(false);
  const selectedHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    void loadLiveMonth(month).then((rows) => {
      if (active) setEvents(rows);
    }).catch((error) => {
      if (active) { setEvents([]); setLoadError(liveError(error)); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, revision]);

  function moveMonth(amount: number) {
    const next = shiftMonth(month, amount);
    setMonth(next); setSelectedDate(`${next}-01`); setEditor(null);
  }
  async function perform(action: () => Promise<void>, success: string) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true); setNotice("");
    try {
      await action();
      setNotice(success);
      setRevision((value) => value + 1);
    } catch (error) { setNotice(liveError(error)); }
    finally { actionLock.current = false; setBusy(false); }
  }
  function remove(event: LiveEvent) {
    if (!window.confirm(`「${event.title}」を削除しますか？「行きたい」の登録も消え、元に戻せません。`)) return;
    void perform(() => deleteLiveEvent(event.id), "ライブ予定を削除しました。");
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cellCount = Math.ceil((firstWeekday + dayCount) / 7) * 7;
  const byDate = new Map<string, LiveEvent[]>();
  for (const event of events) {
    const list = byDate.get(event.eventDate) ?? [];
    list.push(event); byDate.set(event.eventDate, list);
  }
  const dayEvents = [...(byDate.get(selectedDate) ?? [])].sort((a, b) =>
    (a.startTime || "99:99").localeCompare(b.startTime || "99:99") || a.id.localeCompare(b.id));

  return (
    <section className={styles.root}>
      <div className={styles.heading}>
        <div><span className={styles.eyebrow}>OUR LIVE CALENDAR</span><h1>ライブ</h1></div>
        <button type="button" className="button primary" disabled={busy || loading || Boolean(loadError)}
          onClick={() => setEditor({ date: selectedDate })}>＋ 予定を追加</button>
      </div>
      <p>行きたいライブを、フォローでつながっている友達と共有しよう。</p>
      <p className={styles.caption}>登録した本人・その人のフォロー先・フォロワーに表示されます。日時は日本時間です。</p>
      <div className={styles.toolbar}>
        <button type="button" className="button soft" disabled={busy} onClick={() => moveMonth(-1)} aria-label="前の月">←</button>
        <h2>{year}年{monthNumber}月</h2>
        <button type="button" className="button soft" disabled={busy} onClick={() => moveMonth(1)} aria-label="次の月">→</button>
        <button type="button" className="button soft" disabled={busy} onClick={() => {
          const now = todayInJapan(); setMonth(now.slice(0, 7)); setSelectedDate(now); setEditor(null);
        }}>今日</button>
        <button type="button" className="button soft" disabled={busy || loading} onClick={() => setRevision((value) => value + 1)}>更新</button>
      </div>
      {notice && <p role="status" className={styles.notice}>{notice}</p>}
      {loadError && <p role="alert" className={styles.notice}>{loadError}</p>}
      {loading && <p role="status">予定を読み込み中…</p>}

      <div className={styles.calendar} aria-label={`${year}年${monthNumber}月のライブ予定`} aria-busy={loading}>
        {["日", "月", "火", "水", "木", "金", "土"].map((day) => <div key={day} className={styles.weekday}>{day}</div>)}
        {Array.from({ length: cellCount }, (_, index) => {
          const day = index - firstWeekday + 1;
          if (day < 1 || day > dayCount) return <div key={index} className={styles.blank} aria-hidden="true" />;
          const date = `${month}-${String(day).padStart(2, "0")}`;
          const list = loading ? [] : byDate.get(date) ?? [];
          return <button key={date} type="button" disabled={busy}
            className={`${styles.day} ${selectedDate === date ? styles.selected : ""}`}
            aria-pressed={selectedDate === date} aria-current={date === today ? "date" : undefined}
            aria-label={`${monthNumber}月${day}日${date === today ? "、今日" : ""}、${loading ? "読み込み中" : `${list.length}件の予定`}`}
            onClick={() => { setSelectedDate(date); selectedHeading.current?.focus(); }}>
            <span className={date === today ? styles.today : styles.dayNumber}>{day}</span>
            <span className={styles.badges}>
              {list.slice(0, 2).map((event) => {
                const color = colors(event.color);
                return <span key={event.id} className={styles.badge} style={{ background: color.background, borderLeftColor: color.border }}>
                  <span className={styles.badgeTitle}>{event.title}</span>
                  <span className={styles.dot} style={{ background: color.border }} aria-hidden="true" />
                </span>;
              })}
              {list.length > 2 && <span className={styles.more}>＋{list.length - 2}件</span>}
            </span>
          </button>;
        })}
      </div>
      <div className={styles.legend} aria-label="予定に使える色">
        {LIVE_COLORS.map((color) => <span key={color.value}><i style={{ background: color.background, borderColor: color.border }} />{color.label}</span>)}
      </div>

      {editor && <EventEditor key={editor.event?.id ?? `new-${editor.date}`} initial={editor.event} date={editor.date}
        blocked={busy} onCancel={() => setEditor(null)} onBusy={setBusy} onSaved={(date) => {
          setEditor(null); setMonth(date.slice(0, 7)); setSelectedDate(date);
          setNotice(editor.event ? "ライブ予定を更新しました。" : "ライブ予定を追加しました。");
          setRevision((value) => value + 1);
        }} />}

      <section className={styles.details} aria-label="選択した日の予定">
        <h2 ref={selectedHeading} tabIndex={-1}>{Number(selectedDate.slice(5, 7))}月{Number(selectedDate.slice(8))}日のライブ</h2>
        {!loading && !loadError && dayEvents.length === 0 && <div className={styles.panel}>
          <p>この日の予定はまだありません。</p>
          <button type="button" className="button soft" disabled={busy} onClick={() => setEditor({ date: selectedDate })}>この日に追加する</button>
        </div>}
        {!loading && !loadError && dayEvents.map((event) => {
          const color = colors(event.color);
          const mine = event.authorId === userId;
          const joined = event.attendees.some((person) => person.id === userId);
          const link = officialLink(event.officialUrl);
          return <article key={event.id} className={styles.event} style={{ borderTopColor: color.border, background: color.background }}>
            <span className={styles.colorName}>{color.label}の予定</span>
            <h3>{event.title}</h3><p className={styles.artist}>{event.artist}</p>
            <dl className={styles.facts}>
              <dt>日付</dt><dd>{event.eventDate.replaceAll("-", "/")}</dd>
              <dt>開演</dt><dd>{event.startTime || "未定"}</dd>
              <dt>会場</dt><dd>{event.venue}</dd>
            </dl>
            {event.note && <p className={styles.note}>{event.note}</p>}
            <div className={styles.actions}>
              {link && <a href={link} target="_blank" rel="noopener noreferrer" className="button soft">公式サイト ↗</a>}
              {!mine && <button type="button" className={`button ${joined ? "soft" : "primary"}`} disabled={busy}
                aria-pressed={joined} onClick={() => void perform(() => setLiveAttendance(event.id, !joined),
                  joined ? "「行きたい」を解除しました。" : "「行きたい」に登録しました。チケット予約は別途必要です。") }>
                {joined ? "行きたい ✓（解除）" : "私も行きたい！"}</button>}
              {mine && <>
                <button type="button" className="button soft" disabled={busy} onClick={() => setEditor({ event, date: event.eventDate })}>編集</button>
                <button type="button" className="button soft" disabled={busy} onClick={() => remove(event)}>削除</button>
              </>}
            </div>
            <p className={styles.caption}>「行きたい」はチケットの予約・購入ではありません。</p>
            <Link href={`/profile/${event.authorId}`} className={styles.person}>
              <UserAvatar url={event.author.avatarUrl} emoji={event.author.avatarEmoji} name={event.author.name} size={36} />
              <span>{event.author.name} が登録</span>
            </Link>
            <p className={styles.caption}>私も行きたい：{event.attendees.length}人（登録者を除く）</p>
            <div className={styles.people}>
              {event.attendees.map((person) => <Link key={person.id} href={`/profile/${person.id}`} className={styles.person}>
                <UserAvatar url={person.avatarUrl} emoji={person.avatarEmoji} name={person.name} size={28} />
                <span>{person.name}</span>
              </Link>)}
            </div>
          </article>;
        })}
      </section>
    </section>
  );
}

function EventEditor({ initial, date, blocked, onCancel, onSaved, onBusy }: {
  initial?: LiveEvent; date: string; blocked: boolean; onCancel: () => void;
  onSaved: (date: string) => void; onBusy: (busy: boolean) => void;
}) {
  const [draft, setDraft] = useState<LiveDraft>(() => initial ? {
    title: initial.title, artist: initial.artist, eventDate: initial.eventDate,
    startTime: initial.startTime, venue: initial.venue, officialUrl: initial.officialUrl,
    note: initial.note, color: initial.color,
  } : { title: "", artist: "", eventDate: date, startTime: "", venue: "", officialUrl: "", note: "", color: "pink" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  useEffect(() => { formRef.current?.scrollIntoView({ block: "nearest" }); }, []);
  function field<K extends keyof LiveDraft>(key: K, value: LiveDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true; setSaving(true); onBusy(true); setError("");
    try {
      await saveLiveEvent(draft, initial?.id);
    } catch (error) {
      setError(liveError(error)); lock.current = false; setSaving(false); onBusy(false); return;
    }
    lock.current = false; setSaving(false); onBusy(false); onSaved(draft.eventDate);
  }
  return <form ref={formRef} className={styles.editor} onSubmit={submit}>
    <h2>{initial ? "ライブ予定を編集" : "行きたいライブを追加"}</h2>
    <fieldset disabled={saving || blocked} className={styles.fields}>
      <label htmlFor={`${id}-title`}>公演名<input id={`${id}-title`} required maxLength={100} value={draft.title} onChange={(e) => field("title", e.target.value)} /></label>
      <label htmlFor={`${id}-artist`}>アーティスト<input id={`${id}-artist`} required maxLength={100} value={draft.artist} onChange={(e) => field("artist", e.target.value)} /></label>
      <div className={styles.twoColumns}>
        <label htmlFor={`${id}-date`}>日付<input id={`${id}-date`} type="date" min="1900-01-01" max="2200-12-31" required value={draft.eventDate} onChange={(e) => field("eventDate", e.target.value)} /></label>
        <label htmlFor={`${id}-time`}>開演時刻（任意・日本時間）<input id={`${id}-time`} type="time" value={draft.startTime} onChange={(e) => field("startTime", e.target.value)} /></label>
      </div>
      <label htmlFor={`${id}-venue`}>会場<input id={`${id}-venue`} required maxLength={150} value={draft.venue} onChange={(e) => field("venue", e.target.value)} /></label>
      <label htmlFor={`${id}-url`}>公式リンク（任意）<input id={`${id}-url`} type="url" maxLength={2000} placeholder="https://…" value={draft.officialUrl} onChange={(e) => field("officialUrl", e.target.value)} /></label>
      <fieldset className={styles.colorPicker}><legend>カレンダーの色</legend>
        {LIVE_COLORS.map((color) => <label key={color.value} style={{ background: color.background, borderColor: draft.color === color.value ? color.border : "transparent" }}>
          <input type="radio" name={`${id}-color`} value={color.value} checked={draft.color === color.value} onChange={() => field("color", color.value)} />{color.label}
        </label>)}
      </fieldset>
      <label htmlFor={`${id}-note`}>ひとこと（任意・280文字まで）<textarea id={`${id}-note`} rows={3} maxLength={280} value={draft.note} onChange={(e) => field("note", e.target.value)} /></label>
      <p className={styles.caption}>この予定と「行きたい」の一覧は、登録者とフォローでつながっている人に表示されます。</p>
      <div className={styles.actions}>
        <button className="button primary">{saving ? "保存中…" : initial ? "変更を保存" : "ライブを追加"}</button>
        <button type="button" className="button soft" onClick={onCancel}>キャンセル</button>
      </div>
    </fieldset>
    {error && <p role="alert">{error}</p>}
  </form>;
}

"use client";

import UserAvatar from "@/components/user-avatar";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Comment = {
  id: string;
  authorId: string;
  name: string;
  avatarUrl: string | null;
  avatarEmoji: string;
  body: string;
  createdAt: string;
};
const PAGE_SIZE = 20;
function message(error: unknown) {
  return typeof error === "object" && error !== null && "message" in error
    ? String(error.message)
    : "コメントを処理できませんでした。";
}

export default function PostComments({ postId, userId }: {
  postId: string;
  userId: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section style={{ marginTop: 20 }} aria-label="コメント">
      <button type="button" className="button soft" aria-expanded={open}
        onClick={() => setOpen((value) => !value)}>
        {open ? "コメントを閉じる" : "コメントを見る・書く"}
      </button>
      {open && (
        userId ? (
          <CommentPanel key={`${postId}-${userId}`} postId={postId} userId={userId} />
        ) : (
          <p>コメントを見る・書くには<Link href="/login">ログイン</Link>してください。</p>
        )
      )}
    </section>
  );
}

function CommentPanel({ postId, userId }: { postId: string; userId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const inputId = useId();
  const lock = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    async function load() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from("comments")
          .select("id, author_id, body, created_at")
          .eq("post_id", postId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
        if (error) throw error;

        const visible = (data ?? []).slice(0, PAGE_SIZE);
        const ids = [...new Set(visible.map((row) => row.author_id))];
        const names = new Map<string, string>();
        const avatars = new Map<string, { url: string | null; emoji: string }>();
        if (ids.length) {
          const { data: profiles, error: profileError } = await supabase
            .from("profiles").select("user_id, username, avatar_url, avatar_emoji").in("user_id", ids);
          if (profileError) throw profileError;
          for (const profile of profiles ?? []) {
            avatars.set(profile.user_id, {
              url: profile.avatar_url || null,
              emoji: profile.avatar_emoji || "🎧",
            });
            names.set(profile.user_id, profile.username || "名前未設定");
          }
        }
        if (!cancelled) {
          setComments(visible.map((row) => ({
            id: String(row.id), authorId: row.author_id,
            name: names.get(row.author_id) || "名前未設定",
            avatarUrl: avatars.get(row.author_id)?.url ?? null,
            avatarEmoji: avatars.get(row.author_id)?.emoji ?? "🎧",
            body: row.body, createdAt: row.created_at,
          })));
          setHasNext((data?.length ?? 0) > PAGE_SIZE);
        }
      } catch (error) {
        if (!cancelled) setLoadError(message(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [postId, page, revision]);

  async function currentUser() {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user || user.id !== userId) {
      throw new Error("ログイン状態が変わりました。ページを再読み込みしてください。");
    }
    return { supabase, user };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const body = text.trim();
    if (!body || Array.from(body).length > 280) {
      setNotice("コメントは1〜280文字で入力してください。");
      return;
    }
    lock.current = true;
    setBusy(true);
    setNotice("");
    try {
      const { supabase, user } = await currentUser();
      const { data, error } = await supabase.from("comments").insert({
        post_id: postId, author_id: user.id, body,
      }).select("id").single();
      if (error) throw error;
      if (!data) throw new Error("送信結果を確認できませんでした。コメントを更新して確認してください。");
      if (mounted.current) {
        setText("");
        setNotice("コメントを送信しました。");
        setPage(0);
        setRevision((value) => value + 1);
      }
    } catch (error) {
      if (mounted.current) setNotice(message(error));
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function remove(comment: Comment) {
    if (lock.current || comment.authorId !== userId) return;
    if (!window.confirm("このコメントを削除しますか？元に戻せません。")) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    try {
      const { supabase, user } = await currentUser();
      const { data, error } = await supabase.from("comments").delete()
        .eq("id", comment.id).eq("post_id", postId).eq("author_id", user.id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("削除できませんでした。コメントを更新して確認してください。");
      if (mounted.current) {
        setNotice("コメントを削除しました。");
        setPage(0);
        setRevision((value) => value + 1);
      }
    } catch (error) {
      if (mounted.current) setNotice(message(error));
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <label htmlFor={inputId}>コメントを書く（280文字まで）</label>
        <textarea id={inputId} value={text} required maxLength={280} rows={3}
          disabled={busy} onChange={(event) => setText(event.target.value)}
          placeholder="この曲や投稿への気持ちを伝えよう"
          style={{ width: "100%", boxSizing: "border-box", padding: 12,
            border: "1px solid #d5dfd1", borderRadius: 12, background: "#fff",
            color: "inherit", font: "inherit" }} />
        <button className="button primary" disabled={busy || !text.trim()}>
          {busy ? "処理中…" : "コメントを送信"}
        </button>
      </form>
      {notice && <p role="status">{notice}</p>}
      <div style={{ marginTop: 16 }}>
        <button type="button" className="button soft" disabled={loading || busy}
          onClick={() => { setPage(0); setRevision((value) => value + 1); }}>
          コメントを更新
        </button>
      </div>
      {loading ? <p role="status">コメントを読み込み中…</p> : loadError ? (
        <p role="alert">{loadError}</p>
      ) : (
        <>
          {comments.length === 0 && <p>コメントはまだありません。</p>}
          {comments.map((comment) => (
            <article key={comment.id} style={{ padding: "16px 0", borderBottom: "1px solid #e3e8df" }}>
              <Link href={`/profile/${comment.authorId}`}
                style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <UserAvatar url={comment.avatarUrl} emoji={comment.avatarEmoji}
                  name={comment.name} size={40} />
                <b>{comment.name}</b>
              </Link>
              <time dateTime={comment.createdAt} style={{ display: "block", fontSize: 12 }}>
                {new Date(comment.createdAt).toLocaleString("ja-JP")}
              </time>
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{comment.body}</p>
              {comment.authorId === userId && (
                <button type="button" className="button soft" disabled={busy}
                  onClick={() => void remove(comment)}>コメントを削除</button>
              )}
            </article>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
            <button type="button" className="button soft" disabled={busy || page === 0}
              onClick={() => setPage((value) => value - 1)}>前へ</button>
            <span>{page + 1}ページ</span>
            <button type="button" className="button soft" disabled={busy || !hasNext}
              onClick={() => setPage((value) => value + 1)}>次へ</button>
          </div>
        </>
      )}
    </div>
  );
}

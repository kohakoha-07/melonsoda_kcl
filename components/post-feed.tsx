"use client";

import { isPostColor, postColorStyle, type PostColor } from "@/lib/post-colors";

import UserAvatar from "@/components/user-avatar";

import PostComments from "@/components/post-comments";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  getPosts,
  getMyFollowing,
  deletePost,
  addReaction,
  removeReaction,
  getMyReactions,
  getReactionCounts,
} from "@/lib/workshop/actions";
import Player from "@/components/spotify-record-player";

type FeedPost = {
  id: string;
  authorId: string | null;
  name: string;
  avatarUrl: string | null;
  avatarEmoji: string;
  body: string;
  trackId: string;
  trackName: string | null;
  artistName: string | null;
  createdAt: string;
  cardColor: PostColor;
};

type TrackInfo = {
  id: string;
  name: string;
  artist: string;
};

function isUserId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

const REACTION_EMOJIS = ["🤍", "🥰", "🎧", "✨", "🔥"];

function reactionMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return "リアクションを処理できませんでした。";
}

function PostReactions({
  postId,
  userId,
}: {
  postId: string;
  userId: string | null;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    async function load() {
      try {
        const [emojis, totals] = await Promise.all([
          userId ? getMyReactions(postId) : Promise.resolve([]),
          getReactionCounts(postId),
        ]);
        if (!cancelled) {
          setSelected(emojis);
          setCounts(totals);
        }
      } catch (error) {
        if (!cancelled) setError(reactionMessage(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [postId, userId, revision]);

  async function toggle(emoji: string) {
    if (!userId || loading || error || lock.current) return;
    lock.current = true;
    setSaving(true);

    try {
      if (selected.includes(emoji)) {
        await removeReaction(postId, emoji);
      } else {
        await addReaction(postId, emoji);
      }

      // 保存後の値を読み直して、件数と選択状態を合わせる。
      const [emojis, totals] = await Promise.all([
        getMyReactions(postId),
        getReactionCounts(postId),
      ]);
      if (mounted.current) {
        setSelected(emojis);
        setCounts(totals);
      }
    } catch (error) {
      if (mounted.current) {
        setError(reactionMessage(error));
      }
    } finally {
      lock.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div
        className="reactions"
        role="group"
        aria-label="投稿へのリアクション"
        aria-busy={loading || saving}
        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
      >
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-label={`${emoji}でリアクション ${counts[emoji] ?? 0}件`}
            aria-pressed={selected.includes(emoji)}
            disabled={!userId || loading || saving || Boolean(error)}
            onClick={() => void toggle(emoji)}
            style={selected.includes(emoji) ? {
              background: "#e2eddf",
              borderColor: "#7f9b7d",
              color: "#365844",
            } : undefined}
          >
            <span aria-hidden="true">{emoji}</span>
            <span>{loading || error ? "—" : counts[emoji] ?? 0}</span>
          </button>
        ))}
      </div>

      {loading && <p className="small-print" role="status">リアクションを読み込み中…</p>}
      {!userId && <p className="small-print">リアクションするにはログインしてください。</p>}
      {saving && <p className="small-print" role="status">保存中…</p>}
      {error && (
        <div>
          <p role="alert">{error}</p>
          <button
            type="button"
            className="button soft"
            disabled={loading || saving}
            onClick={() => setRevision((value) => value + 1)}
          >
            リアクションを再読み込み
          </button>
        </div>
      )}
    </div>
  );
}

export default function PostFeed({
  tab,
  authorId,
  postId,
}: {
  tab: string;
  authorId?: string;
  postId?: string;
}) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [trackInfo, setTrackInfo] = useState<
    Record<string, TrackInfo>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trackError, setTrackError] = useState("");
  const [revision, setRevision] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState("");
  const deleteLock = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let authChanged = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        authChanged = true;
        if (active) setUserId(session?.user.id ?? null);
      },
    );

    void supabase.auth.getUser().then(({ data, error }) => {
      if (active && !authChanged) {
        setUserId(error ? null : data.user?.id ?? null);
      }
    }).catch(() => {
      if (active && !authChanged) setUserId(null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleDelete(post: FeedPost) {
    if (deleteLock.current || !userId || post.authorId !== userId) return;
    if (!window.confirm("この投稿を削除しますか？削除すると元に戻せません。")) return;

    deleteLock.current = true;
    setDeletingId(post.id);
    setDeleteMessage("");

    try {
      await deletePost(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setDeleteMessage("投稿を削除しました。");
    } catch (error) {
      setDeleteMessage(
        error instanceof Error ? error.message : "削除できませんでした。",
      );
    } finally {
      deleteLock.current = false;
      setDeletingId(null);
    }
  }


  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      setTrackError("");
      setTrackInfo({});

      try {
const rows = await getPosts(authorId, postId);
        const following =
          tab === "following" ? await getMyFollowing() : [];

        const visibleRows =
          tab === "following"
            ? rows.filter((row) =>
                following.includes(row.author_id),
              )
            : rows;

        const authorIds = [
          ...new Set(
            visibleRows
              .map((row) => row.author_id)
              .filter(isUserId),
          ),
        ];

        const names = new Map<string, string>();
        const avatars = new Map<string, { url: string | null; emoji: string }>();

        if (authorIds.length > 0) {
          const supabase = createClient();

          const { data, error } = await supabase
            .from("profiles")
            .select("user_id, username, avatar_url, avatar_emoji")
            .in("user_id", authorIds);

          if (error) throw new Error(error.message);

          for (const profile of data ?? []) {
            avatars.set(profile.user_id, {
              url: profile.avatar_url || null,
              emoji: profile.avatar_emoji || "🎧",
            });
            names.set(
              profile.user_id,
              profile.username || "名前未設定",
            );
          }
        }

        if (cancelled) return;

        const feedPosts: FeedPost[] = visibleRows.map((row) => {
          const authorId = isUserId(row.author_id)
            ? row.author_id
            : null;

          return {
            id: String(row.id),
            authorId,
            name:
              (authorId ? names.get(authorId) : null) ||
              "名前未設定",
            avatarUrl: authorId ? avatars.get(authorId)?.url ?? null : null,
            avatarEmoji: authorId ? avatars.get(authorId)?.emoji ?? "🎧" : "🎧",
            body: row.body,
            trackId: row.spotify_track_id ?? "",
            trackName: row.track_name ?? null,
            artistName: row.artist_name ?? null,
            createdAt: row.created_at,
            cardColor: isPostColor(row.card_color) ? row.card_color : "white",
          };
        });

        setPosts(feedPosts);
        const savedInfo: Record<string, TrackInfo> = {};

        for (const post of feedPosts) {
  if (post.trackId && post.trackName) {
    savedInfo[post.trackId] = {
      id: post.trackId,
      name: post.trackName,
      artist: post.artistName ?? "",
    };
  }
  }

setTrackInfo(savedInfo);
        setLoading(false);

        const trackIds = [
          ...new Set(
            feedPosts
               .filter((post) => !savedInfo[post.trackId])
              .map((post) => post.trackId)
              .filter((id) => /^[A-Za-z0-9]{22}$/.test(id)),
          ),
        ];

        if (trackIds.length === 0) return;

        try {
          const response = await fetch(
            `/api/spotify/tracks?ids=${encodeURIComponent(
              trackIds.join(","),
            )}`,
            { signal: abortController.signal },
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error || "曲名を取得できませんでした。",
            );
          }

          const info: Record<string, TrackInfo> = {};

          for (const track of data.tracks as TrackInfo[]) {
            info[track.id] = track;
          }

          if (!cancelled) {
  setTrackInfo((current) => ({
    ...current,
    ...info,
  }));
}
        } catch (error) {
          if (!cancelled) {
            setTrackError(
              error instanceof Error
                ? error.message
                : "曲名を取得できませんでした。",
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "投稿を読み込めませんでした。",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      abortController.abort();
    };
}, [tab, revision, authorId, postId]);
  return (
    <section aria-label="投稿一覧">
      <button
        type="button"
        className="button soft"
        disabled={loading || deletingId !== null}
        onClick={() => setRevision((value) => value + 1)}
      >
        {loading ? "読み込み中…" : "投稿を更新"}
      </button>

      {error && <p role="alert">{error}</p>}
      {deleteMessage && <p role="status">{deleteMessage}</p>}
      {trackError && <p role="status">{trackError}</p>}

      {!loading && !error && posts.length === 0 && (
        <p className="status">
          {postId
            ? "この投稿は削除されたか、閲覧する権限がありません。"
            : tab === "following"
              ? "フォロー中の人の投稿はまだありません。"
              : "表示できる投稿はまだありません。"}
        </p>
      )}

      {!loading &&
        !error &&
posts.slice(0, 1).map((post) => (          <article className="post-card" key={post.id} style={postColorStyle(post.cardColor)}>
            <header className="post-author">
              <UserAvatar url={post.avatarUrl} emoji={post.avatarEmoji} name={post.name} />

              <div>
                {post.authorId ? (
                  <Link href={`/profile/${post.authorId}`}>
                    <b>{post.name}</b>
                  </Link>
                ) : (
                  <b>{post.name}</b>
                )}
              </div>

              <time dateTime={post.createdAt}>
                {new Date(post.createdAt).toLocaleString("ja-JP")}
              </time>
            </header>

            <p className="post-text">{post.body}</p>

            {userId && post.authorId === userId && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button
                  type="button"
                  className="button soft"
                  disabled={deletingId !== null}
                  onClick={() => void handleDelete(post)}
                >
                  {deletingId === post.id ? "削除中…" : "この投稿を削除"}
                </button>
              </div>
            )}

            {post.trackId && (
              <Player
                track={{
                  id: post.trackId,
                  name:
                    trackInfo[post.trackId]?.name ??
                    (trackError
                      ? "曲名を取得できませんでした"
                      : "曲名を読み込み中…"),
                  artist: trackInfo[post.trackId]?.artist ?? "",
                  previewUrl: null,
                  spotifyUrl:
                    `https://open.spotify.com/track/${post.trackId}`,
                }}
color={post.cardColor}              />
            )}
            <PostReactions
              key={`${post.id}-${userId ?? "guest"}`}
              postId={post.id}
              userId={userId}
            />
            <PostComments postId={post.id} userId={userId} />
          </article>
        ))}
    </section>
  );
}
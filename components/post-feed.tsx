"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getPosts, getMyFollowing, deletePost } from "@/lib/workshop/actions";
import Player from "@/components/spotify-record-player";

type FeedPost = {
  id: string;
  authorId: string | null;
  name: string;
  body: string;
  trackId: string;
  createdAt: string;
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

export default function PostFeed({ tab }: { tab: string }) {
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
        const rows = await getPosts();

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

        if (authorIds.length > 0) {
          const supabase = createClient();

          const { data, error } = await supabase
            .from("profiles")
            .select("user_id, username")
            .in("user_id", authorIds);

          if (error) throw new Error(error.message);

          for (const profile of data ?? []) {
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
            body: row.body,
            trackId: row.spotify_track_id ?? "",
            createdAt: row.created_at,
          };
        });

        setPosts(feedPosts);
        setLoading(false);

        const trackIds = [
          ...new Set(
            feedPosts
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

          if (!cancelled) setTrackInfo(info);
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
  }, [tab, revision]);

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
          {tab === "following"
            ? "フォロー中の人の投稿はまだありません。"
            : "表示できる投稿はまだありません。"}
        </p>
      )}

      {!loading &&
        !error &&
        posts.map((post) => (
          <article className="post-card" key={post.id}>
            <header className="post-author">
              <span className="avatar mint">🎧</span>

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
                color="pink"
              />
            )}
          </article>
        ))}
    </section>
  );
}
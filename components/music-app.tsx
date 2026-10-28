"use client";

import AuthStatus from "@/components/auth-status";
import Player from "@/components/spotify-record-player";
import ProfileSummary from "@/components/profile-summary";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { people, posts, type Track } from "@/lib/workshop/data";
import {
  publishPost,
  submitAuth,
  addReaction,
  removeReaction,
  getMyReactions,
  getReactionCounts,
  followUser,
  unfollowUser,
  getMyFollowing,
  getFollowCandidates,
} from "@/lib/workshop/actions";

type Screen = "home" | "search" | "following" | "profile" | "login" | "signup";
const navigation: {
  screen: Screen;
  href: string;
  icon: string;
  text: string;
}[] = [
  { screen: "home", href: "/", icon: "⌂", text: "ホーム" },
  { screen: "search", href: "/search", icon: "⌕", text: "音楽をさがす" },
  { screen: "following", href: "/following", icon: "♧", text: "フォロー" },
  { screen: "profile", href: "/profile", icon: "☺", text: "プロフィール" },
];

function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !window.IntersectionObserver) return;
    element.classList.add("reveal-ready");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add("revealed");
          observer.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="reveal">
      {children}
    </div>
  );
}

function Reactions({ postId }: { postId: string }) {
  // TODO(B): post_id と認証ユーザーを使ってSupabaseへ保存・取得。
  const [selected, setSelected] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
  if (!/^[0-9]+$/.test(postId)) return;

  let cancelled = false;

  async function loadReactions() {
    setSaving(true);

    try {
      const [emojis, reactionCounts] = await Promise.all([
  getMyReactions(postId),
  getReactionCounts(postId),
]);

if (!cancelled) {
  setSelected(emojis);
  setCounts(reactionCounts);
  setError("");
}
    } catch {
      if (!cancelled) {
        setError("保存済みのリアクションを取得できませんでした。");
      }
    } finally {
      if (!cancelled) setSaving(false);
    }
  }

  void loadReactions();

  return () => {
    cancelled = true;
  };
}, [postId]);
  async function toggleReaction(emoji: string) {
  if (saving) return;

  // サンプルIDでは保存しない
  if (!/^[0-9]+$/.test(postId)) {
    setError("この投稿はサンプルです。保存にはDBの投稿IDが必要です。");
    return;
  }

  setSaving(true);
  setError("");

  try {
    if (selected.includes(emoji)) {
      await removeReaction(postId, emoji);

      setSelected((old) =>
        old.filter((value) => value !== emoji),
      );
    } else {
      await addReaction(postId, emoji);

      setSelected((old) => [...old, emoji]);
    }
   // 保存・解除後の件数を取得
    const reactionCounts = await getReactionCounts(postId);
    setCounts(reactionCounts);
  }
  
  catch (error) {
  const message =
    typeof error === "object" &&
    error !== null &&
    "message" in error
      ? String(error.message)
      : "リアクションを保存できませんでした。";

  setError(message);
} finally {
  setSaving(false);
}
 
}
  return (
    <div className="reactions" aria-label="絵文字でリアクション（デモ）">
      {["🤍", "🥰", "🎧", "✨", "🔥"].map((emoji) => (
        <button
          key={emoji}
          aria-label={`${emoji}でリアクション`}
          aria-pressed={selected.includes(emoji)}
          disabled={saving}
          onClick={() => toggleReaction(emoji)}
        >
          {emoji}
          <span>{counts[emoji] ?? 0}</span>
          {error && <p role="alert">{error}</p>}
        </button>
      ))}
      <span className="reaction-hint">
      気持ちをのせよう（投稿ID: {postId}）
      </span>
    </div>
  );
}

function Post({ post }: { post: (typeof posts)[number] }) {
  return (
    <Reveal>
      <article className="post-card">
        <header className="post-author">
          <span className={`avatar ${post.person.color}`}>
            {post.person.icon}
          </span>
          <div>
            <b>{post.person.name}</b>
            <span>@{post.person.handle}</span>
          </div>
          <time>{post.time}</time>
        </header>
        <p className="post-text">{post.text}</p>
        <Player track={post.track} color={post.color} />
        <div className="post-tag">{post.tag}</div>
        <Reactions postId={post.id === "p1" ? "1" : post.id} />
      </article>
    </Reveal>
  );
}

type SpotifyTrack = {
  id: string;
  name: string;
  artists: { name: string }[];
  preview_url?: string | null;
  external_urls?: { spotify?: string };
};
type SpotifyArtist = {
  id: string;
  name: string;
  external_urls?: { spotify?: string };
};
function Search() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [state, setState] = useState(
    "気になる曲名やアーティスト名を入力してみよう。",
  );
  const [loading, setLoading] = useState(false);
  async function search(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) {
      setState("検索ワードを入力してください。");
      return;
    }
    setLoading(true);
    setTracks([]);
    setArtists([]);
    setState("");
    try {
      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(query.trim())}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "検索に失敗しました。");
      setTracks(data.tracks ?? []);
      setArtists(data.artists ?? []);
      setState(
        data.tracks?.length || data.artists?.length
          ? "Spotifyの検索結果"
          : "見つかりませんでした。別の言葉でもう一度どうぞ。",
      );
    } catch (error) {
      setState(error instanceof Error ? error.message : "通信に失敗しました。");
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">FIND YOUR NEXT FAVORITE</span>
          <h2>
            次の「好き」をさがそう <span>⌕</span>
          </h2>
        </div>
      </div>
      <form onSubmit={search} className="search-box">
        <label className="sr-only" htmlFor="music-query">
          曲名・アーティスト名
        </label>
        <span aria-hidden="true">⌕</span>
        <input
          id="music-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="曲名・アーティスト名で検索"
          maxLength={200}
        />
        <button className="button primary" disabled={loading}>
          {loading ? "検索中…" : "検索"}
        </button>
      </form>
      <p className="status" role="status">
        {state}
      </p>
      {artists.length > 0 && (
        <section className="artist-section">
          <h3>アーティスト</h3>
          <div className="artist-results">
            {artists.map((artist) => (
              <a
                key={artist.id}
                href={
                  artist.external_urls?.spotify ??
                  `https://open.spotify.com/artist/${artist.id}`
                }
                target="_blank"
                rel="noreferrer"
              >
                <span>♫</span>
                {artist.name} ↗
              </a>
            ))}
          </div>
        </section>
      )}
      {tracks.map((track) => (
        <Reveal key={track.id}>
          <article className="search-result">
            <Player
              track={{
                id: track.id,
                name: track.name,
                artist: track.artists.map((artist) => artist.name).join(" / "),
                previewUrl: track.preview_url ?? null,
                spotifyUrl:
                  track.external_urls?.spotify ??
                  `https://open.spotify.com/track/${track.id}`,
              }}
              color="blue"
            />
          </article>
        </Reveal>
      ))}
      <p className="small-print">
        音楽情報：Spotify · 試聴音源が提供される曲のみ短く再生できます。
      </p>
    </>
  );
}

function Following() {
  const [users, setUsers] = useState<
    {
      user_id: string;
      username: string | null;
      bio: string | null;
    }[]
  >([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ユーザー一覧と、自分のフォロー情報を取得
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [candidates, followingIds] = await Promise.all([
          getFollowCandidates(),
          getMyFollowing(),
        ]);

        if (!cancelled) {
          setUsers(candidates);
          setFollowing(followingIds);
        }
      } catch (error) {
        if (!cancelled) {
          setError(getMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  function getMessage(error: unknown): string {
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error
    ) {
      return String(error.message);
    }

    return "フォロー情報の処理に失敗しました。";
  }

  // 保存に成功したら画面を更新
  async function toggleFollow(userId: string) {
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      if (following.includes(userId)) {
        await unfollowUser(userId);

        setFollowing((old) =>
          old.filter((id) => id !== userId),
        );
      } else {
        await followUser(userId);

        setFollowing((old) => [...old, userId]);
      }
    } catch (error) {
      setError(getMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR MUSIC PEOPLE</span>
          <h2>
            音楽の好みで、つながろう <span>♧</span>
          </h2>
        </div>
      </div>

      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p className="status">読み込み中です…</p>
      ) : (
        <>
          <p className="status">
            フォロー中 {following.length} 人
          </p>

          {!error && users.length === 0 && (
            <p>表示できるほかのユーザーはまだいません。</p>
          )}

          {users.map((person) => (
            <Reveal key={person.user_id}>
              <article className="person-card">
                <span className="avatar large pink">♫</span>

                <div>
                  <h3>{person.username || "名前未設定"}</h3>
                  <p>{person.bio || "自己紹介はまだありません。"}</p>
                </div>

                <button
                  className={`button ${
                    following.includes(person.user_id)
                      ? "soft"
                      : "primary"
                  }`}
                  aria-pressed={following.includes(person.user_id)}
                  disabled={saving}
                  onClick={() => toggleFollow(person.user_id)}
                >
                  {following.includes(person.user_id)
                    ? "フォロー中 ✓"
                    : "＋ フォロー"}
                </button>
              </article>
            </Reveal>
          ))}
        </>
      )}
    </>
  );
}

function AuthForm({ signup }: { signup: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const data = new FormData(event.currentTarget);

    try {
      const result = await submitAuth(signup ? "signup" : "login", {
        email: String(data.get("email")),
        password: String(data.get("password")),
        username: String(data.get("username") ?? ""),
      });

      setMessage(result);

      // ログインに成功したときだけホームへ移動する。
      // 新規登録ではメール確認の案内をそのまま表示する。
      if (!signup) {
        router.replace("/");
        router.refresh();
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "接続できませんでした。",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card">
      <span className="auth-flower">✿</span>
      <span className="eyebrow">WELCOME TO MELOOP</span>
      <h2>{signup ? "あなたの「好き」を、ここに。" : "おかえりなさい。"}</h2>
      <p>音楽の話をしよう。今日も、あなたのペースで。</p>
      <form onSubmit={submit}>
        {signup && (
          <label>
            ユーザー名
            <input
              name="username"
              required
              maxLength={30}
              autoComplete="username"
              placeholder="音楽好きのあなたの名前"
            />
          </label>
        )}
        <label>
          メールアドレス
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label>
          パスワード
          <input
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete={signup ? "new-password" : "current-password"}
            placeholder="8文字以上"
          />
        </label>
        <button className="button primary" disabled={busy}>
          {busy ? "確認中…" : signup ? "新規登録する →" : "ログインする →"}
        </button>
      </form>
      <p className="form-message" role="status">
        {message}
      </p>
      <Link href={signup ? "/login" : "/signup"}>
        {signup
          ? "アカウントをお持ちの方はログイン"
          : "はじめての方はこちらから新規登録"}{" "}
        ↗
      </Link>
    </section>
  );
}

function Composer() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await publishPost(text);
      setMessage("投稿しました。");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "投稿できませんでした。",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="composer">
      <div className="composer-top">
        <span className="avatar mint">🎧</span>
        <button onClick={() => setOpen(!open)} aria-expanded={open}>
          いま、どんな音楽を聴いてる？<span>＋</span>
        </button>
      </div>
      {open && (
        <form onSubmit={submit}>
          <label htmlFor="post-text" className="sr-only">
            投稿するひとこと
          </label>
          <textarea
            id="post-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            required
            maxLength={280}
            placeholder="この曲を好きな理由を、ひとこと。"
          />
          <div className="composer-bottom">
            <Link href="/search">♫ 曲をさがす</Link>
            <button className="button primary" disabled={busy}>
              {busy ? "確認中…" : "シェアする ↗"}
            </button>
          </div>
          <p className="form-message" role="status">
            {message || "曲の選択・投稿の保存はこれから接続する部分です。"}
          </p>
        </form>
      )}
    </section>
  );
}

export default function MusicApp({ screen }: { screen: Screen }) {
  const [tab, setTab] = useState("all");
  const auth = screen === "login" || screen === "signup";
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        本文へスキップ
      </a>
      <div className="music-doodles" aria-hidden="true">
        <span>♫</span>
        <span>♩</span>
        <span>♬</span>
        <span>♮</span>
        <span>🎸</span>
        <span>♪</span>
      </div>
      <header className="topbar">
        <Link href="/" className="wordmark">
<span className="logo-pick" aria-hidden="true">
  <svg viewBox="0 0 48 54" width="36" height="40">
    <path
      d="M24 3C13 3 4 7 4 17c0 13 12 29 20 34 8-5 20-21 20-34C44 7 35 3 24 3Z"
      fill="currentColor"
    />
    <path
      d="M28 15v18m0-18 8-2v7l-8 2"
      fill="none"
      stroke="#faf9f5"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <ellipse cx="23" cy="34" rx="6" ry="4" fill="#faf9f5" />
  </svg>
</span>          <span className="logo-dot">.</span>
        </Link>
        <span className="brand-caption">好きな音で、つながろう。</span>
        <div className="topbar-actions">
          <AuthStatus />
        </div>
      </header>
      <div className="workspace">
        <aside className="sidebar">
          <span className="eyebrow sidebar-label">
            MY LITTLE MUSIC SPACE
          </span>
          <nav aria-label="メインメニュー">
            {navigation.map((item) => (
              <Link
                key={item.screen}
                href={item.href}
                className={
                  screen === item.screen ? "nav-item active" : "nav-item"
                }
                aria-current={screen === item.screen ? "page" : undefined}
              >
                <span>{item.icon}</span>
                {item.text}
                {screen === item.screen && <i />}
              </Link>
            ))}
          </nav>
          <div className="sidebar-note">
            <span>♬</span>
            <p>
              その一曲が、
              <br />
              だれかの好きになる。
            </p>
            <small>SHARE YOUR LITTLE FAVORITE</small>
          </div>
          <div className="sidebar-user">
            <span className="avatar mint">🎧</span>
            <div>
              <b>音楽好きのあなた</b>
              <small>ゲスト / サンプル表示</small>
            </div>
          </div>
        </aside>
        <main
  id="main"
  className={auth ? "main-column auth-main" : "main-column"}
>
  {auth ? (
            <AuthForm signup={screen === "signup"} />
          ) : (
            <>
              <section className="hero">
                <div className="stage-instruments" aria-hidden="true">
  <span className="instrument guitar">🎸</span>
  <span className="instrument bass">🎸</span>
  <span className="instrument drums">🥁</span>
  <span className="instrument keyboard">🎹</span>
  <span className="instrument microphone">🎤</span>
</div>
                <div className="hero-copy">
                  <span className="eyebrow">
                    A LITTLE MUSIC, A LITTLE CONNECTION.
                  </span>
                  <h1>
                    今日の気持ちに、
                    <br />
                    <span>一曲を。</span>
                    <i>♫</i>
                  </h1>
                  <p>
                    好きな音楽を分けあったら、
                    <br />
                    いつもの毎日が、ちょっと弾みだす。
                  </p>
                  <Link href="/search" className="hero-link">
                    お気に入りを見つける <span>↗</span>
                  </Link>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <span className="orbit-note n1">♪</span>
                  <span className="orbit-note n2">✧</span>
                  <div className="hero-record">
                    <div>
                      <small>GOOD MUSIC</small>
                      <b>✿</b>
                      <small>GOOD DAYS</small>
                    </div>
                  </div>
                  <span className="hero-sticker">just press play ♡</span>
                  <span className="orbit-note n3">♫</span>
                </div>
              </section>
              {screen === "home" && (
                <>
                <div className="feed-instruments" aria-hidden="true">
    <span>🎸</span>
  <span>🥁</span>
  <span>🎹</span>
  <span>🎤</span>
  <span>🎸</span>
  <span>🎵</span>
  <span>🎹</span>
  <span>🎸</span>
  <span>🎤</span>
  <span>🥁</span>
  <span>🎶</span>
  <span>🎸</span>
  <span>🎹</span>
  <span>🎤</span>
  <span>🎵</span>
</div>
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">ON YOUR TIMELINE</span>
                      <h2>
                        みんなの、いまの一曲 <span>✳</span>
                      </h2>
                    </div>
                    <span className="handwritten">
                      いい音、あつまってます。
                    </span>
                  </div>
                  <div
                    className="feed-tabs"
                    role="group"
                    aria-label="タイムラインの表示"
                  >
                    <button
                      className={tab === "all" ? "selected" : ""}
                      aria-pressed={tab === "all"}
                      onClick={() => setTab("all")}
                    >
                      みんなの投稿
                    </button>
                    <button
                      className={tab === "following" ? "selected" : ""}
                      aria-pressed={tab === "following"}
                      onClick={() => setTab("following")}
                    >
                      フォロー中
                    </button>
                    <span>サンプル投稿</span>
                  </div>
                  <Composer />
                  {(tab === "all"
                    ? posts
                    : posts.filter((post) => post.person.id === "hina")
                  ).map((post) => (
                    <Post key={post.id} post={post} />
                  ))}
                  {tab === "following" && (
                    <p className="small-print">
                      サンプルでは「ひな」をフォロー中として表示しています。フォロー関係の同期はTODO(B)です。
                    </p>
                  )}
                </>
              )}
              {screen === "search" && <Search />}
              {screen === "following" && <Following />}
              {screen === "profile" && (
                <>
<ProfileSummary />
                  <div className="empty-state">
                    <span>♫</span>
                    <h3>最初の一曲、何にする？</h3>
                    <p>
                      あなたのプロフィールと投稿は、認証・保存機能を接続するとここに並びます。
                    </p>
                    <Link href="/search">お気に入りの曲をさがす →</Link>
                  </div>
                </>
              )}
            </>
          )}
          <footer className="page-footer">
 <span>
  <svg
    viewBox="0 0 48 54"
    width="24"
    height="28"
    aria-hidden="true"
  >
    <path
      d="M24 3C13 3 4 7 4 17c0 13 12 29 20 34 8-5 20-21 20-34C44 7 35 3 24 3Z"
      fill="currentColor"
    />
    <path
      d="M28 15v18m0-18 8-2v7l-8 2"
      fill="none"
      stroke="#faf9f5"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <ellipse cx="23" cy="34" rx="6" ry="4" fill="#faf9f5" />
  </svg>
  meloop
</span>
           <p>音楽を好きな気持ちで、つながっていこう。</p>
          <small>© Meloop · student project</small>
        </footer>
        </main>
        <aside className="right-column">
          <section className="daily-note">
            <span className="eyebrow">TODAY’S MOOD</span>
            <span className="daily-flower">✿</span>
            <h3>きょうは、どんな気分？</h3>
            <p>
              気分にぴったりの音楽を
              <br />
              探しにいこう。
            </p>
            <Link href="/search">音楽をさがす ↗</Link>
            <span className="note-stamp">have a lovely day</span>
          </section>
          <section className="community-card">
            <div className="aside-title">
              <h3>音楽好きの仲間たち</h3>
              <span>♧</span>
            </div>
            {people.map((person) => (
              <div className="mini-person" key={person.id}>
                <span className={`avatar ${person.color}`}>{person.icon}</span>
                <div>
                  <b>{person.name}</b>
                  <small>@{person.handle}</small>
                </div>
              </div>
            ))}
            <Link href="/following">みんなを見てみる →</Link>
          </section>
          <section className="little-memo">
            <span>✧ 小さな使い方メモ</span>
            <p>
              気になった曲には、
              <br />
              絵文字で気持ちを伝えてみよう。
              <br />
              言葉にしなくても、きっと届く。
            </p>
            <div>🤍　🎧　✨</div>
          </section>
          <p className="aside-foot">
            MADE FOR MUSIC LOVERS.
            <br />© Meloop · student project
          </p>
        </aside>
      </div>
    </div>
  );
}

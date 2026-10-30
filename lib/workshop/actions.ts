import { createClient } from "@/lib/supabase/client";
// 皆さんの穴埋めポイント。docs/TEAM_WORKBOOK.md と一緒に進めてください。
export async function submitAuth(
  mode: "login" | "signup",
  fields: {
    email: string;
    password: string;
    username: string;
  },
): Promise<string> {
  // TODO(A): Supabase Authに接続し、エラー・メール確認・セッションを処理する。
  const supabase = createClient();
  if(mode === "signup") {
    const { data, error } = await supabase.auth.signUp({
      email: fields.email.trim(),
      password: fields.password,
      options: {
        data: {
          username: fields.username.trim(),
        },
      },
    });
    if (error) {
      throw new Error(error.message);
    }

    return data.session
    ?"登録できました!!ログイン済みです!!"
    :"確認メールをご確認ください。確認後にログインしてください。";
  }
    const { error } = await supabase.auth.signInWithPassword({
      email: fields.email.trim(),
      password: fields.password,
    });
    if (error) {
      throw new Error(error.message);
    }

    return "ログインできました!!";
  }
export async function publishPost(
  text: string,
  spotifyTrackId: string,
): Promise<void> {
  const body = text.trim();
  if (!body) throw new Error("本文を入力してください。");
  if (!spotifyTrackId) throw new Error("曲を選んでください。");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です。");

  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    spotify_track_id: spotifyTrackId,
    body,
  });
  if (error) throw new Error(error.message);
}
export async function addReaction(
  postId: string,
  emoji: string,
): Promise<void> {
  const supabase = createClient();

  // アプリにログインしているユーザーを確認
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) {
    throw new Error("リアクションするにはログインしてください。");
  }

  // 同じリアクションがあれば重複登録しない
  const { error } = await supabase.from("likes").upsert(
    {
      post_id: postId,
      user_id: user.id,
      emoji,
    },
    {
      onConflict: "user_id,post_id,emoji",
      ignoreDuplicates: true,
    },
  );

  if (error) throw error;
}
export async function removeReaction(
  postId: string,
  emoji: string,
): Promise<void> {
  const supabase = createClient();

  // ログインユーザーを確認
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) {
    throw new Error("リアクションを解除するにはログインしてください。");
  }

  // 自分が、この投稿に付けた、この絵文字だけを削除
  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .eq("emoji", emoji);

  if (error) throw error;
}
export async function getMyReactions(
  postId: string,
): Promise<string[]> {
  const supabase = createClient();

  // ログインユーザーを確認
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;

  // 未ログインなら、選択済みの絵文字はなし
  if (!user) return [];

  // この投稿に自分が付けた絵文字を取得
  const { data, error } = await supabase
    .from("likes")
    .select("emoji")
    .eq("post_id", postId)
    .eq("user_id", user.id);

  if (error) throw error;

  return data.map((reaction) => reaction.emoji);
}
export async function followUser(
  followingId: string,
): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;

  if (!user) {
    throw new Error("フォローするにはログインしてください。");
  }

  if (user.id === followingId) {
    throw new Error("自分自身はフォローできません。");
  }

  const { error } = await supabase.from("follows").upsert(
    {
      follower_id: user.id,
      following_id: followingId,
    },
    {
      onConflict: "follower_id,following_id",
      ignoreDuplicates: true,
    },
  );

  if (error) throw error;
}
export async function unfollowUser(
  followingId: string,
): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;

  if (!user) {
    throw new Error("フォローを解除するにはログインしてください。");
  }

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", followingId);

  if (error) throw error;
}
export async function getMyFollowing(): Promise<string[]> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) return [];

  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  if (error) throw error;

  return data.map((follow) => follow.following_id);
}
export async function getFollowCandidates() {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;

  if (!user) {
    throw new Error("ログインしてください。");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, username, bio")
    .neq("user_id", user.id)
    .order("username");

  if (error) throw error;

  return data;
}
export async function getReactionCounts(
  postId: string,
): Promise<Record<string, number>> {
  const supabase = createClient();
  const emojis = ["🤍", "🥰", "🎧", "✨", "🔥"];

  const results = await Promise.all(
    emojis.map(async (emoji) => {
      const { count, error } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId)
        .eq("emoji", emoji);

      if (error) throw error;

      return [emoji, count ?? 0] as const;
    }),
  );

  return Object.fromEntries(results);
}
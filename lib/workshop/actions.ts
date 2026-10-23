import { createClient } from "../supabase/server";

export async function submitAuth(
  mode: "login" | "signup",
  fields: {
    email: string;
    password: string;
    username: string;
  },
): Promise<string> {
  // TODO(A): Supabase Authに接続し、エラー・メール確認・セッションを処理する。
  void mode;
  void fields;
  throw new Error(
    "認証は未接続です。lib/workshop/actions.ts の TODO(A) を実装してください。",
  );
}

export async function publishPost(
  text: string,
  spotifyTrackId: string,
): Promise<void> {
  const body = text.trim();
  if (!body) throw new Error("本文を入力してください。");
  if (!spotifyTrackId) throw new Error("曲を選んでください。");

  const supabase = await createClient();
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
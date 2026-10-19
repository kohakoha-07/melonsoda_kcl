import { createClient } from "@/lib/supabase/client";

// 自分のプロフィールを読み取る
export async function loadMyProfile() {
  const supabase = createClient();

  const { data: auth, error: authError } =
    await supabase.auth.getUser();

  if (authError || !auth.user) {
    throw new Error("ログインしてください。");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("username, bio")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) throw error;

  // 初回はプロフィールがないため、nullになる
  return data;
}

// 自分のプロフィールを新規保存、または更新する
export async function saveMyProfile(username: string, bio: string) {
  const supabase = createClient();

  const { data: auth, error: authError } =
    await supabase.auth.getUser();

  if (authError || !auth.user) {
    throw new Error("ログインしてください。");
  }

  const name = username.trim();

  if (!name || name.length > 30) {
    throw new Error("名前は1〜30文字で入力してください。");
  }

  if (bio.length > 280) {
    throw new Error("自己紹介は280文字以内で入力してください。");
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: auth.user.id,
      username: name,
      bio: bio.trim(),
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}
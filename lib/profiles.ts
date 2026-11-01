import { createClient } from "@/lib/supabase/client";

export const AVATAR_EMOJIS = ["🎧", "🎸", "🥁", "🎹", "🎤", "🎵", "🎶", "🖤", "🌟", "🌷", "🐈", "🐻"];
export type AvatarChoice = {
  mode: "emoji" | "image";
  emoji: string;
  file?: File | null;
};

export async function loadMyProfile() {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("ログインしてください。");
  const { data, error } = await supabase.from("profiles")
    .select("username, bio, avatar_url, avatar_emoji")
    .eq("user_id", auth.user.id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function saveMyProfile(username: string, bio: string, avatar?: AvatarChoice) {
  const name = username.trim();
  if (!name || name.length > 30) throw new Error("名前は1〜30文字で入力してください。");
  if (bio.length > 280) throw new Error("自己紹介は280文字以内で入力してください。");
  if (avatar && !AVATAR_EMOJIS.includes(avatar.emoji)) throw new Error("絵文字を選び直してください。");

  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("ログインしてください。");

  const changes: { avatar_url?: string | null; avatar_emoji?: string } = {};
  let uploadedPath: string | null = null;
  if (avatar) {
    changes.avatar_emoji = avatar.emoji;
    if (avatar.mode === "emoji") {
      changes.avatar_url = null;
    } else if (avatar.file) {
      const file = avatar.file;
      const extensions: Record<string, string> = {
        "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
      };
      const extension = extensions[file.type];
      if (!extension) throw new Error("JPEG・PNG・WebPの画像を選んでください。");
      if (file.size === 0 || file.size > 2 * 1024 * 1024) {
        throw new Error("画像は2MB以下にしてください。");
      }
      const path = `${auth.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (error) throw new Error(error.message);
      uploadedPath = path;
      changes.avatar_url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    } else {
      // 画像を選び直していなければ、現在の画像を維持する。
      const { data, error } = await supabase.from("profiles")
        .select("avatar_url").eq("user_id", auth.user.id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data?.avatar_url) throw new Error("画像を選んでください。");
    }
  }

  const { error } = await supabase.from("profiles").upsert({
    user_id: auth.user.id, username: name, bio: bio.trim(), ...changes,
  }, { onConflict: "user_id" });
  if (error) {
    if (uploadedPath) {
      await supabase.storage.from("avatars").remove([uploadedPath]).catch(() => undefined);
    }
    throw new Error(error.message);
  }
}

import { createClient } from "@/lib/supabase/client";

// ログイン中の本人を確認する
async function getCurrentUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("ログインしてください。");
  }

  return { supabase, user: data.user };
}

// 相手をフォローしているか調べる
export async function loadFollowState(targetUserId: string) {
  const { supabase, user } = await getCurrentUser();

  if (user.id === targetUserId) {
    return { isSelf: true, following: false };
  }

  const { data, error } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (error) throw error;

  return { isSelf: false, following: data !== null };
}

// フォローする、または解除する
export async function saveFollowState(
  targetUserId: string,
  following: boolean,
) {
  const { supabase, user } = await getCurrentUser();

  if (user.id === targetUserId) {
    throw new Error("自分自身はフォローできません。");
  }

  if (following) {
    const { error } = await supabase.from("follows").upsert(
      {
        follower_id: user.id,
        following_id: targetUserId,
      },
      {
        onConflict: "follower_id,following_id",
        ignoreDuplicates: true,
      },
    );

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId);

    if (error) throw error;
  }
}
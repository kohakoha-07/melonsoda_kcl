import { createClient } from "@/lib/supabase/client";

export type FollowListKind = "following" | "followers";

const PAGE_SIZE = 20;

// ログインしていることを確認する
async function getClient() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("ログインしてください。");
  }

  return supabase;
}

// 指定した人のフォロー中・フォロワー人数
export async function loadFollowCounts(userId: string) {
  const supabase = await getClient();

  const [following, followers] = await Promise.all([
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId),

    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", userId),
  ]);

  if (following.error) throw following.error;
  if (followers.error) throw followers.error;

  return {
    following: following.count ?? 0,
    followers: followers.count ?? 0,
  };
}

// 一覧を20人ずつ取得する
export async function loadFollowPeople(
  userId: string,
  kind: FollowListKind,
  page = 0,
) {
  const supabase = await getClient();
  const filterColumn =
    kind === "following" ? "follower_id" : "following_id";

  const start = Math.max(0, page) * PAGE_SIZE;

  const { data: relations, error } = await supabase
    .from("follows")
    .select("id, follower_id, following_id")
    .eq(filterColumn, userId)
    .order("id", { ascending: false })
    .range(start, start + PAGE_SIZE);

  if (error) throw error;

  const rows = relations ?? [];
  const hasMore = rows.length > PAGE_SIZE;

  const ids = rows.slice(0, PAGE_SIZE).map((row) =>
    kind === "following" ? row.following_id : row.follower_id,
  );

  if (ids.length === 0) {
    return { people: [], hasMore: false };
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, username, bio")
    .in("user_id", ids);

  if (profileError) throw profileError;

  const people = ids.map((id) => {
    const profile = profiles?.find((item) => item.user_id === id);

    return {
      userId: id as string,
      username: profile?.username || "プロフィール未設定",
      bio: profile?.bio || "",
    };
  });

  return { people, hasMore };
}

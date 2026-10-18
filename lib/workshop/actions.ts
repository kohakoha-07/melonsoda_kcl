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
  void mode;
  void fields;
  throw new Error(
    "認証は未接続です。lib/workshop/actions.ts の TODO(A) を実装してください。",
  );
}

export async function publishPost(text: string): Promise<void> {
  // TODO(B): 認証を確認し、選択したSpotify曲と本文をpostsへ保存する。
  void text;
  throw new Error(
    "投稿の保存は未接続です。lib/workshop/actions.ts の TODO(B) を実装してください。",
  );
}

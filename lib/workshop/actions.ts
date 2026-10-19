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
  export async function publishPost(text: string): Promise<void> {
  // TODO(B): 認証を確認し、選択したSpotify曲と本文を保存する。
  void text;
  throw new Error("投稿の保存はまだ未接続です。");
}

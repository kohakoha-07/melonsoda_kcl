import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SignupBody = {
  email?: string;
  password?: string;
  username?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupBody;

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const username = body.username?.trim();

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: "メールアドレス、パスワード、ユーザー名を入力してください。" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上にしてください。" },
        { status: 400 }
      );
    }

    if (username.length < 2 || username.length > 30) {
      return NextResponse.json(
        { error: "ユーザー名は2〜30文字で入力してください。" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // 登録前にユーザー名の重複を確認
    const { data: isAvailable, error: availabilityError } = await supabase.rpc(
      "is_username_available",
      { requested_username: username }
    );

    if (availabilityError) {
      console.error("username availability error:", availabilityError);
      return NextResponse.json(
        { error: "ユーザー名の確認に失敗しました。" },
        { status: 500 }
      );
    }

    if (!isAvailable) {
      return NextResponse.json(
        { error: "そのユーザー名はすでに使われています。" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (error) {
      // DB側のUNIQUE制約でも重複を最終防止
      if (
        error.message.toLowerCase().includes("database") ||
        error.message.toLowerCase().includes("duplicate")
      ) {
        return NextResponse.json(
          { error: "そのユーザー名はすでに使われている可能性があります。" },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: data.session
          ? "登録しました。"
          : "登録しました。確認メールが届いている場合は、メール内のリンクを開いてください。",
        user: data.user
          ? {
              id: data.user.id,
              email: data.user.email,
              username,
            }
          : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("signup error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました。" },
      { status: 500 }
    );
  }
}

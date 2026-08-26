// 既存のログイン/新規登録画面からAPIを呼ぶ例です。
// React / Next.js の onSubmit 内に合わせて移植してください。

export async function signup(
  email: string,
  password: string,
  username: string
) {
  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, username }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "新規登録に失敗しました。");
  }

  return data;
}

export async function login(email: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "ログインに失敗しました。");
  }

  return data;
}

export async function logout() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "ログアウトに失敗しました。");
  }

  return data;
}

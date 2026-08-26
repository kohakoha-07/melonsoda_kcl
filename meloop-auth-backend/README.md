# Meloop Auth Backend

Next.js（App Router）+ Supabase Auth 用の認証バックエンドです。

## できること

- 新規登録
  - メールアドレス
  - パスワード（8文字以上）
  - ユーザー名
  - ユーザー名の重複禁止（大文字・小文字を無視）
- ログイン
  - メールアドレス
  - パスワード
- ログアウト
- Supabase Auth のセッションCookie更新

## 1. 必要パッケージ

既存のNext.jsプロジェクトのターミナルで実行してください。

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## 2. ファイルをプロジェクトへ追加

このフォルダの中身を、既存のNext.jsプロジェクトへ同じ階層でコピーしてください。

特に以下を追加します。

```text
src/
  app/
    api/
      auth/
        signup/route.ts
        login/route.ts
        logout/route.ts
  lib/
    supabase/
      server.ts
supabase/
  migrations/
    001_auth_profiles.sql
middleware.ts
.env.local.example
```

`@/` エイリアスを使っていないプロジェクトの場合は、
`@/lib/supabase/server` を自分のプロジェクトに合う相対パスへ変更してください。

## 3. Supabase側の設定

Supabase Dashboard を開きます。

1. プロジェクトを開く
2. `SQL Editor` を開く
3. `supabase/migrations/001_auth_profiles.sql` の中身を貼る
4. `Run` を押す

これで `profiles` テーブルと、ユーザー名重複防止処理が作られます。

## 4. 環境変数

Supabase Dashboard の

`Project Settings` → `API`

から以下を確認します。

- Project URL
- anon / publishable key

`.env.local.example` をコピーして `.env.local` に名前を変え、値を入れてください。

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

`.env.local` はGitHubへpushしないでください。

## 5. API

### 新規登録

`POST /api/auth/signup`

```json
{
  "email": "sample@example.com",
  "password": "password123",
  "username": "meloop_user"
}
```

### ログイン

`POST /api/auth/login`

```json
{
  "email": "sample@example.com",
  "password": "password123"
}
```

### ログアウト

`POST /api/auth/logout`

## 6. 既存画面につなぐ

`frontend-example.ts` に `fetch()` の例があります。

ログインボタン:
- `login(email, password)` を実行

新規登録ボタン:
- `signup(email, password, username)` を実行

成功後は、たとえば `router.push("/home")` でホーム画面へ移動できます。

## 7. Supabaseのメール確認について

Supabase Auth の設定でメール確認（Confirm email）がONの場合、
新規登録後に確認メールが送られます。

身内だけで試す開発初期なら、Supabase Dashboard の
Authentication設定からメール確認をOFFにすると動作確認が簡単です。

本番公開時はONを推奨します。

## 8. GitHubへmergeする流れ

例:

```bash
git checkout -b feature/auth-backend
git add .
git commit -m "Add Supabase authentication backend"
git push origin feature/auth-backend
```

その後GitHubでPull Requestを作り、問題なければMergeしてください。

## 注意

このセットには `service_role` キーを使っていません。
そのため、秘密度の高い管理者キーをGitHubへ置く必要はありません。

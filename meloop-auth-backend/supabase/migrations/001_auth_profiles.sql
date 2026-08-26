-- Meloop: Auth + profiles
-- Supabase Dashboard > SQL Editor でこのファイルの内容を実行してもOKです。

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),

  constraint username_length check (char_length(username) between 2 and 30)
);

-- 大文字・小文字を無視してユーザー名の重複を禁止
create unique index if not exists profiles_username_unique_ci
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- ログイン済みユーザーがプロフィールを閲覧できる
drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
on public.profiles
for select
to authenticated
using (true);

-- 自分のプロフィールだけ更新可能
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Authユーザー作成時に profiles を自動作成
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    trim(new.raw_user_meta_data ->> 'username')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 未ログインでも「そのユーザー名が空いているか」だけ確認できる関数
create or replace function public.is_username_available(requested_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    requested_username is not null
    and char_length(trim(requested_username)) between 2 and 30
    and not exists (
      select 1
      from public.profiles
      where lower(username) = lower(trim(requested_username))
    );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

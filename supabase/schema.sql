-- 介護現場 AI活用計画づくり MVP
-- Supabase SQL Editorで実行してください。

create extension if not exists pgcrypto;

create table if not exists public.ai_usecase_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  receipt_number text not null unique,
  app_version text not null default '0.1.0',
  service_type text not null,
  role_type text not null,
  work_category text not null,
  ai_prompt text not null,
  action_plan text not null,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','reviewed')),
  reviewed_at timestamptz
);

alter table public.ai_usecase_submissions enable row level security;

-- 公開利用者は新規送信だけできます。過去データの閲覧・更新・削除はできません。
-- 管理者が同じブラウザでログイン済みでも送信テストできるよう、authenticatedにもINSERTを許可します。
drop policy if exists "public can insert plans" on public.ai_usecase_submissions;
create policy "public can insert plans"
on public.ai_usecase_submissions
for insert
to anon, authenticated
with check (
  status = 'new'
  and char_length(ai_prompt) between 1 and 30000
  and char_length(action_plan) between 1 and 30000
);

-- 運営者はSupabase Authでログイン後、閲覧・更新・削除できます。
-- Supabase側の「Allow new users to sign up」をOFFにし、運営者アカウントだけを手動作成してください。
drop policy if exists "authenticated can read plans" on public.ai_usecase_submissions;
create policy "authenticated can read plans"
on public.ai_usecase_submissions
for select
to authenticated
using (true);

drop policy if exists "authenticated can update plans" on public.ai_usecase_submissions;
create policy "authenticated can update plans"
on public.ai_usecase_submissions
for update
to authenticated
using (true)
with check (status in ('new','reviewed'));

drop policy if exists "authenticated can delete plans" on public.ai_usecase_submissions;
create policy "authenticated can delete plans"
on public.ai_usecase_submissions
for delete
to authenticated
using (true);

-- テーブル権限
grant insert on table public.ai_usecase_submissions to anon, authenticated;
grant select, update, delete on table public.ai_usecase_submissions to authenticated;

-- 管理画面の一覧を速くするための索引
create index if not exists ai_usecase_submissions_created_at_idx on public.ai_usecase_submissions (created_at desc);
create index if not exists ai_usecase_submissions_status_idx on public.ai_usecase_submissions (status);

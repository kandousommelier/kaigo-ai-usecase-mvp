-- 送信エラー修正用
-- Supabase SQL Editorへ貼り付けて実行してください。

-- 管理者ログイン済みの同じブラウザからでも送信できるよう、
-- authenticatedロールにもINSERT権限を付与します。
grant insert on table public.ai_usecase_submissions to authenticated;

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

-- SALT BOY comments are isolated from the preserved So Honey archive.
-- Clone the current comment schema, with independent identity sequences and foreign keys.
create table public.salt_boy_store_comments (like public.store_comments including all);
create table public.salt_boy_store_comment_applause (like public.store_comment_applause including all);
alter table public.salt_boy_store_comments add foreign key (store_id) references public.stores(id) on delete cascade;
alter table public.salt_boy_store_comment_applause add foreign key (comment_id) references public.salt_boy_store_comments(id) on delete cascade;
alter table public.salt_boy_store_comments enable row level security;
alter table public.salt_boy_store_comment_applause enable row level security;
revoke all on public.salt_boy_store_comments, public.salt_boy_store_comment_applause from public, anon, authenticated;
grant all on public.salt_boy_store_comments, public.salt_boy_store_comment_applause to service_role;

CREATE OR REPLACE FUNCTION public.salt_boy_delete_own_store_comment(p_comment_id bigint, p_client_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_client_hash text;
begin
  if coalesce(btrim(p_client_id), '') = '' then
    raise exception '投稿情報を確認できませんでした。ページを再読み込みしてお試しください。';
  end if;

  v_client_hash := md5(p_client_id::text);

  update public.salt_boy_store_comments
  set
    is_deleted = true,
    deleted_at = now(),
    deleted_source = 'self',
    deleted_by = null
  where id = p_comment_id
    and client_hash = v_client_hash
    and coalesce(is_deleted, false) = false;

  if not found then
    raise exception 'このコメントは削除できません。自分の投稿か、すでに削除済みかをご確認ください。';
  end if;
end;
$function$

;
revoke all on function public.salt_boy_delete_own_store_comment(bigint, text) from public, anon, authenticated;
grant execute on function public.salt_boy_delete_own_store_comment(bigint, text) to anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.salt_boy_get_store_comment_counts()
 RETURNS TABLE(store_id bigint, comment_count bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    c.store_id,
    count(*)::bigint as comment_count
  from public.salt_boy_store_comments c
  where c.is_deleted = false
    and c.created_at >= now() - interval '30 days'
  group by c.store_id;
$function$

;
revoke all on function public.salt_boy_get_store_comment_counts() from public, anon, authenticated;
grant execute on function public.salt_boy_get_store_comment_counts() to anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.salt_boy_get_store_comments(p_store_id bigint, p_limit integer DEFAULT 20, p_client_id text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, store_id bigint, body text, created_at timestamp with time zone, is_own boolean, applause_count bigint, applauded_by_me boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    c.id, c.store_id, c.body, c.created_at,
    (p_client_id is not null and c.client_hash = md5(p_client_id::text)) as is_own,
    (select count(*) from public.salt_boy_store_comment_applause a where a.comment_id = c.id) as applause_count,
    (
      p_client_id is not null and exists (
        select 1 from public.salt_boy_store_comment_applause a
        where a.comment_id = c.id and a.client_hash = md5(p_client_id::text)
      )
    ) as applauded_by_me
  from public.salt_boy_store_comments c
  where c.store_id = p_store_id
    and coalesce(c.is_deleted, false) = false
  order by c.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$function$

;
revoke all on function public.salt_boy_get_store_comments(bigint, integer, text) from public, anon, authenticated;
grant execute on function public.salt_boy_get_store_comments(bigint, integer, text) to anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.salt_boy_get_store_comments_admin()
 RETURNS TABLE(id bigint, store_id bigint, store_name text, body text, created_at timestamp with time zone, is_deleted boolean, deleted_at timestamp with time zone, deleted_source text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    c.id,
    c.store_id,
    case
      when coalesce(nullif(btrim(s.chain_name), ''), '') = '' then s.name
      when lower(s.name) like '%' || lower(s.chain_name) || '%' then s.name
      else s.chain_name || ' ' || s.name
    end as store_name,
    c.body,
    c.created_at,
    coalesce(c.is_deleted, false) as is_deleted,
    c.deleted_at,
    c.deleted_source
  from public.salt_boy_store_comments c
  join public.stores s on s.id = c.store_id
  where public.is_inventory_admin()
  order by c.created_at desc;
$function$

;
revoke all on function public.salt_boy_get_store_comments_admin() from public, anon, authenticated;
grant execute on function public.salt_boy_get_store_comments_admin() to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.salt_boy_set_store_comment_deleted_admin(p_comment_id bigint, p_deleted boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_inventory_admin() then
    raise exception '管理者権限がありません。';
  end if;

  if p_deleted then
    update public.salt_boy_store_comments
    set
      is_deleted = true,
      deleted_at = now(),
      deleted_source = 'admin',
      deleted_by = auth.uid()
    where id = p_comment_id;
  else
    -- Keep deleted_at/deleted_source/deleted_by as the latest deletion history.
    update public.salt_boy_store_comments
    set is_deleted = false
    where id = p_comment_id;
  end if;

  if not found then
    raise exception '店舗コメントが見つかりません。';
  end if;
end;
$function$

;
revoke all on function public.salt_boy_set_store_comment_deleted_admin(bigint, boolean) from public, anon, authenticated;
grant execute on function public.salt_boy_set_store_comment_deleted_admin(bigint, boolean) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.salt_boy_submit_store_comment(p_store_id bigint, p_body text, p_client_id text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_body text;
  v_client_hash text;
  v_id bigint;
begin
  v_body := btrim(coalesce(p_body, ''));

  if not exists (
    select 1 from public.stores s where s.id = p_store_id
  ) then
    raise exception '店舗が見つかりません。';
  end if;

  if char_length(v_body) = 0 then
    raise exception 'コメントを入力してください。';
  end if;

  if char_length(v_body) > 300 then
    raise exception 'コメントは300文字以内で入力してください。';
  end if;

  if v_body ~* '(https?://|www\.)' then
    raise exception '店舗コメントにはURLを投稿できません。';
  end if;

  if coalesce(btrim(p_client_id), '') = '' then
    raise exception '投稿情報を確認できませんでした。ページを再読み込みしてお試しください。';
  end if;

  v_client_hash := md5(p_client_id::text);

  if exists (
    select 1
    from public.salt_boy_store_comments c
    where c.client_hash = v_client_hash
      and c.store_id = p_store_id
      and c.created_at >= now() - interval '2 minutes'
  ) then
    raise exception '同じ店舗へのコメントが続いています。少し時間をおいてからもう一度お試しください。';
  end if;

  if (
    select count(*)
    from public.salt_boy_store_comments c
    where c.client_hash = v_client_hash
      and c.created_at >= now() - interval '1 hour'
  ) >= 20 then
    raise exception '短時間にコメント投稿が集中したため、一時的に投稿を制限しています。時間をおいてからもう一度お試しください。';
  end if;

  insert into public.salt_boy_store_comments (
    store_id,
    body,
    client_hash
  ) values (
    p_store_id,
    v_body,
    v_client_hash
  )
  returning id into v_id;

  return v_id;
end;
$function$

;
revoke all on function public.salt_boy_submit_store_comment(bigint, text, text) from public, anon, authenticated;
grant execute on function public.salt_boy_submit_store_comment(bigint, text, text) to anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.salt_boy_toggle_store_comment_applause(p_comment_id bigint, p_client_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_hash text;
begin
  if coalesce(btrim(p_client_id), '') = '' then
    raise exception 'ブラウザ識別情報を確認できませんでした。';
  end if;

  if not exists (
    select 1 from public.salt_boy_store_comments c
    where c.id = p_comment_id
      and coalesce(c.is_deleted, false) = false
  ) then
    raise exception 'コメントが見つかりません。';
  end if;

  v_hash := md5(p_client_id::text);

  if exists (
    select 1 from public.salt_boy_store_comment_applause a
    where a.comment_id = p_comment_id and a.client_hash = v_hash
  ) then
    delete from public.salt_boy_store_comment_applause
    where comment_id = p_comment_id and client_hash = v_hash;
  else
    insert into public.salt_boy_store_comment_applause(comment_id, client_hash)
    values (p_comment_id, v_hash)
    on conflict (comment_id, client_hash) do nothing;
  end if;
end;
$function$

;
revoke all on function public.salt_boy_toggle_store_comment_applause(bigint, text) from public, anon, authenticated;
grant execute on function public.salt_boy_toggle_store_comment_applause(bigint, text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

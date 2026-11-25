-- SALT BOY sales are independent; no So Honey rows or RPCs are changed.
create table public.salt_boy_sales_daily (like public.sales_daily including all);
create table public.salt_boy_sales_tracking_config (like public.sales_tracking_config including all);
create table public.salt_boy_sales_week_baselines (like public.sales_week_baselines including all);
alter table public.salt_boy_sales_tracking_config alter column goal drop not null;
alter table public.salt_boy_sales_tracking_config alter column goal drop default;
alter table public.salt_boy_sales_tracking_config alter column first_tracked_date set default '2026-11-24';
insert into public.salt_boy_sales_tracking_config(id,baseline_total,goal,first_tracked_date) values(true,0,null,'2026-11-24');
alter table public.salt_boy_sales_daily enable row level security;
alter table public.salt_boy_sales_tracking_config enable row level security;
alter table public.salt_boy_sales_week_baselines enable row level security;
revoke all on public.salt_boy_sales_daily,public.salt_boy_sales_tracking_config,public.salt_boy_sales_week_baselines from public,anon,authenticated;
grant all on public.salt_boy_sales_daily,public.salt_boy_sales_tracking_config,public.salt_boy_sales_week_baselines to service_role;

CREATE OR REPLACE FUNCTION public.salt_boy_get_sales_daily_admin()
 RETURNS TABLE(sales_date date, sales integer, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    d.sales_date,
    d.sales,
    d.updated_at
  from public.salt_boy_sales_daily d
  where public.is_inventory_admin()
  order by d.sales_date asc;
$function$
;
revoke all on function public.salt_boy_get_sales_daily_admin() from public,anon,authenticated;
grant execute on function public.salt_boy_get_sales_daily_admin() to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.salt_boy_get_sales_summary_v2()
 RETURNS TABLE(id integer, today_sales integer, weekly_sales integer, total_sales integer, goal integer, sales_date date, week_start date, week_end date, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_date date;
  v_week_start date;
  v_week_end date;
  v_week_baseline integer;
  v_week_count integer;
  v_week_sum bigint;
  v_total_baseline integer;
  v_total_count integer;
  v_total_sum bigint;
  v_goal integer;
  v_today integer;
  v_updated_at timestamptz;
begin
  if not public.is_inventory_admin() then raise exception '管理者権限がありません。' using errcode='42501'; end if;
  select max(d.sales_date)
    into v_date
  from public.salt_boy_sales_daily d;

  if v_date is null then
    return;
  end if;

  v_week_start :=
    date_trunc(
      'week',
      v_date::timestamp
    )::date;

  v_week_end := v_week_start + 6;

  select d.sales, d.updated_at
    into v_today, v_updated_at
  from public.salt_boy_sales_daily d
  where d.sales_date = v_date;

  select b.baseline_sales
    into v_week_baseline
  from public.salt_boy_sales_week_baselines b
  where b.week_start = v_week_start;

  select
    count(d.sales),
    coalesce(sum(d.sales), 0)
    into v_week_count, v_week_sum
  from public.salt_boy_sales_daily d
  where d.sales_date between
    v_week_start and v_week_end;

  select
    c.baseline_total,
    c.goal
    into
      v_total_baseline,
      v_goal
  from public.salt_boy_sales_tracking_config c
  where c.id = true;

  select
    count(d.sales),
    coalesce(sum(d.sales), 0)
    into v_total_count, v_total_sum
  from public.salt_boy_sales_daily d;

  return query
  select
    1,
    v_today,
    case
      when
        v_week_baseline is null
        and v_week_count = 0
      then null
      else
        coalesce(v_week_baseline, 0)
        + v_week_sum::integer
    end,
    case
      when
        v_total_baseline is null
        and v_total_count = 0
      then null
      else
        coalesce(v_total_baseline, 0)
        + v_total_sum::integer
    end,
    v_goal,
    v_date,
    v_week_start,
    v_week_end,
    v_updated_at;
end;
$function$
;
revoke all on function public.salt_boy_get_sales_summary_v2() from public,anon,authenticated;
grant execute on function public.salt_boy_get_sales_summary_v2() to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.salt_boy_preview_sales_day_admin(p_sales_date date, p_sales integer)
 RETURNS TABLE(week_start date, week_end date, weekly_sales integer, total_sales integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_week_start date;
  v_week_end date;
  v_week_baseline integer;
  v_week_count integer;
  v_week_sum bigint;
  v_total_baseline integer;
  v_total_count integer;
  v_total_sum bigint;
begin
  if not public.is_inventory_admin() then
    raise exception 'admin only';
  end if;

  if p_sales is not null and p_sales < 0 then
    raise exception 'sales must be zero or greater';
  end if;

  v_week_start :=
    date_trunc(
      'week',
      p_sales_date::timestamp
    )::date;

  v_week_end := v_week_start + 6;

  select b.baseline_sales
    into v_week_baseline
  from public.salt_boy_sales_week_baselines b
  where b.week_start = v_week_start;

  select
    count(x.sales),
    coalesce(sum(x.sales), 0)
    into v_week_count, v_week_sum
  from (
    select
      d.sales_date,
      case
        when d.sales_date = p_sales_date
          then p_sales
        else d.sales
      end as sales
    from public.salt_boy_sales_daily d
    where d.sales_date between
      v_week_start and v_week_end

    union all

    select
      p_sales_date,
      p_sales
    where not exists (
      select 1
      from public.salt_boy_sales_daily d2
      where d2.sales_date = p_sales_date
    )
  ) x;

  select c.baseline_total
    into v_total_baseline
  from public.salt_boy_sales_tracking_config c
  where c.id = true;

  select
    count(x.sales),
    coalesce(sum(x.sales), 0)
    into v_total_count, v_total_sum
  from (
    select
      d.sales_date,
      case
        when d.sales_date = p_sales_date
          then p_sales
        else d.sales
      end as sales
    from public.salt_boy_sales_daily d

    union all

    select
      p_sales_date,
      p_sales
    where not exists (
      select 1
      from public.salt_boy_sales_daily d2
      where d2.sales_date = p_sales_date
    )
  ) x;

  return query
  select
    v_week_start,
    v_week_end,
    case
      when
        v_week_baseline is null
        and v_week_count = 0
      then null
      else
        coalesce(v_week_baseline, 0)
        + v_week_sum::integer
    end,
    case
      when
        v_total_baseline is null
        and v_total_count = 0
      then null
      else
        coalesce(v_total_baseline, 0)
        + v_total_sum::integer
    end;
end;
$function$
;
revoke all on function public.salt_boy_preview_sales_day_admin(date, integer) from public,anon,authenticated;
grant execute on function public.salt_boy_preview_sales_day_admin(date, integer) to authenticated,service_role;

CREATE OR REPLACE FUNCTION public.salt_boy_upsert_sales_day_admin(p_sales_date date, p_sales integer, p_goal integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_inventory_admin() then
    raise exception 'admin only';
  end if;

  if p_sales is not null and p_sales < 0 then
    raise exception 'sales must be zero or greater';
  end if;

  if p_goal is null or p_goal <= 0 then
    raise exception 'goal must be greater than zero';
  end if;

  insert into public.salt_boy_sales_daily (
    sales_date,
    sales,
    updated_at,
    updated_by
  )
  values (
    p_sales_date,
    p_sales,
    now(),
    auth.uid()
  )
  on conflict (sales_date)
  do update set
    sales = excluded.sales,
    updated_at = now(),
    updated_by = auth.uid();

  update public.salt_boy_sales_tracking_config
  set
    goal = p_goal,
    updated_at = now()
  where id = true;
end;
$function$
;
revoke all on function public.salt_boy_upsert_sales_day_admin(date, integer, integer) from public,anon,authenticated;
grant execute on function public.salt_boy_upsert_sales_day_admin(date, integer, integer) to authenticated,service_role;

create table public.salt_boy_page_access_events(event_id uuid primary key,created_at timestamptz not null default now());
create table public.salt_boy_access_config(id boolean primary key default true check(id),started_at timestamptz);
insert into public.salt_boy_access_config(id) values(true);
alter table public.salt_boy_page_access_events enable row level security;
alter table public.salt_boy_access_config enable row level security;
revoke all on public.salt_boy_page_access_events,public.salt_boy_access_config from public,anon,authenticated;
grant all on public.salt_boy_page_access_events,public.salt_boy_access_config to service_role;
create index salt_boy_page_access_events_created on public.salt_boy_page_access_events(created_at);

create function public.salt_boy_record_page_access(p_event_id uuid,p_client_id text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if p_event_id is null or p_client_id is null or length(trim(p_client_id)) not between 10 and 200 then raise exception 'アクセス情報が正しくありません。'; end if;
  insert into public.salt_boy_page_access_events(event_id) values(p_event_id) on conflict do nothing;
  if not found then return; end if;
  perform public.record_page_access('/stockchecker/saltboy',p_client_id);
  update public.salt_boy_access_config set started_at=coalesce(started_at,now()) where id;
end;
$$;
revoke all on function public.salt_boy_record_page_access(uuid,text) from public,anon,authenticated;
grant execute on function public.salt_boy_record_page_access(uuid,text) to service_role;
select cron.schedule('salt-boy-access-events-cleanup','30 18 * * *','delete from public.salt_boy_page_access_events where created_at<now()-interval ''30 days'';');

create function public.salt_boy_get_activity_admin(p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_inventory_admin() then raise exception '管理者権限がありません。' using errcode='42501'; end if;
  return jsonb_build_object('started_at',(select started_at from public.salt_boy_access_config where id),'daily',(
    select jsonb_agg(jsonb_build_object('access_date',d,'path','/stockchecker/saltboy',
      'views',coalesce(a.views,0),'unique_visitors',coalesce(a.unique_visitors,0),
      'inventory_submissions',r.submissions,'inventory_reports',r.reports,'inventory_deleted',r.deleted,
      'comments',c.n,'store_info',i.n) order by d desc)
    from (select generate_series((now() at time zone 'Asia/Tokyo')::date-greatest(1,least(coalesce(p_days,30),365))+1,(now() at time zone 'Asia/Tokyo')::date,'1 day'::interval)::date d) dates
    left join public.page_access_daily a on a.access_date=d and a.path='/stockchecker/saltboy'
    cross join lateral (select count(distinct (client_hash,request_id)) submissions,count(*) reports,count(*) filter(where deleted_at is not null) deleted
      from public.salt_boy_inventory_reports where created_at>=d::timestamp at time zone 'Asia/Tokyo' and created_at<(d+1)::timestamp at time zone 'Asia/Tokyo') r
    cross join lateral (select count(*) n from public.salt_boy_store_comments where created_at>=d::timestamp at time zone 'Asia/Tokyo' and created_at<(d+1)::timestamp at time zone 'Asia/Tokyo') c
    cross join lateral (select count(*) n from public.store_info_requests where requested_at>=d::timestamp at time zone 'Asia/Tokyo' and requested_at<(d+1)::timestamp at time zone 'Asia/Tokyo' and detail like '[SALT BOY%') i
  ));
end;
$$;
revoke all on function public.salt_boy_get_activity_admin(integer) from public,anon,authenticated;
grant execute on function public.salt_boy_get_activity_admin(integer) to authenticated,service_role;

alter table public.stores add column cd_handling_note text;
alter table public.stores add column cd_handling_verified_at timestamptz;
alter table public.stores add column cd_handling_source text;
notify pgrst,'reload schema';

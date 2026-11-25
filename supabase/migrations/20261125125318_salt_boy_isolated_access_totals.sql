-- Keep access totals and visitor identifiers in SALT BOY-only tables as well.
create table public.salt_boy_page_access_daily (like public.page_access_daily including all);
create table public.salt_boy_page_access_unique (like public.page_access_unique including all);
alter table public.salt_boy_page_access_daily enable row level security;
alter table public.salt_boy_page_access_unique enable row level security;
revoke all on public.salt_boy_page_access_daily,public.salt_boy_page_access_unique from public,anon,authenticated;
grant all on public.salt_boy_page_access_daily,public.salt_boy_page_access_unique to service_role;
create or replace function public.salt_boy_record_page_access(p_event_id uuid,p_client_id text) returns void
language plpgsql security definer set search_path='' as $$
declare v_date date:=(now() at time zone 'Asia/Tokyo')::date;v_unique boolean;
begin
  if p_event_id is null or p_client_id is null or length(trim(p_client_id)) not between 10 and 200 then raise exception 'アクセス情報が正しくありません。'; end if;
  insert into public.salt_boy_page_access_events(event_id) values(p_event_id) on conflict do nothing;
  if not found then return; end if;
  insert into public.salt_boy_page_access_unique(access_date,path,client_hash)
    values(v_date,'/stockchecker/saltboy',md5(p_client_id)) on conflict do nothing;
  v_unique:=found;
  insert into public.salt_boy_page_access_daily(access_date,path,views,unique_visitors)
    values(v_date,'/stockchecker/saltboy',1,case when v_unique then 1 else 0 end)
    on conflict(access_date,path) do update set views=public.salt_boy_page_access_daily.views+1,
      unique_visitors=public.salt_boy_page_access_daily.unique_visitors+case when v_unique then 1 else 0 end;
  update public.salt_boy_access_config set started_at=coalesce(started_at,now()) where id;
end;
$$;
CREATE OR REPLACE FUNCTION public.salt_boy_get_activity_admin(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_inventory_admin() then raise exception '管理者権限がありません。' using errcode='42501'; end if;
  return jsonb_build_object('started_at',(select started_at from public.salt_boy_access_config where id),'daily',(
    select jsonb_agg(jsonb_build_object('access_date',d,'path','/stockchecker/saltboy',
      'views',coalesce(a.views,0),'unique_visitors',coalesce(a.unique_visitors,0),
      'inventory_submissions',r.submissions,'inventory_reports',r.reports,'inventory_deleted',r.deleted,
      'comments',c.n,'store_info',i.n) order by d desc)
    from (select generate_series((now() at time zone 'Asia/Tokyo')::date-greatest(1,least(coalesce(p_days,30),365))+1,(now() at time zone 'Asia/Tokyo')::date,'1 day'::interval)::date d) dates
    left join public.salt_boy_page_access_daily a on a.access_date=d and a.path='/stockchecker/saltboy'
    cross join lateral (select count(distinct (client_hash,request_id)) submissions,count(*) reports,count(*) filter(where deleted_at is not null) deleted
      from public.salt_boy_inventory_reports where created_at>=d::timestamp at time zone 'Asia/Tokyo' and created_at<(d+1)::timestamp at time zone 'Asia/Tokyo') r
    cross join lateral (select count(*) n from public.salt_boy_store_comments where created_at>=d::timestamp at time zone 'Asia/Tokyo' and created_at<(d+1)::timestamp at time zone 'Asia/Tokyo') c
    cross join lateral (select count(*) n from public.store_info_requests where requested_at>=d::timestamp at time zone 'Asia/Tokyo' and requested_at<(d+1)::timestamp at time zone 'Asia/Tokyo' and detail like '[SALT BOY%') i
  ));
end;
$function$
;
select cron.schedule('salt-boy-access-identities-cleanup','35 18 * * *','delete from public.salt_boy_page_access_unique where access_date<(now() at time zone ''Asia/Tokyo'')::date-30;');
notify pgrst,'reload schema';

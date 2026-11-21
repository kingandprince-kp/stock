-- SALT BOY only. Preserve the established batch threshold and the So Honey tables.
alter table public.salt_boy_inventory_reports add column ip_hash text;
alter table public.salt_boy_inventory_reports add column review_reason text;
create index salt_boy_inventory_ip_recent_idx on public.salt_boy_inventory_reports (ip_hash, created_at desc);
create index salt_boy_inventory_client_recent_idx on public.salt_boy_inventory_reports (client_hash, created_at desc);

create table public.salt_boy_security_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  client_hash text,
  store_id bigint,
  request_id uuid,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.salt_boy_security_events enable row level security;
revoke all on public.salt_boy_security_events from public, anon, authenticated;
grant all on public.salt_boy_security_events to service_role;
grant usage, select on sequence public.salt_boy_security_events_id_seq to service_role;

create function public.salt_boy_submit_inventory_checked(
  p_store_id bigint, p_client_hash text, p_request_id uuid, p_items jsonb, p_ip_hash text
) returns table(report_id bigint, product_id bigint)
language plpgsql security definer set search_path = '' as $$
declare
  v_online boolean;
  v_count integer;
  v_limit integer;
  v_rollback boolean;
begin
  if p_client_hash is null or p_client_hash !~ '^[a-f0-9]{64}$'
    or (p_ip_hash is not null and p_ip_hash !~ '^[a-f0-9]{64}$') then
    raise exception '投稿情報を確認できません。';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('salt_boy:' || p_client_hash || ':' || p_request_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('salt_boy_review:' || p_client_hash, 0));
  if p_ip_hash is not null then
    perform pg_advisory_xact_lock(hashtextextended('salt_boy_ip:' || p_ip_hash, 0));
  end if;
  -- An identical network retry is not a new submission and consumes no quota.
  if exists(select 1 from public.salt_boy_inventory_reports r where r.client_hash=p_client_hash and r.request_id=p_request_id) then
    return query select * from public.salt_boy_submit_inventory(p_store_id,p_client_hash,p_request_id,p_items);
    return;
  end if;
  select s.store_type='online' or s.prefecture='オンライン' into v_online
    from public.stores s where s.id=p_store_id and s.is_active;
  if not found then raise exception '有効な店舗が見つかりません。'; end if;
  if v_online and exists(select 1 from jsonb_to_recordset(p_items) as item(quantity integer) where item.quantity<>0) then
    raise exception 'オンラインは枚数ではなく在庫状況を選択してください。';
  end if;
  if exists(
    select 1 from public.salt_boy_inventory_reports r
    join jsonb_to_recordset(p_items) as item(product_id bigint,purchase_variant text)
      on item.product_id=r.product_id and item.purchase_variant is not distinct from r.purchase_variant
    where r.client_hash=p_client_hash and r.store_id=p_store_id and r.created_at>now()-interval '3 minutes'
  ) then
    raise exception '同じ店舗・同じ商品への連続投稿は、3分以上時間をおいてください。' using errcode='P0429';
  end if;
  if p_ip_hash is not null and exists(
    select 1 from public.salt_boy_inventory_reports r
    join jsonb_to_recordset(p_items) as item(product_id bigint,purchase_variant text)
      on item.product_id=r.product_id and item.purchase_variant is not distinct from r.purchase_variant
    where r.ip_hash=p_ip_hash and r.store_id=p_store_id and r.created_at>now()-interval '10 minutes'
    group by r.product_id,r.purchase_variant having count(distinct r.request_id)>=5
  ) then
    raise exception '同じ店舗・同じ商品への投稿が集中しています。10分ほど時間をおいてください。' using errcode='P0429';
  end if;
  select count(distinct r.request_id) into v_count
    from public.salt_boy_inventory_reports r join public.stores s on s.id=r.store_id
    where r.client_hash=p_client_hash and (p_ip_hash is null or r.ip_hash=p_ip_hash)
      and (s.store_type='online' or s.prefecture='オンライン')=v_online
      and r.created_at>now()-interval '10 minutes';
  v_limit:=case when v_online then 30 else 15 end;
  if p_ip_hash is not null and v_count>=v_limit then
    raise exception '短時間に投稿が集中しています。10分ほど時間をおいてから投稿してください。' using errcode='P0429';
  end if;
  v_rollback:=p_ip_hash is not null and v_count=v_limit-1;
  perform public.salt_boy_submit_inventory(p_store_id,p_client_hash,p_request_id,p_items);
  update public.salt_boy_inventory_reports r set ip_hash=p_ip_hash,
    review_reason=case when r.review_status='pending' then
      case when not v_online and r.quantity>=50 then '50枚以上のため管理者確認'
        when not v_online then '実店舗2店舗以上・5分以内の6回目以降'
        else 'オンライン10分以内の30回目以降' end else null end
    where r.client_hash=p_client_hash and r.request_id=p_request_id;
  if v_rollback then
    update public.salt_boy_inventory_reports r
      set review_status='pending',review_reason='大量連投による自動保留 (直近10分)'
      from public.stores s
      where s.id=r.store_id and r.client_hash=p_client_hash and r.ip_hash=p_ip_hash
        and (s.store_type='online' or s.prefecture='オンライン')=v_online
        and r.created_at>now()-interval '10 minutes' and r.review_status='approved';
  end if;
  insert into public.salt_boy_security_events(event_type,client_hash,store_id,request_id,reason)
    values(case when v_rollback then 'auto_rollback_pending' else 'submitted' end,p_client_hash,p_store_id,p_request_id,
      case when v_rollback then '大量連投到達・直近10分の投稿を保留' else '在庫投稿受付' end);
  return query select r.id,r.product_id from public.salt_boy_inventory_reports r
    where r.client_hash=p_client_hash and r.request_id=p_request_id order by r.id;
end;
$$;
revoke all on function public.salt_boy_submit_inventory_checked(bigint,text,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.salt_boy_submit_inventory_checked(bigint,text,uuid,jsonb,text) to service_role;

create function public.salt_boy_list_admin_reports_v2(p_view text,p_before_id bigint default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_inventory_admin() then raise exception '管理者権限がありません。' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(listed)||jsonb_build_object('review_reason',r.review_reason) order by listed.id desc),'[]')
    from public.salt_boy_list_admin_reports(p_view,p_before_id) listed
    join public.salt_boy_inventory_reports r on r.id=listed.id);
end;
$$;
revoke all on function public.salt_boy_list_admin_reports_v2(text,bigint) from public,anon,authenticated;
grant execute on function public.salt_boy_list_admin_reports_v2(text,bigint) to authenticated;

create or replace function public.salt_boy_manage_inventory_report(p_report_id bigint,p_action text,p_note text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_inventory_admin() then raise exception '管理者権限がありません。' using errcode='42501'; end if;
  case p_action
    when 'approve','reject' then
      update public.salt_boy_inventory_reports set review_status=case when p_action='approve' then 'approved' else 'rejected' end
        where id=p_report_id and review_status='pending' and deleted_at is null;
    when 'delete' then
      update public.salt_boy_inventory_reports set deleted_at=now() where id=p_report_id and deleted_at is null;
    when 'restore' then
      update public.salt_boy_inventory_reports set deleted_at=null,
        review_status=case when review_status='rejected' then 'pending' else review_status end
        where id=p_report_id and (deleted_at is not null or review_status='rejected');
    else raise exception '操作が不正です。';
  end case;
  if not found then raise exception '操作できる状態の在庫投稿が見つかりません。'; end if;
  insert into public.salt_boy_inventory_history(report_id,action,actor_kind,actor_id,note)
    values(p_report_id,p_action,'admin',auth.uid(),nullif(btrim(p_note),''));
end;
$$;

create function public.salt_boy_admin_history(p_report_id bigint default null, p_before_id bigint default null)
returns table(id bigint,report_id bigint,store_name text,product_name text,action text,actor_kind text,note text,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_inventory_admin() then raise exception '管理者権限がありません。' using errcode='42501'; end if;
  return query select h.id,h.report_id,s.name::text,p.name::text,h.action,h.actor_kind,h.note,h.created_at
    from public.salt_boy_inventory_history h join public.salt_boy_inventory_reports r on r.id=h.report_id
    join public.stores s on s.id=r.store_id join public.salt_boy_products p on p.id=r.product_id
    where (p_report_id is null or h.report_id=p_report_id) and (p_before_id is null or h.id<p_before_id)
    order by h.id desc limit 51;
end;
$$;
revoke all on function public.salt_boy_admin_history(bigint,bigint) from public,anon,authenticated;
grant execute on function public.salt_boy_admin_history(bigint,bigint) to authenticated;

-- First-week records must distinguish the same variants as inventory records.
alter table public.salt_boy_first_week_info add column purchase_variant text;
alter table public.salt_boy_first_week_info drop constraint salt_boy_first_week_info_store_id_product_id_key;
alter table public.salt_boy_first_week_info add unique nulls not distinct(store_id,product_id,purchase_variant);
alter table public.salt_boy_first_week_info add check(purchase_variant is null or
  (kind='online_delivery' and purchase_variant in ('special','no_special','bluray_set','bluray_set_special','dvd_set','dvd_set_special')));

create function public.salt_boy_admin_data() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_inventory_admin() then raise exception '管理者権限がありません。' using errcode='42501'; end if;
  return jsonb_build_object(
    'stores',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'online',s.store_type='online' or s.prefecture='オンライン') order by s.id),'[]') from public.stores s where s.is_active),
    'products',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'catalog_number',p.catalog_number) order by p.sort_order),'[]') from public.salt_boy_products p where p.is_active),
    'firstWeek',(select coalesce(jsonb_agg(to_jsonb(f) order by f.store_id,f.product_id),'[]') from public.salt_boy_first_week_info f),
    'security',(select coalesce(jsonb_agg(to_jsonb(e)),'[]') from (select id,event_type,store_id,reason,created_at from public.salt_boy_security_events order by id desc limit 100) e)
  );
end;
$$;
revoke all on function public.salt_boy_admin_data() from public,anon,authenticated;
grant execute on function public.salt_boy_admin_data() to authenticated;

create function public.salt_boy_save_first_week(p_value jsonb, p_delete boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare
  v_store bigint:=(p_value->>'store_id')::bigint;
  v_product bigint:=(p_value->>'product_id')::bigint;
  v_variant text:=nullif(p_value->>'purchase_variant','');
  v_online boolean;
begin
  if not public.is_inventory_admin() then raise exception '管理者権限がありません。' using errcode='42501'; end if;
  select s.store_type='online' or s.prefecture='オンライン' into v_online from public.stores s where s.id=v_store and s.is_active;
  if not found then raise exception '有効な店舗を選択してください。'; end if;
  if (not v_online and (v_product is not null or v_variant is not null)) or
    (v_online and not exists(select 1 from public.salt_boy_products p where p.id=v_product and p.is_active)) then
    raise exception '店舗と商品の組み合わせを確認してください。';
  end if;
  if (v_store in (308,309) and v_variant is null) or
    (v_variant in ('special','no_special') and v_store not in (308,309)) or
    (v_variant in ('bluray_set','dvd_set') and v_store<>309) or
    (v_variant in ('bluray_set_special','dvd_set_special') and v_store not in (309,320,1208)) or
    (v_variant like '%set%' and not exists(select 1 from public.salt_boy_products p where p.id=v_product and p.catalog_number='UPCH-7913')) then
    raise exception '商品の特典区分・セット区分を確認してください。';
  end if;
  if p_delete then
    delete from public.salt_boy_first_week_info f where f.store_id=v_store and f.product_id is not distinct from v_product and f.purchase_variant is not distinct from v_variant;
    return;
  end if;
  if nullif(btrim(p_value->>'evidence'),'') is null then raise exception '確認方法・ソースを入力してください。'; end if;
  insert into public.salt_boy_first_week_info(store_id,product_id,purchase_variant,kind,cutoff_kind,cutoff_date,cutoff_time,estimate_basis,earliest_date,latest_date,note,evidence,verified_at)
    values(v_store,v_product,v_variant,case when v_online then 'online_delivery' else 'store_cutoff' end,
      case when not v_online then p_value->>'cutoff_kind' end,
      case when not v_online then (p_value->>'cutoff_date')::date end,
      case when not v_online and p_value->>'cutoff_kind'='time' then (p_value->>'cutoff_time')::time end,
      case when v_online then p_value->>'estimate_basis' end,
      case when v_online then (p_value->>'earliest_date')::date end,
      case when v_online then (p_value->>'latest_date')::date end,
      nullif(btrim(p_value->>'note'),''),btrim(p_value->>'evidence'),now())
    on conflict (store_id,product_id,purchase_variant) do update set
      cutoff_kind=excluded.cutoff_kind,cutoff_date=excluded.cutoff_date,cutoff_time=excluded.cutoff_time,
      estimate_basis=excluded.estimate_basis,earliest_date=excluded.earliest_date,latest_date=excluded.latest_date,
      note=excluded.note,evidence=excluded.evidence,verified_at=excluded.verified_at;
end;
$$;
revoke all on function public.salt_boy_save_first_week(jsonb,boolean) from public,anon,authenticated;
grant execute on function public.salt_boy_save_first_week(jsonb,boolean) to authenticated;

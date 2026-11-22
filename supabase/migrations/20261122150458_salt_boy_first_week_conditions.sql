alter table public.salt_boy_first_week_settings add column delivery_cutoff_date date;
-- Site criteria agreed for this release; these are not a guarantee of chart inclusion.
update public.salt_boy_first_week_settings set cutoff_date=coalesce(cutoff_date,'2026-11-29'::date),
  delivery_cutoff_date=coalesce(delivery_cutoff_date,'2026-11-30'::date) where id;

alter table public.salt_boy_first_week_info add column closing_time time;
alter table public.salt_boy_first_week_info add column closing_verified_date date;
alter table public.salt_boy_first_week_info add constraint salt_boy_closing_time_check check(
  (closing_time is null and closing_verified_date is null) or
  (kind='store_cutoff' and cutoff_kind='closing' and closing_time is not null and closing_verified_date=cutoff_date));

create table public.salt_boy_retailer_rules (
  store_id bigint not null references public.stores(id),
  basis text not null check(basis in ('shipping','delivery')),
  cutoff_date date not null,
  cutoff_time time,
  whole_day boolean not null default false,
  evidence text not null check(length(btrim(evidence)) between 1 and 1000),
  verified_at timestamptz not null default now(),
  order_cutoff_kind text not null default 'unknown' check(order_cutoff_kind in ('unknown','none','time')),
  order_cutoff_time time,
  business_weekdays integer[] check(business_weekdays <@ array[0,1,2,3,4,5,6] and cardinality(business_weekdays)>0),
  excluded_dates date[],
  calendar_verified_from date,
  calendar_verified_until date,
  primary key(store_id,basis),
  check(not whole_day or cutoff_time is null),
  check((order_cutoff_kind='time')=(order_cutoff_time is not null))
  ,check(calendar_verified_until is null or calendar_verified_from is null or calendar_verified_from<=calendar_verified_until)
);
alter table public.salt_boy_retailer_rules enable row level security;
revoke all on public.salt_boy_retailer_rules from public,anon,authenticated;
grant select,insert,update,delete on public.salt_boy_retailer_rules to service_role;

alter function public.salt_boy_save_first_week(jsonb,boolean) rename to salt_boy_save_first_week_base;
revoke all on function public.salt_boy_save_first_week_base(jsonb,boolean) from public,anon,authenticated;
create function public.salt_boy_save_first_week(p_value jsonb,p_delete boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare
  v_closing time;
  v_date date;
begin
  if not public.is_inventory_admin() then raise exception '管理者権限がありません。' using errcode='42501'; end if;
  if not p_delete and p_value->>'cutoff_kind'='closing' and nullif(p_value->>'closing_time','') is not null then
    v_closing:=(p_value->>'closing_time')::time;
    v_date:=nullif(p_value->>'closing_verified_date','')::date;
    if v_date is null or v_date<>(p_value->>'cutoff_date')::date then raise exception '閉店時刻は初週締切当日の確認日付を入力してください。'; end if;
  end if;
  -- Clear the old closing time inside the same transaction before base upsert,
  -- so changing the cutoff date cannot leave an invalid old confirmation.
  update public.salt_boy_first_week_info f set closing_time=null,closing_verified_date=null
    where f.store_id=(p_value->>'store_id')::bigint and f.product_id is null;
  perform public.salt_boy_save_first_week_base(p_value,p_delete);
  if not p_delete and p_value->>'cutoff_kind'='closing' then
    update public.salt_boy_first_week_info f set closing_time=v_closing,closing_verified_date=v_date
      where f.store_id=(p_value->>'store_id')::bigint and f.product_id is null;
  end if;
end;
$$;
revoke all on function public.salt_boy_save_first_week(jsonb,boolean) from public,anon,authenticated;
grant execute on function public.salt_boy_save_first_week(jsonb,boolean) to authenticated;

create function public.salt_boy_save_retailer_rule(p_value jsonb,p_delete boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare
  v_store bigint;
  v_basis text;
  v_weekdays integer[];
  v_excluded date[];
begin
  if not public.is_inventory_admin() then raise exception '管理者権限がありません。' using errcode='42501'; end if;
  v_store:=(p_value->>'store_id')::bigint; v_basis:=p_value->>'basis';
  if not exists(select 1 from public.stores s where s.id=v_store and s.is_active and (s.store_type='online' or s.prefecture='オンライン')) then
    raise exception '有効なオンラインショップを選択してください。';
  end if;
  if p_delete then delete from public.salt_boy_retailer_rules where store_id=v_store and basis=v_basis; return; end if;
  select array_agg(value::integer) into v_weekdays from jsonb_array_elements_text(coalesce(p_value->'business_weekdays','[]'));
  select array_agg(value::date) into v_excluded from jsonb_array_elements_text(coalesce(p_value->'excluded_dates','[]'));
  insert into public.salt_boy_retailer_rules(store_id,basis,cutoff_date,cutoff_time,whole_day,evidence,verified_at,
    order_cutoff_kind,order_cutoff_time,business_weekdays,excluded_dates,calendar_verified_from,calendar_verified_until)
  values(v_store,v_basis,(p_value->>'cutoff_date')::date,nullif(p_value->>'cutoff_time','')::time,
    coalesce((p_value->>'whole_day')::boolean,false),btrim(p_value->>'evidence'),now(),coalesce(p_value->>'order_cutoff_kind','unknown'),
    nullif(p_value->>'order_cutoff_time','')::time,v_weekdays,v_excluded,nullif(p_value->>'calendar_verified_from','')::date,nullif(p_value->>'calendar_verified_until','')::date)
  on conflict(store_id,basis) do update set cutoff_date=excluded.cutoff_date,cutoff_time=excluded.cutoff_time,
    whole_day=excluded.whole_day,evidence=excluded.evidence,verified_at=excluded.verified_at,
    order_cutoff_kind=excluded.order_cutoff_kind,order_cutoff_time=excluded.order_cutoff_time,
    business_weekdays=excluded.business_weekdays,excluded_dates=excluded.excluded_dates,calendar_verified_from=excluded.calendar_verified_from,calendar_verified_until=excluded.calendar_verified_until;
end;
$$;
revoke all on function public.salt_boy_save_retailer_rule(jsonb,boolean) from public,anon,authenticated;
grant execute on function public.salt_boy_save_retailer_rule(jsonb,boolean) to authenticated;

create or replace function public.salt_boy_admin_data() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_inventory_admin() then raise exception '管理者権限がありません。' using errcode='42501'; end if;
  return jsonb_build_object(
    'stores',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'online',s.store_type='online' or s.prefecture='オンライン') order by s.id),'[]') from public.stores s where s.is_active),
    'products',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'catalog_number',p.catalog_number) order by p.sort_order),'[]') from public.salt_boy_products p where p.is_active),
    'firstWeek',(select coalesce(jsonb_agg(to_jsonb(f) order by f.store_id,f.product_id),'[]') from public.salt_boy_first_week_info f),
    'rules',(select coalesce(jsonb_agg(to_jsonb(r) order by r.store_id,r.basis),'[]') from public.salt_boy_retailer_rules r),
    'settings',(select to_jsonb(s) from public.salt_boy_first_week_settings s where id),
    'security',(select coalesce(jsonb_agg(to_jsonb(e)),'[]') from (select id,event_type,store_id,reason,created_at from public.salt_boy_security_events order by id desc limit 100) e)
  );
end;
$$;

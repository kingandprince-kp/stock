CREATE OR REPLACE FUNCTION public.salt_boy_submit_inventory(p_store_id bigint, p_client_hash text, p_request_id uuid, p_items jsonb)
 RETURNS TABLE(report_id bigint, product_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_online boolean;
  v_previous_count integer;
  v_rapid_posting boolean;
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception '在庫情報は配列で指定してください。';
  end if;
  if jsonb_array_length(p_items) not between 1 and 14 or p_request_id is null
     or p_client_hash is null or p_client_hash !~ '^[a-f0-9]{64}$' then
    raise exception '在庫投稿の入力が不正です。';
  end if;

  select store_type = 'online' or prefecture = 'オンライン' into v_online
  from public.stores where id = p_store_id and is_active;
  if not found then
    raise exception '有効な店舗が見つかりません。';
  end if;
  if not v_online and jsonb_array_length(p_items) > 7 then
    raise exception '実店舗は一度に7形態まで投稿できます。';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(product_id bigint, purchase_variant text, shipping_estimate jsonb)
    left join public.salt_boy_products p on p.id = item.product_id and p.is_active
    where p.id is null or (
      item.purchase_variant is not null and (
        v_online is not true
        or case
          when item.purchase_variant in ('special', 'no_special') then p_store_id not in (308, 309)
          when item.purchase_variant in ('bluray_set_special', 'dvd_set_special')
            then p_store_id not in (309, 320, 1208) or p.catalog_number <> 'UPCH-7913'
          when item.purchase_variant in ('bluray_set', 'dvd_set')
            then p_store_id <> 309 or p.catalog_number <> 'UPCH-7913'
          else true
        end
      )
    )
      or (item.shipping_estimate is not null and (v_online is not true or jsonb_typeof(item.shipping_estimate) <> 'object'))
  ) then
    raise exception '対象外の商品または特典区分です。';
  end if;
  if (
    select count(distinct (item.product_id, item.purchase_variant))
    from jsonb_to_recordset(p_items) as item(product_id bigint, purchase_variant text)
  ) <> jsonb_array_length(p_items) then
    raise exception '同じ商品を複数回指定できません。';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('salt_boy:' || p_client_hash || ':' || p_request_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('salt_boy_review:' || p_client_hash, 0));
  select count(*) into v_previous_count
  from public.salt_boy_inventory_reports r
  where r.client_hash = p_client_hash and r.request_id = p_request_id;

  if v_previous_count = 0 then
    select case when v_online then count(distinct recent.request_id) >= 29
      else count(distinct recent.request_id) >= 5
        and coalesce(bool_or(recent.store_id <> p_store_id), false)
      end
    into v_rapid_posting
    from public.salt_boy_inventory_reports recent
    join public.stores previous_store on previous_store.id = recent.store_id
    where recent.client_hash = p_client_hash
      and (previous_store.store_type = 'online' or previous_store.prefecture = 'オンライン') = v_online
      and recent.created_at > now() - case when v_online then interval '10 minutes' else interval '5 minutes' end;

    insert into public.salt_boy_inventory_reports
      (store_id, product_id, quantity, stock_status, purchase_variant, comment, client_hash, request_id, shipping_estimate, review_status)
    select p_store_id, item.product_id, item.quantity, item.stock_status,
      item.purchase_variant, nullif(btrim(item.comment), ''), p_client_hash, p_request_id, item.shipping_estimate,
      case when item.auto_publish is not true or v_rapid_posting or (not v_online and item.quantity >= 50)
        or exists (
          select 1 from public.salt_boy_inventory_reports recent
          where recent.client_hash = p_client_hash
            and recent.store_id = p_store_id and recent.product_id = item.product_id
            and recent.purchase_variant is not distinct from item.purchase_variant
            and recent.created_at > now() - interval '3 minutes'
        ) then 'pending' else 'approved' end
    from jsonb_to_recordset(p_items) as item(
      product_id bigint, quantity integer, stock_status text, purchase_variant text, comment text, shipping_estimate jsonb, auto_publish boolean
    );
  elsif v_previous_count <> jsonb_array_length(p_items) or exists (
    select 1
    from jsonb_to_recordset(p_items) as item(
      product_id bigint, quantity integer, stock_status text, purchase_variant text, comment text, shipping_estimate jsonb
    )
    where not exists (
      select 1 from public.salt_boy_inventory_reports r
      where r.client_hash = p_client_hash and r.request_id = p_request_id
        and r.store_id = p_store_id and r.product_id = item.product_id
        and r.quantity = item.quantity and r.stock_status = item.stock_status
        and r.purchase_variant is not distinct from item.purchase_variant
        and r.comment is not distinct from nullif(btrim(item.comment), '')
        and r.shipping_estimate is not distinct from item.shipping_estimate
    )
  ) then
    raise exception '同じ投稿IDで異なる内容は送信できません。' using errcode = '23505';
  end if;

  return query
  select r.id, r.product_id
  from public.salt_boy_inventory_reports r
  where r.client_hash = p_client_hash and r.request_id = p_request_id and r.store_id = p_store_id
  order by r.product_id;
end;
$function$;

create or replace function public.salt_boy_list_admin_reports(p_view text, p_before_id bigint default null)
returns table (
  id bigint, store_name text, product_name text, quantity integer, stock_status text,
  comment text, shipping_estimate jsonb, created_at timestamptz, review_status text,
  deleted_at timestamptz, manually_approved boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not public.is_inventory_admin() then
    raise exception '管理者権限がありません。' using errcode = '42501';
  end if;

  return query
  select r.id, s.name::text, case r.purchase_variant
      when 'special' then p.name || ' (限定特典付き)'
      when 'no_special' then p.name || ' (特典なし)'
      when 'bluray_set' then 'Blu-ray 3形態セット (特典なし)'
      when 'bluray_set_special' then 'Blu-ray 3形態セット (特典付き)'
      when 'dvd_set' then 'DVD 3形態セット (特典なし)'
      when 'dvd_set_special' then 'DVD 3形態セット (特典付き)'
      else case when r.store_id in (308, 309) then p.name || ' (特典区分不明)' else p.name::text end
    end, r.quantity, r.stock_status, r.comment,
    r.shipping_estimate, r.created_at, r.review_status, r.deleted_at,
    exists (
      select 1 from public.salt_boy_inventory_history h
      where h.report_id = r.id and h.action = 'approve'
    )
  from public.salt_boy_inventory_reports r
  join public.stores s on s.id = r.store_id
  join public.salt_boy_products p on p.id = r.product_id
  where (p_before_id is null or r.id < p_before_id)
    and case p_view
      when 'pending' then r.review_status = 'pending' and r.deleted_at is null
      when 'published' then r.review_status = 'approved' and r.deleted_at is null
      when 'closed' then r.review_status = 'rejected' or r.deleted_at is not null
      else false
    end
  order by r.id desc
  limit 51;
end;
$function$;

revoke all on function public.salt_boy_list_admin_reports(text, bigint) from public, anon, authenticated;
grant execute on function public.salt_boy_list_admin_reports(text, bigint) to authenticated;

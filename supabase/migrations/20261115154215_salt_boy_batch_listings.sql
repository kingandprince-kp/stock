alter table public.salt_boy_inventory_reports
  drop constraint salt_boy_inventory_request_product_key,
  add constraint salt_boy_inventory_request_listing_key
    unique nulls not distinct (client_hash, request_id, product_id, purchase_variant);

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
          when item.purchase_variant in ('bluray_set', 'bluray_set_special', 'dvd_set', 'dvd_set_special')
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

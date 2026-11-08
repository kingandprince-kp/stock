alter table public.salt_boy_inventory_reports
  add column shipping_estimate jsonb check (jsonb_typeof(shipping_estimate) = 'object');

CREATE OR REPLACE FUNCTION public.salt_boy_submit_inventory(p_store_id bigint, p_client_hash text, p_request_id uuid, p_items jsonb)
 RETURNS TABLE(report_id bigint, product_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_online boolean;
  v_previous_count integer;
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception '在庫情報は配列で指定してください。';
  end if;
  if jsonb_array_length(p_items) not between 1 and 7 or p_request_id is null
     or p_client_hash is null or p_client_hash !~ '^[a-f0-9]{64}$' then
    raise exception '在庫投稿の入力が不正です。';
  end if;

  select store_type = 'online' or prefecture = 'オンライン' into v_online
  from public.stores where id = p_store_id and is_active;
  if not found then
    raise exception '有効な店舗が見つかりません。';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(product_id bigint, purchase_variant text, shipping_estimate jsonb)
    left join public.salt_boy_products p on p.id = item.product_id and p.is_active
    where p.id is null or (item.purchase_variant is not null and not v_online)
      or (item.shipping_estimate is not null and (v_online is not true or jsonb_typeof(item.shipping_estimate) <> 'object'))
  ) then
    raise exception '対象外の商品または特典区分です。';
  end if;
  if (
    select count(distinct item.product_id)
    from jsonb_to_recordset(p_items) as item(product_id bigint)
  ) <> jsonb_array_length(p_items) then
    raise exception '同じ商品を複数回指定できません。';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('salt_boy:' || p_client_hash || ':' || p_request_id::text, 0));
  select count(*) into v_previous_count
  from public.salt_boy_inventory_reports r
  where r.client_hash = p_client_hash and r.request_id = p_request_id;

  if v_previous_count = 0 then
    insert into public.salt_boy_inventory_reports
      (store_id, product_id, quantity, stock_status, purchase_variant, comment, client_hash, request_id, shipping_estimate)
    select p_store_id, item.product_id, item.quantity, item.stock_status,
      item.purchase_variant, nullif(btrim(item.comment), ''), p_client_hash, p_request_id, item.shipping_estimate
    from jsonb_to_recordset(p_items) as item(
      product_id bigint, quantity integer, stock_status text, purchase_variant text, comment text, shipping_estimate jsonb
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

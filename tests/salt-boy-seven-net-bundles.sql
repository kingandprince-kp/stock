-- Seven Net single editions and both bonus bundles must submit atomically.
-- All fixtures, security events, and moderation side effects are rolled back.
begin;
do $test$
declare
  v_client text := md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  v_ip text := md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  v_request uuid := gen_random_uuid();
  v_regular bigint;
  v_items jsonb;
  v_count integer;
begin
  select id into v_regular from public.salt_boy_products where catalog_number='UPCH-7913' and is_active;
  select jsonb_agg(jsonb_build_object('product_id',id,'purchase_variant',null,'quantity',0,'stock_status','in_stock','auto_publish',true) order by sort_order)
    into v_items from public.salt_boy_products where is_active;
  assert jsonb_array_length(v_items)=5,'five single editions required';
  v_items:=v_items||jsonb_build_array(
    jsonb_build_object('product_id',v_regular,'purchase_variant','bluray_set_special','quantity',0,'stock_status','in_stock','auto_publish',true),
    jsonb_build_object('product_id',v_regular,'purchase_variant','dvd_set_special','quantity',0,'stock_status','in_stock','auto_publish',true));
  perform public.salt_boy_submit_inventory_checked(310,v_client,v_request,v_items,v_ip);
  select count(*) into v_count from public.salt_boy_inventory_reports where client_hash=v_client and request_id=v_request and review_status='approved';
  assert v_count=7,'Seven Net singles and bonus bundles must publish together';
  perform public.salt_boy_submit_inventory_checked(310,v_client,v_request,v_items,v_ip);
  select count(*) into v_count from public.salt_boy_inventory_reports where client_hash=v_client;
  assert v_count=7,'retry created duplicate Seven Net reports';
  begin
    perform public.salt_boy_submit_inventory_checked(310,v_client,gen_random_uuid(),v_items,v_ip);
    raise exception 'three-minute limit bypassed';
  exception when sqlstate 'P0429' then null;
  end;
  begin
    perform public.salt_boy_submit_inventory(310,v_client,gen_random_uuid(),jsonb_build_array(
      jsonb_build_object('product_id',v_regular,'purchase_variant','dvd_set','quantity',0,'stock_status','in_stock','auto_publish',true)));
    raise exception 'unsupported bonus-free Seven Net bundle accepted';
  exception when raise_exception then
    if sqlerrm='unsupported bonus-free Seven Net bundle accepted' then raise; end if;
  end;
  begin
    perform public.salt_boy_submit_inventory(307,v_client,gen_random_uuid(),jsonb_build_array(
      jsonb_build_object('product_id',v_regular,'purchase_variant','dvd_set_special','quantity',0,'stock_status','in_stock','auto_publish',true)));
    raise exception 'unsupported shop bundle accepted';
  exception when raise_exception then
    if sqlerrm='unsupported shop bundle accepted' then raise; end if;
  end;
end;
$test$;
rollback;

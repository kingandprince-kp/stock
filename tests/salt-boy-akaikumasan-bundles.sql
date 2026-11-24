-- Verify each newly linked storefront can submit its visible listings.
begin;
do $test$
declare
  v_client text:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  v_ip text:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  v_store bigint;
  v_request uuid;
  v_regular bigint;
  v_singles jsonb;
  v_items jsonb;
  v_count integer;
begin
  select id into v_regular from public.salt_boy_products where catalog_number='UPCH-7913' and is_active;
  select jsonb_agg(jsonb_build_object('product_id',id,'purchase_variant',null,'quantity',0,'stock_status','in_stock','auto_publish',true))
    into v_singles from public.salt_boy_products where is_active;
  assert jsonb_array_length(v_singles)=5;
  foreach v_store in array array[862,864,865]::bigint[] loop
    v_request:=gen_random_uuid();
    v_items:=v_singles||jsonb_build_array(jsonb_build_object('product_id',v_regular,'purchase_variant','bluray_set_special','quantity',0,'stock_status','in_stock','auto_publish',true));
    if v_store=865 then
      v_items:=v_items||jsonb_build_array(jsonb_build_object('product_id',v_regular,'purchase_variant','dvd_set_special','quantity',0,'stock_status','in_stock','auto_publish',true));
    end if;
    perform public.salt_boy_submit_inventory_checked(v_store,v_client,v_request,v_items,v_ip);
    select count(*) into v_count from public.salt_boy_inventory_reports where client_hash=v_client and request_id=v_request and review_status='approved';
    assert v_count=jsonb_array_length(v_items),'visible storefront listings must submit together';
    perform public.salt_boy_submit_inventory_checked(v_store,v_client,v_request,v_items,v_ip);
    select count(*) into v_count from public.salt_boy_inventory_reports where client_hash=v_client and request_id=v_request;
    assert v_count=jsonb_array_length(v_items),'retry must not duplicate rows';
  end loop;
  foreach v_store in array array[862,864]::bigint[] loop
    begin
      perform public.salt_boy_submit_inventory(v_store,v_client,gen_random_uuid(),jsonb_build_array(jsonb_build_object('product_id',v_regular,'purchase_variant','dvd_set_special','quantity',0,'stock_status','in_stock','auto_publish',true)));
      raise exception 'unlisted DVD set accepted';
    exception when raise_exception then
      if sqlerrm='unlisted DVD set accepted' then raise; end if;
    end;
  end loop;
end;
$test$;
rollback;

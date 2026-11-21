-- Run as a database administrator. All fixtures and side effects are rolled back.
begin;
do $test$
declare
  v_client text:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  v_ip text:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  v_request uuid:=gen_random_uuid();
  v_stores bigint[];
  v_products bigint[];
  v_online_stores bigint[];
  v_items jsonb;
  v_report bigint;
  v_count integer;
  v_admin uuid;
  v_result jsonb;
begin
  select array_agg(s.id) into v_stores from (select id from public.stores where is_active and store_type is distinct from 'online' and prefecture<>'オンライン' order by id limit 20) s;
  select array_agg(p.id) into v_products from (select id from public.salt_boy_products where is_active order by sort_order limit 5) p;
  select jsonb_agg(jsonb_build_object('product_id',p,'quantity',1,'stock_status','in_stock','auto_publish',true)) into v_items from unnest(v_products) p;
  assert cardinality(v_products)=5 and cardinality(v_stores)>=16,'test fixtures unavailable';
  perform public.salt_boy_submit_inventory_checked(v_stores[1],v_client,v_request,v_items,v_ip);
  select count(*) into v_count from public.salt_boy_inventory_reports where client_hash=v_client and review_status='approved';
  assert v_count=5,'five editions must publish in one submission';
  perform public.salt_boy_submit_inventory_checked(v_stores[1],v_client,v_request,v_items,v_ip);
  select count(*) into v_count from public.salt_boy_inventory_reports where client_hash=v_client;
  assert v_count=5,'identical retry duplicated reports';
  begin
    perform public.salt_boy_submit_inventory_checked(v_stores[1],v_client,v_request,jsonb_set(v_items,'{0,quantity}','2'),v_ip);
    raise exception 'changed replay accepted';
  exception when unique_violation then null; end;
  begin
    perform public.salt_boy_submit_inventory_checked(v_stores[1],v_client,gen_random_uuid(),v_items,v_ip);
    raise exception 'same item within 3 minutes accepted';
  exception when sqlstate 'P0429' then null; end;
  for i in 2..6 loop
    perform public.salt_boy_submit_inventory_checked(v_stores[i],v_client,gen_random_uuid(),v_items,v_ip);
    select count(*) into v_count from public.salt_boy_inventory_reports where client_hash=v_client and store_id=v_stores[i] and review_status='pending';
    assert v_count=case when i=6 then 5 else 0 end,'physical multi-store threshold must allow five batches';
  end loop;
  for i in 7..15 loop
    perform public.salt_boy_submit_inventory_checked(v_stores[i],v_client,gen_random_uuid(),v_items,v_ip);
  end loop;
  select count(*) into v_count from public.salt_boy_inventory_reports where client_hash=v_client and review_status='pending';
  assert v_count=75,'15th physical batch must roll all 15 batches to pending';
  begin
    perform public.salt_boy_submit_inventory_checked(v_stores[16],v_client,gen_random_uuid(),v_items,v_ip);
    raise exception '16th physical batch not blocked';
  exception when sqlstate 'P0429' then null; end;
  -- A replay still succeeds after the quota is reached.
  perform public.salt_boy_submit_inventory_checked(v_stores[1],v_client,v_request,v_items,v_ip);
  select id into v_report from public.salt_boy_inventory_reports where client_hash=v_client order by id limit 1;
  assert not public.salt_boy_delete_own_inventory_report(v_report,repeat('0',64)),'another owner deleted report';
  assert public.salt_boy_delete_own_inventory_report(v_report,v_client),'owner delete failed';
  assert not public.salt_boy_delete_own_inventory_report(v_report,v_client),'repeat owner delete mutated history';
  assert (select count(*)=1 from public.salt_boy_inventory_history where report_id=v_report and actor_kind='owner'),'owner history missing';
  -- Management functions deny non-admin callers even under SECURITY DEFINER.
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin
    perform public.salt_boy_manage_inventory_report(v_report,'restore');
    raise exception 'non-admin management accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.salt_boy_admin_data(); raise exception 'non-admin metadata accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.salt_boy_admin_history(); raise exception 'non-admin history accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.salt_boy_save_first_week('{}'); raise exception 'non-admin first-week mutation accepted';
  exception when insufficient_privilege then null; end;
  select user_id into v_admin from public.admins limit 1;
  assert v_admin is not null,'admin test identity missing';
  perform set_config('request.jwt.claim.sub',v_admin::text,true);
  perform public.salt_boy_manage_inventory_report(v_report,'restore','owner deletion restored');
  perform public.salt_boy_manage_inventory_report(v_report,'approve','verified in rollback test');
  v_result:=public.salt_boy_list_admin_reports_v2('published');
  assert exists(select 1 from jsonb_array_elements(v_result) r where (r->>'id')::bigint=v_report and (r->>'manually_approved')::boolean),'manual approval label missing';
  assert (select review_status='approved' and deleted_at is null from public.salt_boy_inventory_reports where id=v_report),'approval not visible';
  perform public.salt_boy_manage_inventory_report(v_report,'delete');
  assert (select deleted_at is not null from public.salt_boy_inventory_reports where id=v_report),'delete still visible';
  perform public.salt_boy_manage_inventory_report(v_report,'restore');
  perform public.salt_boy_manage_inventory_report((select id from public.salt_boy_inventory_reports where client_hash=v_client and id<>v_report order by id limit 1),'reject');
  perform public.salt_boy_manage_inventory_report((select id from public.salt_boy_inventory_reports where client_hash=v_client and review_status='rejected' limit 1),'restore');
  assert not exists(select 1 from public.salt_boy_inventory_reports where client_hash=v_client and review_status='rejected'),'rejected report could not return to pending';
  assert (select count(*)>=5 from public.salt_boy_admin_history(v_report)),'management history missing';
  -- First-week input handles closing, explicit time, variants and date ranges.
  perform public.salt_boy_save_first_week(jsonb_build_object('store_id',v_stores[1],'cutoff_kind','closing','cutoff_date','2026-11-29','evidence','transaction test'));
  assert (select cutoff_kind='closing' and cutoff_time is null from public.salt_boy_first_week_info where store_id=v_stores[1] and product_id is null),'closing not stored';
  perform public.salt_boy_save_first_week(jsonb_build_object('store_id',v_stores[1],'cutoff_kind','time','cutoff_date','2026-11-29','cutoff_time','17:00','evidence','transaction test'));
  assert (select cutoff_time='17:00'::time from public.salt_boy_first_week_info where store_id=v_stores[1] and product_id is null),'17:00 not stored';
  perform public.salt_boy_save_first_week(jsonb_build_object('store_id',308,'product_id',v_products[1],'purchase_variant','special','estimate_basis','shipping','earliest_date','2026-11-27','latest_date','2026-11-28','evidence','transaction test'));
  perform public.salt_boy_save_first_week(jsonb_build_object('store_id',308,'product_id',v_products[1],'purchase_variant','no_special','estimate_basis','delivery','earliest_date','2026-11-29','latest_date','2026-11-30','evidence','transaction test'));
  assert (select count(*)=2 from public.salt_boy_first_week_info where store_id=308 and product_id=v_products[1]),'online variants merged';
  perform public.salt_boy_save_first_week(jsonb_build_object('store_id',308,'product_id',v_products[1],'purchase_variant','special'),true);
  assert not exists(select 1 from public.salt_boy_first_week_info where store_id=308 and product_id=v_products[1] and purchase_variant='special'),'first-week withdrawal failed';
  -- Quantity 50 requires a comment and is pending, independently of posting frequency.
  v_client:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  v_items:=jsonb_build_array(jsonb_build_object('product_id',v_products[1],'quantity',50,'stock_status','in_stock','auto_publish',true,'comment','店頭確認'));
  perform public.salt_boy_submit_inventory_checked(v_stores[1],v_client,gen_random_uuid(),v_items,v_ip);
  assert (select review_status='pending' from public.salt_boy_inventory_reports where client_hash=v_client),'50 copies not pending';
  begin
    perform public.salt_boy_submit_inventory_checked(v_stores[2],v_client,gen_random_uuid(),jsonb_build_array(jsonb_build_object('product_id',v_products[1],'quantity',50,'stock_status','in_stock','auto_publish',true)),v_ip);
    raise exception '50 copies without comment accepted';
  exception when check_violation then null; end;
  begin
    perform public.salt_boy_submit_inventory_checked(307,v_client,gen_random_uuid(),v_items,v_ip);
    raise exception 'online quantity accepted';
  exception when raise_exception then
    if sqlerrm='online quantity accepted' then raise; end if;
  end;
  -- Separate browsers sharing one IP: allow five, block sixth for same listing.
  v_ip:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  v_items:=jsonb_build_array(jsonb_build_object('product_id',v_products[1],'quantity',0,'stock_status','in_stock','auto_publish',true));
  for i in 1..5 loop
    v_client:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
    perform public.salt_boy_submit_inventory_checked(307,v_client,gen_random_uuid(),v_items,v_ip);
  end loop;
  begin
    perform public.salt_boy_submit_inventory_checked(307,md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text),gen_random_uuid(),v_items,v_ip);
    raise exception 'sixth same-IP listing accepted';
  exception when sqlstate 'P0429' then null; end;
  -- 30 online submissions, each containing one of five listings at six shops.
  v_client:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  v_ip:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  select array_agg(s.id) into v_online_stores from (
    select id from public.stores where is_active and (store_type='online' or prefecture='オンライン')
      and id not in (308,309) order by id limit 7
  ) s;
  assert cardinality(v_online_stores)=7,'online test fixtures unavailable';
  for i in 1..6 loop
    for j in 1..5 loop
      v_items:=jsonb_build_array(jsonb_build_object('product_id',v_products[j],'quantity',0,'stock_status','in_stock','auto_publish',true));
      perform public.salt_boy_submit_inventory_checked(v_online_stores[i],v_client,gen_random_uuid(),v_items,v_ip);
    end loop;
  end loop;
  assert (select count(*)=30 from public.salt_boy_inventory_reports where client_hash=v_client and review_status='pending'),'30th online request did not roll all online requests to pending';
  begin
    perform public.salt_boy_submit_inventory_checked(v_online_stores[7],v_client,gen_random_uuid(),v_items,v_ip);
    raise exception '31st online request accepted';
  exception when sqlstate 'P0429' then null; end;
  assert not has_function_privilege('anon','public.salt_boy_submit_inventory_checked(bigint,text,uuid,jsonb,text)','EXECUTE'),'anon can bypass Turnstile';
  assert not has_function_privilege('authenticated','public.salt_boy_delete_own_inventory_report(bigint,text)','EXECUTE'),'public can call owner-delete DB function';
end;
$test$;
rollback;
select 'SALT BOY moderation, ownership, approval, history, first-week and permissions: PASS (fixtures rolled back)' as result;

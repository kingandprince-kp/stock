-- IP audit, immutable retry, admin isolation and retention. All fixtures roll back.
begin;
do $test$
declare
  v_client text:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  v_ip_hash text:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  v_request uuid:=gen_random_uuid();
  v_product bigint;
  v_report bigint;
  v_items jsonb;
  v_admin uuid;
  v_admin_rows jsonb;
  v_security jsonb;
begin
  assert not has_table_privilege('anon','public.salt_boy_inventory_reports','SELECT'),'public raw-IP table exposed';
  assert not has_table_privilege('authenticated','public.salt_boy_security_events','SELECT'),'security events exposed';
  assert not has_function_privilege('anon','public.salt_boy_submit_inventory_with_ip(bigint,text,uuid,jsonb,text,inet)','EXECUTE'),'public submission RPC exposed';
  assert not has_function_privilege('authenticated','public.salt_boy_cleanup_security_ips()','EXECUTE'),'cleanup RPC exposed';
  select id into v_product from public.salt_boy_products where is_active order by sort_order limit 1;
  v_items:=jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',0,'stock_status','in_stock','auto_publish',true));
  perform public.salt_boy_submit_inventory_with_ip(307,v_client,v_request,v_items,v_ip_hash,'203.0.113.7'::inet);
  select id into v_report from public.salt_boy_inventory_reports where client_hash=v_client and request_id=v_request;
  assert exists(select 1 from public.salt_boy_inventory_reports where id=v_report and ip_address='203.0.113.7'::inet and ip_hash=v_ip_hash and review_status='approved'),'IP report audit missing';
  assert exists(select 1 from public.salt_boy_security_events where client_hash=v_client and request_id=v_request and ip_address='203.0.113.7'::inet and ip_hash=v_ip_hash),'security IP audit missing';
  perform public.salt_boy_submit_inventory_with_ip(307,v_client,v_request,v_items,repeat('b',64),'2001:db8::9'::inet);
  assert (select count(*) from public.salt_boy_inventory_reports where client_hash=v_client)=1,'retry duplicated report';
  assert exists(select 1 from public.salt_boy_inventory_reports where id=v_report and ip_address='203.0.113.7'::inet and ip_hash=v_ip_hash),'retry overwrote original IP';
  assert exists(select 1 from public.salt_boy_security_events where client_hash=v_client and request_id=v_request and ip_address='203.0.113.7'::inet),'retry overwrote security IP';
  begin
    perform public.salt_boy_submit_inventory_with_ip(307,v_client,gen_random_uuid(),v_items,v_ip_hash,'203.0.113.7'::inet);
    raise exception 'three-minute limit bypassed';
  exception when sqlstate 'P0429' then null;
  end;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin
    perform public.salt_boy_list_admin_reports_v2('published');
    raise exception 'nonadmin reports allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.salt_boy_admin_data();
    raise exception 'nonadmin security allowed';
  exception when insufficient_privilege then null;
  end;
  select user_id into v_admin from public.admins limit 1;
  assert v_admin is not null;
  perform set_config('request.jwt.claim.sub',v_admin::text,true);
  v_admin_rows:=public.salt_boy_list_admin_reports_v2('published');
  assert exists(select 1 from jsonb_array_elements(v_admin_rows) row where (row->>'id')::bigint=v_report and row->>'ip_address'='203.0.113.7' and row->>'ip_hash'=v_ip_hash),'admin report IP missing';
  v_security:=public.salt_boy_admin_data()->'security';
  assert exists(select 1 from jsonb_array_elements(v_security) row where row->>'request_id'=v_request::text and row->>'ip_address'='203.0.113.7' and row->>'ip_hash'=v_ip_hash),'admin security IP missing';
  update public.salt_boy_inventory_reports set created_at=now()-interval '181 days' where id=v_report;
  update public.salt_boy_security_events set created_at=now()-interval '181 days' where client_hash=v_client and request_id=v_request;
  perform public.salt_boy_cleanup_security_ips();
  assert exists(select 1 from public.salt_boy_inventory_reports where id=v_report and ip_address is null and ip_hash=v_ip_hash),'retention did not remove raw IP only';
  assert exists(select 1 from public.salt_boy_security_events where client_hash=v_client and request_id=v_request and ip_address is null and ip_hash=v_ip_hash),'event retention failed';
  assert exists(select 1 from cron.job where jobname='salt-boy-security-ip-cleanup' and active and schedule='15 18 * * *'),'SALT cleanup not scheduled';
  assert exists(select 1 from cron.job where command='select public.cleanup_inventory_security_ips();' and active and schedule='15 18 * * *'),'So Honey cleanup changed';
end;
$test$;
rollback;

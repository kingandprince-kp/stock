begin;
do $test$
declare
  v_store bigint;
  v_admin uuid;
  v_value jsonb;
  v_data jsonb;
begin
  select id into v_store from public.stores where is_active and store_type is distinct from 'online' and prefecture<>'オンライン' order by id limit 1;
  select user_id into v_admin from public.admins limit 1;
  perform set_config('request.jwt.claim.sub',v_admin::text,true);
  v_value:=jsonb_build_object('store_id',v_store,'cutoff_kind','closing','cutoff_date','2026-11-29',
    'closing_time','20:00','closing_verified_date','2026-11-29','evidence','salt-first-week-rollback-test');
  perform public.salt_boy_save_first_week(v_value);
  assert (select closing_time='20:00'::time and closing_verified_date=cutoff_date from public.salt_boy_first_week_info where store_id=v_store and product_id is null),'confirmed closing time lost';
  begin
    perform public.salt_boy_save_first_week(v_value||jsonb_build_object('closing_verified_date','2026-11-28'));
    raise exception 'wrong closing date accepted';
  exception when raise_exception then if sqlerrm='wrong closing date accepted' then raise; end if; end;
  perform public.salt_boy_save_first_week(v_value||jsonb_build_object('cutoff_kind','time','cutoff_time','17:00'));
  assert (select closing_time is null and closing_verified_date is null and cutoff_time='17:00'::time from public.salt_boy_first_week_info where store_id=v_store and product_id is null),'switching to explicit time retained closing data';
  perform public.salt_boy_save_first_week(v_value||jsonb_build_object('cutoff_date','2026-11-30','closing_verified_date','2026-11-30'));
  assert (select cutoff_date='2026-11-30'::date and closing_verified_date=cutoff_date from public.salt_boy_first_week_info where store_id=v_store and product_id is null),'changing closing date failed';
  v_value:=jsonb_build_object('store_id',307,'basis','shipping','cutoff_date','2026-11-29','cutoff_time','17:00','whole_day',false,
    'evidence','salt-first-week-rollback-test','order_cutoff_kind','time','order_cutoff_time','13:00',
    'business_weekdays',jsonb_build_array(1,2,3,4,5),'excluded_dates',jsonb_build_array('2026-11-23'),
    'calendar_verified_from','2026-11-20','calendar_verified_until','2026-11-30');
  perform public.salt_boy_save_retailer_rule(v_value);
  assert (select cutoff_time='17:00'::time and 1=any(business_weekdays) and excluded_dates=array['2026-11-23'::date] from public.salt_boy_retailer_rules where store_id=307 and basis='shipping'),'retailer rule not stored';
  perform public.salt_boy_save_retailer_rule(v_value||jsonb_build_object('basis','delivery','cutoff_date','2026-11-30','whole_day',true,'cutoff_time',null));
  assert (select count(*)=2 from public.salt_boy_retailer_rules where store_id=307),'shipping and delivery rules merged';
  v_data:=public.salt_boy_admin_data();
  assert jsonb_array_length(v_data->'rules')>=2,'admin rule list missing';
  assert v_data->'settings'->>'delivery_cutoff_date'='2026-11-30','Monday arrival criterion missing';
  begin
    perform public.salt_boy_save_retailer_rule(v_value||jsonb_build_object('business_weekdays',jsonb_build_array(7)));
    raise exception 'invalid business weekday accepted';
  exception when check_violation then null; end;
  begin
    perform public.salt_boy_save_retailer_rule(v_value||jsonb_build_object('evidence',''));
    raise exception 'empty source accepted';
  exception when check_violation then null; end;
  perform public.salt_boy_save_retailer_rule(v_value,true);
  assert not exists(select 1 from public.salt_boy_retailer_rules where store_id=307 and basis='shipping'),'withdrawal failed';
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin
    perform public.salt_boy_save_retailer_rule(v_value);raise exception 'nonadmin rule write accepted';
  exception when insufficient_privilege then null;end;
  assert not has_function_privilege('authenticated','public.salt_boy_save_first_week_base(jsonb,boolean)','EXECUTE'),'base function bypass exposed';
  assert not has_table_privilege('anon','public.salt_boy_retailer_rules','SELECT'),'anonymous direct rule access exposed';
end;
$test$;
rollback;
select 'first-week rules, closing-time transitions, independent bases, metadata and permissions: PASS (rolled back)' as result;

begin; do $$declare v_admin uuid;v_old text;begin
select md5(coalesce(jsonb_agg(to_jsonb(d) order by sales_date)::text,'')) into v_old from public.sales_daily d;
select user_id into v_admin from public.admins limit 1;perform set_config('request.jwt.claim.sub',v_admin::text,true);
update public.salt_boy_sales_tracking_config set goal=null where id;
perform public.salt_boy_upsert_sales_day_admin('2026-11-24',55952,null);
assert exists(select 1 from public.salt_boy_sales_daily where sales_date='2026-11-24' and sales=55952);
assert (select goal is null from public.salt_boy_sales_tracking_config where id);
perform public.salt_boy_upsert_sales_day_admin('2026-11-24',55952,100000);
perform public.salt_boy_upsert_sales_day_admin('2026-11-24',55952,null);
assert (select goal=100000 from public.salt_boy_sales_tracking_config where id);
assert v_old=(select md5(coalesce(jsonb_agg(to_jsonb(d) order by sales_date)::text,'')) from public.sales_daily d);
end$$; rollback;
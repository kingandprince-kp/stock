-- SALT BOY mirrors So Honey IP auditing without changing its moderation rules.
alter table public.salt_boy_inventory_reports add column ip_address inet;
alter table public.salt_boy_security_events add column ip_address inet;
alter table public.salt_boy_security_events add column ip_hash text;

create function public.salt_boy_submit_inventory_with_ip(
  p_store_id bigint, p_client_hash text, p_request_id uuid, p_items jsonb, p_ip_hash text, p_ip_address inet
) returns table(report_id bigint, product_id bigint)
language plpgsql security definer set search_path='' as $$
declare v_existing boolean;
begin
  -- Use the same request lock before checking for replay; first-request IP is immutable.
  perform pg_advisory_xact_lock(hashtextextended('salt_boy:'||p_client_hash||':'||p_request_id::text,0));
  select exists(select 1 from public.salt_boy_inventory_reports r
    where r.client_hash=p_client_hash and r.request_id=p_request_id) into v_existing;
  perform public.salt_boy_submit_inventory_checked(p_store_id,p_client_hash,p_request_id,p_items,p_ip_hash);
  if not v_existing then
    update public.salt_boy_inventory_reports r set ip_address=p_ip_address
      where r.client_hash=p_client_hash and r.request_id=p_request_id and r.store_id=p_store_id;
    update public.salt_boy_security_events e set ip_address=p_ip_address,ip_hash=p_ip_hash
      where e.client_hash=p_client_hash and e.request_id=p_request_id and e.store_id=p_store_id
        and e.event_type in ('submitted','auto_rollback_pending');
  end if;
  return query select r.id,r.product_id from public.salt_boy_inventory_reports r
    where r.client_hash=p_client_hash and r.request_id=p_request_id and r.store_id=p_store_id order by r.id;
end;
$$;
revoke all on function public.salt_boy_submit_inventory_with_ip(bigint,text,uuid,jsonb,text,inet) from public,anon,authenticated;
grant execute on function public.salt_boy_submit_inventory_with_ip(bigint,text,uuid,jsonb,text,inet) to service_role;

create function public.salt_boy_cleanup_security_ips() returns integer
language plpgsql security definer set search_path='' as $$
declare v_reports integer; v_events integer;
begin
  update public.salt_boy_inventory_reports set ip_address=null where ip_address is not null and created_at<now()-interval '180 days';
  get diagnostics v_reports=row_count;
  update public.salt_boy_security_events set ip_address=null where ip_address is not null and created_at<now()-interval '180 days';
  get diagnostics v_events=row_count;
  return v_reports+v_events;
end;
$$;
revoke all on function public.salt_boy_cleanup_security_ips() from public,anon,authenticated;
grant execute on function public.salt_boy_cleanup_security_ips() to service_role;
select cron.schedule('salt-boy-security-ip-cleanup','15 18 * * *','select public.salt_boy_cleanup_security_ips();');

CREATE OR REPLACE FUNCTION public.salt_boy_admin_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_inventory_admin() then raise exception '管理者権限がありません。' using errcode='42501'; end if;
  return jsonb_build_object(
    'stores',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'online',s.store_type='online' or s.prefecture='オンライン') order by s.id),'[]') from public.stores s where s.is_active),
    'products',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'catalog_number',p.catalog_number) order by p.sort_order),'[]') from public.salt_boy_products p where p.is_active),
    'firstWeek',(select coalesce(jsonb_agg(to_jsonb(f) order by f.store_id,f.product_id),'[]') from public.salt_boy_first_week_info f),
    'rules',(select coalesce(jsonb_agg(to_jsonb(r) order by r.store_id,r.basis),'[]') from public.salt_boy_retailer_rules r),
    'settings',(select to_jsonb(s) from public.salt_boy_first_week_settings s where id),
    'security',(select coalesce(jsonb_agg(to_jsonb(e)),'[]') from (select e.id,e.event_type,e.store_id,e.reason,e.created_at,e.ip_address,
        coalesce(e.ip_hash,(select r.ip_hash from public.salt_boy_inventory_reports r
          where r.client_hash=e.client_hash and r.request_id=e.request_id and r.store_id=e.store_id limit 1)) as ip_hash,
        e.client_hash,e.request_id from public.salt_boy_security_events e order by e.id desc limit 100) e)
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.salt_boy_list_admin_reports_v2(p_view text, p_before_id bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_inventory_admin() then raise exception '管理者権限がありません。' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(listed)||jsonb_build_object('review_reason',r.review_reason,'ip_address',r.ip_address,'ip_hash',r.ip_hash,'client_hash',r.client_hash,'request_id',r.request_id,'store_id',r.store_id) order by listed.id desc),'[]')
    from public.salt_boy_list_admin_reports(p_view,p_before_id) listed
    join public.salt_boy_inventory_reports r on r.id=listed.id);
end;
$function$
;

notify pgrst, 'reload schema';

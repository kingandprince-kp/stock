-- Run as database administrator. Every fixture is rolled back.
begin;
do $test$
declare
  v_id bigint;
  v_store bigint;
  v_client text := gen_random_uuid()::text;
  v_other text := gen_random_uuid()::text;
  v_rate text := gen_random_uuid()::text;
  v_admin uuid;
  v_old text;
begin
  select md5(coalesce(jsonb_agg(to_jsonb(c) order by id)::text,'')) into v_old from public.store_comments c;
  select id into v_store from public.stores order by id limit 1;
  assert not has_table_privilege('anon','public.salt_boy_store_comments','SELECT'),'direct comment read exposed';
  assert not has_table_privilege('authenticated','public.salt_boy_store_comments','INSERT'),'direct comment write exposed';
  assert not has_function_privilege('anon','public.salt_boy_set_store_comment_deleted_admin(bigint,boolean)','EXECUTE'),'anonymous admin RPC exposed';
  v_id := public.salt_boy_submit_store_comment(v_store,'isolation test',v_client);
  assert exists(select 1 from public.salt_boy_get_store_comments(v_store,20,v_client) where id=v_id and is_own),'own comment missing';
  assert exists(select 1 from public.salt_boy_get_store_comment_counts() where store_id=v_store and comment_count>=1),'comment count missing';
  assert not exists(select 1 from public.get_store_comments(v_store,20,v_client) where body='isolation test'),'SALT comment leaked to So Honey';
  begin
    perform public.salt_boy_submit_store_comment(v_store,'duplicate',v_client);
    raise exception 'two-minute limit bypassed';
  exception when raise_exception then
    if sqlerrm='two-minute limit bypassed' then raise; end if;
  end;
  begin
    perform public.salt_boy_submit_store_comment(v_store,'https://example.com',v_other);
    raise exception 'URL validation bypassed';
  exception when raise_exception then
    if sqlerrm='URL validation bypassed' then raise; end if;
  end;
  insert into public.salt_boy_store_comments(store_id,body,client_hash,created_at)
    select v_store,'rate fixture',md5(v_rate),now()-interval '3 minutes' from generate_series(1,20);
  begin
    perform public.salt_boy_submit_store_comment(v_store,'hourly limit',v_rate);
    raise exception 'hourly limit bypassed';
  exception when raise_exception then
    if sqlerrm='hourly limit bypassed' then raise; end if;
  end;
  perform public.salt_boy_toggle_store_comment_applause(v_id,v_other);
  assert exists(select 1 from public.salt_boy_get_store_comments(v_store,20,v_other) where id=v_id and applause_count=1 and applauded_by_me),'applause missing';
  perform public.salt_boy_toggle_store_comment_applause(v_id,v_other);
  assert not exists(select 1 from public.salt_boy_store_comment_applause where comment_id=v_id),'applause not toggled off';
  begin
    perform public.salt_boy_delete_own_store_comment(v_id,v_other);
    raise exception 'wrong owner allowed';
  exception when raise_exception then
    if sqlerrm='wrong owner allowed' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  assert not exists(select 1 from public.salt_boy_get_store_comments_admin()),'nonadmin read allowed';
  begin
    perform public.salt_boy_set_store_comment_deleted_admin(v_id,true);
    raise exception 'nonadmin update allowed';
  exception when raise_exception then
    if sqlerrm='nonadmin update allowed' then raise; end if;
  end;
  select user_id into v_admin from public.admins limit 1;
  assert v_admin is not null,'admin identity missing';
  perform set_config('request.jwt.claim.sub',v_admin::text,true);
  assert exists(select 1 from public.salt_boy_get_store_comments_admin() where id=v_id),'admin comment missing';
  assert not exists(select 1 from public.salt_boy_get_store_comments_admin() where body in(select body from public.store_comments)),'So Honey comments leaked to SALT admin';
  perform public.salt_boy_set_store_comment_deleted_admin(v_id,true);
  assert not exists(select 1 from public.salt_boy_get_store_comments(v_store,20,v_client) where id=v_id),'admin hide failed';
  perform public.salt_boy_set_store_comment_deleted_admin(v_id,false);
  perform public.salt_boy_delete_own_store_comment(v_id,v_client);
  assert exists(select 1 from public.salt_boy_store_comments where id=v_id and is_deleted and deleted_source='self'),'own delete failed';
  assert v_old=(select md5(coalesce(jsonb_agg(to_jsonb(c) order by id)::text,'')) from public.store_comments c),'So Honey archive changed';
end;
$test$;
rollback;

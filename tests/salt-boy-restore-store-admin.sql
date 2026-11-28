begin;
do $$
declare
  v_admin uuid;
  v_source text;
  v_id bigint;
  v_store bigint;
  v_before text;
  v_after text;
  v_comment jsonb;
  v_message text;
begin
  if has_function_privilege('anon','public.salt_boy_restore_store_admin(text,bigint,text)','EXECUTE') then raise exception 'TEST_FAILED_anon_restore'; end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
  begin
    perform public.salt_boy_restore_store_admin('store_comment',54,'権限検証');
    raise exception 'TEST_FAILED_non_admin';
  exception when others then
    get stacked diagnostics v_message=message_text;
    if v_message <> '管理者権限がありません。' then raise; end if;
  end;
  select user_id into v_admin from public.admins limit 1;
  if v_admin is null then raise exception 'TEST_FAILED_admin_unavailable'; end if;
  perform set_config('request.jwt.claim.sub',v_admin::text,true);
  select to_jsonb(c) into v_comment from public.salt_boy_store_comments c where id=54;
  foreach v_source in array array['store_info','store_comment'] loop
    v_id := case when v_source='store_info' then 55 else 54 end;
    v_store := case when v_source='store_info' then 350 else 214 end;
    update public.stores set is_active=false,cd_handling_note='既存の非表示メモ' where id=v_store;
    select cd_handling_note into v_before from public.stores where id=v_store;
    begin
      perform public.salt_boy_restore_store_admin(v_source,v_id,' ');
      raise exception 'TEST_FAILED_blank_reason';
    exception when others then
      get stacked diagnostics v_message=message_text;
      if v_message <> '再表示する理由を1〜1,000文字で入力してください。' then raise; end if;
    end;
    perform public.salt_boy_restore_store_admin(v_source,v_id,'取扱状況を再確認したため再表示');
    if not exists (select 1 from public.stores where id=v_store and is_active and strpos(cd_handling_note,v_before)=1
      and cd_handling_note like '%取扱状況を再確認したため再表示%' and cd_handling_source like '%店舗再表示%') then
      raise exception 'TEST_FAILED_restore_state_or_memo';
    end if;
    select cd_handling_note into v_after from public.stores where id=v_store;
    perform public.salt_boy_restore_store_admin(v_source,v_id,'取扱状況を再確認したため再表示');
    if (select cd_handling_note from public.stores where id=v_store) is distinct from v_after then raise exception 'TEST_FAILED_duplicate_restore'; end if;
    perform public.salt_boy_hide_store_admin(v_source,v_id,'再確認により再び非表示');
    if not exists (select 1 from public.stores where id=v_store and not is_active and strpos(cd_handling_note,v_after)=1
      and cd_handling_note like '%再確認により再び非表示%') then raise exception 'TEST_FAILED_hide_after_restore'; end if;
    if not exists (select 1 from public.store_change_history where store_id=v_store and changed_by=v_admin
      and new_data->>'is_active'='true' and new_data->>'cd_handling_note' like '%取扱状況を再確認したため再表示%') then
      raise exception 'TEST_FAILED_restore_history';
    end if;
  end loop;
  if (select to_jsonb(c) from public.salt_boy_store_comments c where id=54) is distinct from v_comment then raise exception 'TEST_FAILED_comment_changed'; end if;
  begin
    perform public.salt_boy_restore_store_admin('store_comment',-1,'検証');
    raise exception 'TEST_FAILED_missing_source';
  exception when others then
    get stacked diagnostics v_message=message_text;
    if v_message <> '対象のSALT BOYの投稿が見つかりません。' then raise; end if;
  end;
end;
$$;
rollback;

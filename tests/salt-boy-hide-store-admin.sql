begin;
do $$
declare
  v_admin uuid;
  v_before_comment jsonb;
  v_existing text;
  v_once text;
  v_message text;
begin
  if has_function_privilege('anon','public.salt_boy_hide_store_admin(text,bigint,text)','EXECUTE') then
    raise exception 'TEST_FAILED_anon_execute';
  end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
  begin
    perform public.salt_boy_hide_store_admin('store_info',55,'権限検証');
    raise exception 'TEST_FAILED_non_admin';
  exception when others then
    get stacked diagnostics v_message=message_text;
    if v_message <> '管理者権限がありません。' then raise; end if;
  end;
  select user_id into v_admin from public.admins limit 1;
  if v_admin is null then raise exception 'TEST_FAILED_admin_fixture_unavailable'; end if;
  perform set_config('request.jwt.claim.sub',v_admin::text,true);
  begin
    perform public.salt_boy_hide_store_admin('store_info',55,' ');
    raise exception 'TEST_FAILED_blank_memo';
  exception when others then
    get stacked diagnostics v_message=message_text;
    if v_message <> '非表示にする理由を1〜1,000文字で入力してください。' then raise; end if;
  end;
  begin
    perform public.salt_boy_hide_store_admin('invalid',55,'検証');
    raise exception 'TEST_FAILED_invalid_source';
  exception when others then
    get stacked diagnostics v_message=message_text;
    if v_message <> '非表示の根拠となる投稿の種類が不正です。' then raise; end if;
  end;
  update public.stores set is_active=true,cd_handling_note='既存メモ検証' where id in (350,214);
  update public.store_info_requests set status='pending' where id=55;
  select cd_handling_note into v_existing from public.stores where id=350;
  perform public.salt_boy_hide_store_admin('store_info',55,'閉店の報告に基づき掲載停止');
  if not exists (select 1 from public.stores where id=350 and not is_active
    and cd_handling_note like '%閉店の報告に基づき掲載停止%'
    and cd_handling_note like '%西武渋谷店自体が閉店しました。%'
    and cd_handling_note like '%2026/9/30デパート閉店です。%'
    and (v_existing is null or strpos(cd_handling_note,v_existing)=1)) then
    raise exception 'TEST_FAILED_store_info_memo';
  end if;
  if not exists (select 1 from public.store_info_requests where id=55 and status='approved') then
    raise exception 'TEST_FAILED_process_info';
  end if;
  select cd_handling_note into v_once from public.stores where id=350;
  perform public.salt_boy_hide_store_admin('store_info',55,'閉店の報告に基づき掲載停止');
  if (select cd_handling_note from public.stores where id=350) is distinct from v_once then
    raise exception 'TEST_FAILED_retry_duplicate_memo';
  end if;
  select to_jsonb(c) into v_before_comment from public.salt_boy_store_comments c where id=54;
  perform public.salt_boy_hide_store_admin('store_comment',54,'取扱無しの店舗コメントに基づき掲載停止');
  if not exists (select 1 from public.stores where id=214 and not is_active
    and cd_handling_note like '%取扱無しの店舗コメントに基づき掲載停止%'
    and cd_handling_note like '%店舗コメント #54%'
    and cd_handling_note like '%投稿内容: 取扱無し%') then
    raise exception 'TEST_FAILED_comment_memo';
  end if;
  if (select to_jsonb(c) from public.salt_boy_store_comments c where id=54) is distinct from v_before_comment then
    raise exception 'TEST_FAILED_original_comment_changed';
  end if;
  if not exists (select 1 from public.store_change_history where store_id=214
    and changed_by=v_admin and new_data->>'is_active'='false'
    and new_data->>'cd_handling_note' like '%店舗コメント #54%') then
    raise exception 'TEST_FAILED_missing_history';
  end if;
  update public.store_info_requests set detail='[SO HONEY] 別作品の情報' where id=55;
  begin
    perform public.salt_boy_hide_store_admin('store_info',55,'検証');
    raise exception 'TEST_FAILED_other_campaign_accepted';
  exception when others then
    get stacked diagnostics v_message=message_text;
    if v_message <> '対象のSALT BOYの投稿が見つかりません。' then raise; end if;
  end;
end;
$$;
rollback;

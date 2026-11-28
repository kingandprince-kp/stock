create or replace function public.salt_boy_restore_store_admin(
  p_source_type text, p_source_id bigint, p_note text
) returns bigint
language plpgsql security definer
set search_path = public
as $$
declare
  v_store_id bigint;
  v_detail text;
  v_evidence text;
  v_posted timestamptz;
  v_marker text;
  v_note text := btrim(coalesce(p_note,''));
  v_active boolean;
  v_entry text;
begin
  if not public.is_inventory_admin() then raise exception '管理者権限がありません。'; end if;
  if v_note = '' or length(v_note) > 1000 then raise exception '再表示する理由を1〜1,000文字で入力してください。'; end if;
  if p_source_type = 'store_info' then
    select store_id,detail,evidence,requested_at into v_store_id,v_detail,v_evidence,v_posted
    from public.store_info_requests
    where id=p_source_id and request_type='other' and detail like '[SALT BOY%'
      and status in ('pending','approved') for update;
    v_marker := '[SALT BOY 店舗再表示 / 店舗情報提供 #'||p_source_id||']';
  elsif p_source_type = 'store_comment' then
    select store_id,body,null,created_at into v_store_id,v_detail,v_evidence,v_posted
    from public.salt_boy_store_comments where id=p_source_id for update;
    v_marker := '[SALT BOY 店舗再表示 / 店舗コメント #'||p_source_id||']';
  else
    raise exception '再表示の根拠となる投稿の種類が不正です。';
  end if;
  if v_store_id is null then raise exception '対象のSALT BOYの投稿が見つかりません。'; end if;
  select is_active into v_active from public.stores where id=v_store_id for update;
  if not found then raise exception '店舗が見つかりません。'; end if;
  if v_active then return v_store_id; end if;
  v_entry := v_marker||chr(10)||'再表示日時: '||to_char(now() at time zone 'Asia/Tokyo','YYYY/MM/DD HH24:MI')||
    ' JST'||chr(10)||'管理メモ: '||v_note||chr(10)||'投稿内容: '||coalesce(v_detail,'')||
    chr(10)||'投稿日時: '||to_char(v_posted at time zone 'Asia/Tokyo','YYYY/MM/DD HH24:MI')||' JST'||
    case when nullif(btrim(v_evidence),'') is not null then chr(10)||'確認方法・ソース: '||v_evidence else '' end;
  update public.stores set is_active=true,
    cd_handling_note=concat_ws(chr(10)||chr(10),nullif(cd_handling_note,''),v_entry),
    cd_handling_source=concat_ws(chr(10),nullif(cd_handling_source,''),v_marker),
    store_info_updated_at=now()
  where id=v_store_id;
  return v_store_id;
end;
$$;
revoke all on function public.salt_boy_restore_store_admin(text,bigint,text) from public,anon;
grant execute on function public.salt_boy_restore_store_admin(text,bigint,text) to authenticated;

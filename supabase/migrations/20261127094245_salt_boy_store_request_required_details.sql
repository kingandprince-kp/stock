create or replace function public.salt_boy_submit_store_request(
  p_prefecture text, p_city text, p_name text, p_chain_name text,
  p_phone text, p_note text, p_client_id text
) returns bigint
language plpgsql security invoker
set search_path = public, extensions
as $$
declare
  v_phone text := normalize(btrim(coalesce(p_phone, '')), NFKC);
  v_note text := btrim(coalesce(p_note, ''));
  v_comment text := '[SALT BOY]';
begin
  if p_prefecture is distinct from 'オンライン' then
    if nullif(btrim(p_city), '') is null then
      raise exception '市区町村を入力してください。';
    end if;
    if v_phone !~ '^[0-9()[:space:]-]+$'
       or regexp_replace(v_phone, '[^0-9]', '', 'g') !~ '^0[0-9]{9,10}$'
       or length(v_phone) > 30 then
      raise exception '店舗の電話番号を市外局番から入力してください。';
    end if;
    v_comment := v_comment || E'\n店舗電話番号: ' || v_phone;
  end if;
  if length(v_note) > 400 then
    raise exception '補足は400文字以内で入力してください。';
  end if;
  if v_note <> '' then
    v_comment := v_comment || E'\n' || v_note;
  end if;
  return public.submit_store_request(
    p_prefecture, p_city, p_name, p_chain_name, v_comment, p_client_id
  );
end;
$$;
revoke all on function public.salt_boy_submit_store_request(text,text,text,text,text,text,text) from public;
grant execute on function public.salt_boy_submit_store_request(text,text,text,text,text,text,text) to anon, authenticated, service_role;

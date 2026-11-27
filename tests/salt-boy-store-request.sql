begin;
set local role anon;
do $$
declare v_message text;
begin
  begin
    perform public.salt_boy_submit_store_request('埼玉県','','__salt_required_test__',null,'048-123-4567',null,'salt-required-test-20261127');
    raise exception 'TEST_FAILED_missing_city';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> '市区町村を入力してください。' then raise; end if;
  end;
  begin
    perform public.salt_boy_submit_store_request('埼玉県','さいたま市','__salt_required_test__',null,'',null,'salt-required-test-20261127');
    raise exception 'TEST_FAILED_missing_phone';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> '店舗の電話番号を市外局番から入力してください。' then raise; end if;
  end;
  begin
    perform public.salt_boy_submit_store_request('埼玉県','さいたま市','__salt_required_test__',null,'123',null,'salt-required-test-20261127');
    raise exception 'TEST_FAILED_invalid_phone';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> '店舗の電話番号を市外局番から入力してください。' then raise; end if;
  end;
end;
$$;
select public.salt_boy_submit_store_request('埼玉県','さいたま市大宮区','__salt_required_test_physical__',null,'０４８－１２３－４５６７','確認用','salt-required-test-20261127');
select public.salt_boy_submit_store_request('オンライン',null,'__salt_required_test_online__',null,null,null,'salt-required-test-20261127');
do $$
declare v_message text;
begin
  begin
    perform public.salt_boy_submit_store_request('埼玉県','さいたま市大宮区','__salt_required_test_physical__',null,'048-123-4567',null,'salt-required-test-20261127');
    raise exception 'TEST_FAILED_duplicate_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'この店舗はすでに追加リクエストされています。' then raise; end if;
  end;
end;
$$;
reset role;
do $$
begin
  if not exists (select 1 from public.store_requests where name='__salt_required_test_physical__' and city='さいたま市大宮区' and comment=E'[SALT BOY]\n店舗電話番号: 048-123-4567\n確認用' and status='pending') then
    raise exception 'TEST_FAILED_physical_saved_details';
  end if;
  if not exists (select 1 from public.store_requests where name='__salt_required_test_online__' and comment='[SALT BOY]' and city is null) then
    raise exception 'TEST_FAILED_online_saved_details';
  end if;
end;
$$;
rollback;

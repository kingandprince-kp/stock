CREATE OR REPLACE FUNCTION public.salt_boy_upsert_sales_day_admin(p_sales_date date, p_sales integer, p_goal integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_inventory_admin() then
    raise exception 'admin only';
  end if;

  if p_sales is not null and p_sales < 0 then
    raise exception 'sales must be zero or greater';
  end if;

  if p_goal is not null and p_goal <= 0 then
    raise exception 'goal must be greater than zero';
  end if;

  insert into public.salt_boy_sales_daily (
    sales_date,
    sales,
    updated_at,
    updated_by
  )
  values (
    p_sales_date,
    p_sales,
    now(),
    auth.uid()
  )
  on conflict (sales_date)
  do update set
    sales = excluded.sales,
    updated_at = now(),
    updated_by = auth.uid();

  update public.salt_boy_sales_tracking_config
  set
    goal = coalesce(p_goal, goal),
    updated_at = now()
  where id = true;
end;
$function$
;
notify pgrst,'reload schema';

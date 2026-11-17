-- Run in a DEVELOPMENT Supabase project's SQL Editor as postgres after migration.
-- All fixtures are rolled back. An assertion failure aborts this transaction.
begin;
insert into auth.users(id,email) values
  ('10000000-0000-4000-8000-000000000001','gather-test-a@example.invalid'),
  ('10000000-0000-4000-8000-000000000002','gather-test-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.save_item('{
  "id":"20000000-0000-4000-8000-000000000001","title":"Private practice","kind":"practice","status":"active","inbox":false,
  "notes":"Only account A should read this","area":"Testing","parent_id":null,"due_on":null,"scheduled_for":null,"review_on":null,"pinned":false,
  "resources":[{"id":"30000000-0000-4000-8000-000000000001","label":"Private link","url":"https://example.com"}],
  "rule":{"frequency":"daily","days":[],"target":30,"unit":"minutes"}
}'::jsonb);
select public.log_practice('20000000-0000-4000-8000-000000000001',10,'40000000-0000-4000-8000-000000000001');
select public.log_practice('20000000-0000-4000-8000-000000000001',10,'40000000-0000-4000-8000-000000000001');
do $$ begin
  if (select sum(amount) from public.practice_logs where item_id='20000000-0000-4000-8000-000000000001') <> 10 then raise exception 'Duplicate request added progress twice'; end if;
end $$;
-- A stale request cannot overshoot the target.
select public.log_practice('20000000-0000-4000-8000-000000000001',100,'40000000-0000-4000-8000-000000000002');
do $$ begin
  if (select sum(amount) from public.practice_logs where item_id='20000000-0000-4000-8000-000000000001') <> 30 then raise exception 'Daily target was exceeded'; end if;
end $$;
update public.items set status='later' where id='20000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ declare t text; visible integer; changed integer; denied boolean := false; begin
  foreach t in array array['items','resources','practice_rules','practice_logs','item_events'] loop
    execute format('select count(*) from public.%I where user_id=''10000000-0000-4000-8000-000000000001''',t) into visible;
    if visible <> 0 then raise exception 'Account B read account A table %',t; end if;
  end loop;
  if exists(select 1 from public.profiles where id='10000000-0000-4000-8000-000000000001') then raise exception 'Account B read account A profile'; end if;
  update public.items set title='Stolen' where id='20000000-0000-4000-8000-000000000001';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Account B changed account A item'; end if;
  delete from public.practice_logs where item_id='20000000-0000-4000-8000-000000000001';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Account B deleted account A log'; end if;
  begin
    insert into public.items(user_id,title) values('10000000-0000-4000-8000-000000000001','Forged owner');
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'Account B inserted data as account A'; end if;
  denied := false;
  begin
    perform public.save_item('{"id":"20000000-0000-4000-8000-000000000001","title":"Hijack","kind":"action","status":"active","inbox":false,"notes":"","area":"","parent_id":null,"due_on":null,"scheduled_for":null,"review_on":null,"pinned":false,"resources":[]}'::jsonb);
  exception when others then denied := true;
  end;
  if not denied then raise exception 'Account B saved over account A item'; end if;
end $$;
reset role;
do $$ begin
  if (select title from public.items where id='20000000-0000-4000-8000-000000000001') <> 'Private practice' then raise exception 'Account A data changed'; end if;
  raise notice 'Ownership, idempotency, and daily target assertions passed.';
end $$;
rollback;

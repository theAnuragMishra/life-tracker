-- Run once in Supabase SQL Editor, or apply with `supabase db push`.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  timezone text not null default 'UTC',
  walkthrough_completed boolean not null default false,
  constraint profile_name_length check (length(name) <= 60)
);
create function public.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id) values(new.id); return new; end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile();
-- Also support auth users created before this migration.
insert into public.profiles(id) select id from auth.users on conflict do nothing;

create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 240),
  kind text check (kind in ('action','practice','goal','interest')),
  status text not null default 'active' check (status in ('active','later','completed','archived')),
  inbox boolean not null default true,
  notes text not null default '' check (length(notes) <= 10000),
  area text not null default '' check (length(area) <= 60),
  parent_id uuid,
  due_on date, scheduled_for date, review_on date, dismissed_on date, reviewed_on date,
  pinned boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id, user_id),
  foreign key (parent_id,user_id) references public.items(id,user_id),
  check (parent_id is null or parent_id <> id),
  check (inbox or kind is not null or status='archived'),
  check (kind is distinct from 'goal' or parent_id is null)
);
create index items_owner_status on public.items(user_id,status);
create index items_parent on public.items(parent_id);
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null,
  label text not null default '' check (length(label) <= 120),
  url text not null check (url ~* '^https?://'),
  foreign key(item_id,user_id) references public.items(id,user_id) on delete cascade
);
create index resources_item on public.resources(user_id,item_id);
create table public.practice_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null,
  effective_from date not null,
  frequency text not null check (frequency in ('daily','selected','weekly','flexible')),
  days integer[] not null default '{}',
  target numeric not null check (target > 0 and target <= 100000),
  unit text not null check (length(trim(unit)) between 1 and 40),
  unique(item_id,effective_from),
  foreign key(item_id,user_id) references public.items(id,user_id) on delete cascade,
  check (days <@ array[0,1,2,3,4,5,6]),
  check (frequency <> 'selected' or cardinality(days) > 0),
  check (frequency <> 'weekly' or (target <= 7 and target = trunc(target)))
);
create index practice_rules_owner on public.practice_rules(user_id,item_id);
create table public.practice_logs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null,
  local_date date not null,
  amount numeric not null check (amount > 0 and amount <= 100000),
  created_at timestamptz not null default now(),
  foreign key(item_id,user_id) references public.items(id,user_id) on delete cascade
);
create index practice_logs_period on public.practice_logs(user_id,item_id,local_date);
create table public.item_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null,
  event text not null,
  created_at timestamptz not null default now(),
  foreign key(item_id,user_id) references public.items(id,user_id) on delete cascade
);
create index item_events_owner on public.item_events(user_id,item_id);

-- All access is scoped to the authenticated owner, including related tables.
alter table public.profiles enable row level security;
create policy "Read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "Update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
do $$ declare t text; begin
  foreach t in array array['items','resources','practice_rules','practice_logs','item_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy "Owner access" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',t);
  end loop;
end $$;
-- Explicit grants; no table access for anonymous users.
revoke all on public.profiles, public.items, public.resources, public.practice_rules, public.practice_logs, public.item_events from anon;
grant select,update on public.profiles to authenticated;
grant select,insert,update,delete on public.items, public.resources, public.practice_rules, public.practice_logs, public.item_events to authenticated;

create function public.validate_item() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.parent_id is not null and not exists(select 1 from public.items where id=new.parent_id and user_id=new.user_id and kind='goal') then
    raise exception 'Choose one of your goals as the parent.';
  end if;
  if tg_op='UPDATE' then
    if old.kind='goal' and new.kind is distinct from 'goal' and exists(select 1 from public.items where parent_id=new.id) then raise exception 'Move the linked items before changing this goal into another kind.'; end if;
    new.updated_at := now();
    if old.status is distinct from new.status then
      insert into public.item_events(user_id,item_id,event) values(new.user_id,new.id,'status:' || new.status);
    end if;
  end if;
  return new;
end $$;
create trigger validate_item before insert or update on public.items for each row execute function public.validate_item();

-- A single transaction saves an item, resources, and its dated practice rule.
create function public.save_item(p_item jsonb) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := (p_item->>'id')::uuid;
  v_today date;
  r jsonb;
  v_rule public.practice_rules;
begin
  if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
  select (now() at time zone timezone)::date into v_today from public.profiles where id=auth.uid();
  insert into public.items(id,user_id,title,kind,status,inbox,notes,area,parent_id,due_on,scheduled_for,review_on,pinned)
  values(v_id,auth.uid(),p_item->>'title',p_item->>'kind',p_item->>'status',(p_item->>'inbox')::boolean,p_item->>'notes',p_item->>'area',(p_item->>'parent_id')::uuid,(p_item->>'due_on')::date,(p_item->>'scheduled_for')::date,(p_item->>'review_on')::date,(p_item->>'pinned')::boolean)
  on conflict(id) do update set title=excluded.title,kind=excluded.kind,status=excluded.status,inbox=excluded.inbox,notes=excluded.notes,area=excluded.area,parent_id=excluded.parent_id,due_on=excluded.due_on,scheduled_for=excluded.scheduled_for,review_on=excluded.review_on,pinned=excluded.pinned
  where public.items.user_id=auth.uid();
  if not found then raise exception 'Item unavailable.'; end if;
  delete from public.resources where item_id=v_id;
  for r in select * from jsonb_array_elements(p_item->'resources') loop
    insert into public.resources(id,item_id,user_id,label,url) values((r->>'id')::uuid,v_id,auth.uid(),r->>'label',r->>'url');
  end loop;
  if p_item->>'kind'='practice' then
    r := p_item->'rule';
    select * into v_rule from public.practice_rules where item_id=v_id and effective_from <= v_today order by effective_from desc limit 1;
    if v_rule.id is null or v_rule.frequency is distinct from r->>'frequency' or v_rule.target is distinct from (r->>'target')::numeric or v_rule.unit is distinct from r->>'unit' or v_rule.days is distinct from array(select jsonb_array_elements_text(r->'days')::int) then
      insert into public.practice_rules(item_id,user_id,effective_from,frequency,days,target,unit)
      values(v_id,auth.uid(),v_today,r->>'frequency',array(select jsonb_array_elements_text(r->'days')::int),(r->>'target')::numeric,r->>'unit')
      on conflict(item_id,effective_from) do update set frequency=excluded.frequency,days=excluded.days,target=excluded.target,unit=excluded.unit;
    end if;
  end if;
  return v_id;
end $$;

-- Idempotent check-ins; concurrent taps cannot overshoot a daily target.
create function public.log_practice(p_item_id uuid,p_amount numeric,p_request_id uuid) returns void language plpgsql security invoker set search_path = '' as $$
declare v_today date; v_rule public.practice_rules; v_amount numeric; v_total numeric;
begin
  if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || p_item_id::text,0));
  if exists(select 1 from public.practice_logs where id=p_request_id) then return; end if;
  if not exists(select 1 from public.items where id=p_item_id and user_id=auth.uid() and kind='practice' and status='active' and not inbox) then raise exception 'This practice is not active.'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000 then raise exception 'Enter a positive amount.'; end if;
  select (now() at time zone timezone)::date into v_today from public.profiles where id=auth.uid();
  select * into v_rule from public.practice_rules where item_id=p_item_id and effective_from<=v_today order by effective_from desc limit 1;
  if v_rule.id is null then raise exception 'Add a rhythm first.'; end if;
  select coalesce(sum(amount),0) into v_total from public.practice_logs where item_id=p_item_id and local_date=v_today;
  if v_rule.frequency='weekly' then
    if v_total > 0 then return; end if;
    v_amount := 1;
  else
    v_amount := least(p_amount,v_rule.target-v_total);
  end if;
  if v_amount > 0 then insert into public.practice_logs(id,item_id,user_id,local_date,amount) values(p_request_id,p_item_id,auth.uid(),v_today,v_amount); end if;
end $$;
revoke all on function public.save_item(jsonb) from public,anon;
revoke all on function public.log_practice(uuid,numeric,uuid) from public,anon;
grant execute on function public.save_item(jsonb) to authenticated;
grant execute on function public.log_practice(uuid,numeric,uuid) to authenticated;

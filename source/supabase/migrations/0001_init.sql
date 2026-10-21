-- MiniDSP initial schema. Stores scan metadata + masked, aggregated findings only (never raw content).

create table public.scans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  file_name      text not null check (char_length(file_name) between 1 and 255),
  size_bytes     integer not null check (size_bytes between 1 and 1048576),
  file_risk      text not null check (file_risk in ('None', 'Low', 'Medium', 'High', 'Critical')),
  total_findings integer not null default 0 check (total_findings >= 0),
  created_at     timestamptz not null default now(),
  unique (id, user_id)
);

create table public.findings (
  id             uuid primary key default gen_random_uuid(),
  scan_id        uuid not null,
  user_id        uuid not null default auth.uid(),
  type           text not null check (type in ('email', 'uk_phone', 'uk_nino', 'payment_card')),
  risk           text not null check (risk in ('Low', 'Medium', 'High', 'Critical')),
  count          integer not null check (count > 0),
  masked_example text not null check (
    char_length(masked_example) <= 64
    and position('*' in masked_example) > 0
    and masked_example !~ '[0-9]{5,}'
  ),
  unique (scan_id, type),
  constraint findings_risk_matches_type check (
    (type = 'email' and risk = 'Low')
    or (type = 'uk_phone' and risk = 'Medium')
    or (type = 'uk_nino' and risk = 'High')
    or (type = 'payment_card' and risk = 'Critical')
  ),
  -- Composite FK: a finding can only reference a scan owned by the same user.
  foreign key (scan_id, user_id) references public.scans (id, user_id) on delete cascade
);

create index scans_user_created_idx on public.scans (user_id, created_at desc);
create index findings_scan_user_idx on public.findings (scan_id, user_id);

alter table public.scans enable row level security;
alter table public.scans force row level security;
alter table public.findings enable row level security;
alter table public.findings force row level security;

revoke all on public.scans, public.findings from anon;
revoke all on public.scans, public.findings from authenticated;
grant select, insert, delete on public.scans, public.findings to authenticated;

create policy scans_select_own on public.scans for select to authenticated using (user_id = auth.uid());
create policy scans_insert_own on public.scans for insert to authenticated with check (user_id = auth.uid());
create policy scans_delete_own on public.scans for delete to authenticated using (user_id = auth.uid());

create policy findings_select_own on public.findings for select to authenticated using (user_id = auth.uid());
create policy findings_insert_own on public.findings for insert to authenticated with check (user_id = auth.uid());
create policy findings_delete_own on public.findings for delete to authenticated using (user_id = auth.uid());
-- No UPDATE policies or grants: records are immutable.

-- Atomic save: runs as the caller (RLS applies); any error aborts the whole call.
create or replace function public.save_scan(
  p_file_name  text,
  p_size_bytes integer,
  p_file_risk  text,
  p_findings   jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_scan_id  uuid;
  v_total    integer;
  v_expected text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_findings is null or jsonb_typeof(p_findings) <> 'array' then
    raise exception 'findings must be a JSON array' using errcode = '22023';
  end if;

  select coalesce(sum((f ->> 'count')::integer), 0),
         case max(case f ->> 'risk' when 'Low' then 1 when 'Medium' then 2 when 'High' then 3 when 'Critical' then 4 end)
           when 1 then 'Low' when 2 then 'Medium' when 3 then 'High' when 4 then 'Critical' else 'None'
         end
    into v_total, v_expected
  from jsonb_array_elements(p_findings) as f;

  if p_file_risk is distinct from v_expected then
    raise exception 'file_risk does not match findings' using errcode = '22023';
  end if;

  -- Duplicate types are rejected by unique (scan_id, type) on the findings insert below.

  insert into public.scans (user_id, file_name, size_bytes, file_risk, total_findings)
  values (auth.uid(), p_file_name, p_size_bytes, p_file_risk, v_total)
  returning id into v_scan_id;

  insert into public.findings (scan_id, user_id, type, risk, count, masked_example)
  select v_scan_id, auth.uid(), f ->> 'type', f ->> 'risk', (f ->> 'count')::integer, f ->> 'masked_example'
  from jsonb_array_elements(p_findings) as f;

  return v_scan_id;
end;
$$;

revoke all on function public.save_scan(text, integer, text, jsonb) from public;
revoke all on function public.save_scan(text, integer, text, jsonb) from anon;
grant execute on function public.save_scan(text, integer, text, jsonb) to authenticated;

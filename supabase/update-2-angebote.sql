-- Update 2: Angebote (Hypnosetherapie, Coaching, Erstgespräch) mit Dauer und Preis
-- Im Supabase SQL Editor ausführen (nur einmal nötig, wenn schema.sql schon ausgeführt wurde).

alter table settings add column if not exists services jsonb not null default
  '[{"id":"hypnose","name":"Hypnosetherapie","minutes":60,"price":125},{"id":"coaching","name":"Coaching","minutes":60,"price":110},{"id":"erstgespraech","name":"Erstgespräch","minutes":30,"price":0}]';
alter table appointments add column if not exists service text not null default '';

create or replace function public_config() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('hours', hours, 'minutes', session_minutes, 'price', session_price,
                            'lead_days', lead_days, 'weeks', booking_weeks, 'services', services)
  from settings where id = 1
$$;

drop function if exists book_slot(timestamptz, text, text, text, text);
create or replace function book_slot(p_start timestamptz, p_name text, p_email text, p_phone text, p_topic text, p_service text default '')
returns jsonb
language plpgsql security definer set search_path = public as $$
declare s settings; loc timestamp; dow text; t text; ok boolean; svc jsonb; mins int;
begin
  select * into s from settings where id = 1;
  if length(trim(coalesce(p_name,''))) < 2 or length(p_name) > 120 then return jsonb_build_object('ok', false, 'error', 'name'); end if;
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 200 then return jsonb_build_object('ok', false, 'error', 'email'); end if;
  if length(coalesce(p_phone,'')) > 40 or length(coalesce(p_topic,'')) > 120 then return jsonb_build_object('ok', false, 'error', 'input'); end if;
  mins := s.session_minutes;
  if coalesce(p_service,'') <> '' then
    select e into svc from jsonb_array_elements(s.services) e where e ->> 'id' = p_service limit 1;
    if svc is null then return jsonb_build_object('ok', false, 'error', 'service'); end if;
    mins := coalesce((svc ->> 'minutes')::int, mins);
  end if;
  loc := p_start at time zone 'Europe/Zurich';
  dow := extract(dow from loc)::int::text;
  t := to_char(loc, 'HH24:MI');
  ok := coalesce(s.hours -> dow, '[]'::jsonb) ? t;
  if not ok then return jsonb_build_object('ok', false, 'error', 'closed'); end if;
  if p_start < now() + make_interval(days => s.lead_days) or p_start > now() + make_interval(weeks => s.booking_weeks) then
    return jsonb_build_object('ok', false, 'error', 'range'); end if;
  begin
    insert into appointments (starts_at, minutes, status, guest_name, guest_email, guest_phone, topic, service, source)
    values (p_start, mins, 'angefragt', trim(p_name), trim(p_email), trim(coalesce(p_phone,'')), trim(coalesce(p_topic,'')), coalesce(p_service,''), 'website');
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'taken');
  end;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function book_slot(timestamptz,text,text,text,text,text) from public;
grant execute on function book_slot(timestamptz,text,text,text,text,text) to anon, authenticated;

-- Praxis Soleil: Datenbank-Schema für Supabase
-- Einmal im Supabase-Dashboard unter "SQL Editor" ausführen.


-- ---------- Einstellungen (genau eine Zeile) ----------
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  owner_email text not null default 'marianne.kaeser@bluewin.ch',
  practice text not null default 'Praxis Soleil',
  person text not null default 'Marianne Kaeser',
  street text not null default 'Kleinschönberg 109',
  zip text not null default '1700',
  city text not null default 'Freiburg',
  phone text not null default '079 217 41 67',
  email text not null default 'marianne.kaeser@bluewin.ch',
  iban text not null default '',
  session_minutes int not null default 60,
  session_price numeric(10,2) not null default 125,
  lead_days int not null default 2,
  booking_weeks int not null default 12,
  payment_days int not null default 30,
  invoice_note text not null default 'Vielen Dank für Ihr Vertrauen.',
  next_invoice_no int not null default 1,
  -- Wochentag (0=So … 5=Fr, 6=Sa) -> Startzeiten lokal (Europe/Zurich)
  hours jsonb not null default '{"5":["13:00","14:00","15:00","16:00"],"6":["08:00","09:00","10:00","11:00"]}'
);
insert into settings (id) values (1) on conflict do nothing;

-- Wer ist die Inhaberin? Nur sie darf alles sehen und ändern.
create or replace function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'email', '') = (select owner_email from settings where id = 1)
$$;

-- ---------- Kundinnen und Kunden ----------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  phone text not null default '',
  street text not null default '',
  zip text not null default '',
  city text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- Termine ----------
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  minutes int not null default 60,
  status text not null default 'angefragt' check (status in ('angefragt','bestaetigt','abgesagt','erledigt')),
  customer_id uuid references customers(id) on delete set null,
  guest_name text not null default '',
  guest_email text not null default '',
  guest_phone text not null default '',
  topic text not null default '',
  note text not null default '',
  source text not null default 'admin',
  created_at timestamptz not null default now()
);
-- Ein Zeitpunkt kann nur einmal vergeben sein (abgesagte Termine geben ihn wieder frei).
create unique index if not exists appointments_slot_unique on appointments (starts_at) where status <> 'abgesagt';

-- ---------- Rechnungen ----------
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  customer_id uuid references customers(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  issued_on date not null default current_date,
  due_on date not null,
  items jsonb not null default '[]',
  total numeric(10,2) not null default 0,
  status text not null default 'offen' check (status in ('offen','bezahlt','storniert')),
  paid_on date,
  created_at timestamptz not null default now()
);

-- ---------- Sicherheit (Row Level Security) ----------
alter table settings enable row level security;
alter table customers enable row level security;
alter table appointments enable row level security;
alter table invoices enable row level security;

create policy owner_all on settings for all to authenticated using (is_owner()) with check (is_owner());
create policy owner_all on customers for all to authenticated using (is_owner()) with check (is_owner());
create policy owner_all on appointments for all to authenticated using (is_owner()) with check (is_owner());
create policy owner_all on invoices for all to authenticated using (is_owner()) with check (is_owner());
-- Besucher der Website (anon) haben KEINEN direkten Tabellenzugriff, nur die zwei Funktionen unten.

-- ---------- Öffentliche Funktionen für die Website ----------
-- Sprechzeiten und Rahmendaten (ohne persönliche Daten)
create or replace function public_config() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('hours', hours, 'minutes', session_minutes, 'price', session_price,
                            'lead_days', lead_days, 'weeks', booking_weeks)
  from settings where id = 1
$$;

-- Bereits vergebene Zeitpunkte (nur Zeit, keine Namen)
create or replace function taken_slots(from_ts timestamptz, to_ts timestamptz) returns setof timestamptz
language sql stable security definer set search_path = public as $$
  select starts_at from appointments
  where status <> 'abgesagt' and starts_at >= from_ts and starts_at < to_ts
$$;

-- Termin anfragen: prüft Sprechzeit, Vorlauf und ob die Zeit noch frei ist
create or replace function book_slot(p_start timestamptz, p_name text, p_email text, p_phone text, p_topic text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare s settings; loc timestamp; dow text; t text; ok boolean;
begin
  select * into s from settings where id = 1;
  if length(trim(coalesce(p_name,''))) < 2 or length(p_name) > 120 then return jsonb_build_object('ok', false, 'error', 'name'); end if;
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 200 then return jsonb_build_object('ok', false, 'error', 'email'); end if;
  if length(coalesce(p_phone,'')) > 40 or length(coalesce(p_topic,'')) > 120 then return jsonb_build_object('ok', false, 'error', 'input'); end if;
  loc := p_start at time zone 'Europe/Zurich';
  dow := extract(dow from loc)::int::text;
  t := to_char(loc, 'HH24:MI');
  ok := coalesce(s.hours -> dow, '[]'::jsonb) ? t;
  if not ok then return jsonb_build_object('ok', false, 'error', 'closed'); end if;
  if p_start < now() + make_interval(days => s.lead_days) or p_start > now() + make_interval(weeks => s.booking_weeks) then
    return jsonb_build_object('ok', false, 'error', 'range'); end if;
  begin
    insert into appointments (starts_at, minutes, status, guest_name, guest_email, guest_phone, topic, source)
    values (p_start, s.session_minutes, 'angefragt', trim(p_name), trim(p_email), trim(coalesce(p_phone,'')), trim(coalesce(p_topic,'')), 'website');
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'taken');
  end;
  return jsonb_build_object('ok', true);
end $$;

-- Nächste Rechnungsnummer (nur Inhaberin)
create or replace function next_invoice_number() returns text
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_owner() then raise exception 'not allowed'; end if;
  update settings set next_invoice_no = next_invoice_no + 1 where id = 1 returning next_invoice_no - 1 into n;
  return to_char(current_date, 'YYYY') || '-' || lpad(n::text, 3, '0');
end $$;

revoke all on function public_config(), taken_slots(timestamptz, timestamptz), book_slot(timestamptz,text,text,text,text), next_invoice_number() from public;
grant execute on function public_config(), taken_slots(timestamptz, timestamptz), book_slot(timestamptz,text,text,text,text) to anon, authenticated;
grant execute on function next_invoice_number() to authenticated;
revoke execute on function next_invoice_number() from anon;
grant select, insert, update, delete on settings, customers, appointments, invoices to authenticated;

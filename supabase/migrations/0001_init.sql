-- ZST Beauty Center : réservation et gestion (v2, v3).
-- À exécuter dans Supabase (SQL editor) sur un projet en région UE (Francfort ou Paris).
-- Le site lit et écrit avec la clé « service_role » côté serveur uniquement : aucune politique publique.
-- La sécurité au niveau des lignes (RLS) est activée partout : sans politique, la clé publique n'accède à rien.

create table if not exists categories (
  id text primary key, slug text unique not null, name text not null, tagline text, position int default 0
);

create table if not exists services (
  id text primary key,
  category_id text,
  name text not null,
  description text,
  duration_min int not null check (duration_min > 0),
  price_xof int,                 -- francs CFA (XOF) ; null = prix non affiché
  active boolean not null default true
);

create table if not exists staff (
  id text primary key, name text not null, category_ids text[] not null default '{}', active boolean not null default true
);

create table if not exists opening_hours (
  weekday int primary key check (weekday between 1 and 7),  -- 1 = lundi
  label text not null, opens text, closes text               -- « 09:00 », null = fermé
);

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb
);

create table if not exists clients (
  id uuid primary key,
  name text not null, phone text not null, email text,
  notes text not null default '',
  consent_reminders boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists clients_phone_idx on clients (phone);
create index if not exists clients_email_idx on clients (lower(email));

create table if not exists bookings (
  id uuid primary key,
  token text unique not null,
  service_id text not null references services(id),
  staff_id text references staff(id),
  client_id uuid not null references clients(id) on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled','done','noshow')),
  source text not null default 'site' check (source in ('site','admin')),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists bookings_starts_idx on bookings (starts_at);

create table if not exists notifications (
  id uuid primary key,
  booking_id uuid not null references bookings(id) on delete cascade,
  type text not null check (type in ('confirmation','reminder_d1','reminder_h2','salon_new','salon_cancel','thanks')),
  channel text not null default 'email' check (channel in ('email','sms')),
  send_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  sent_at timestamptz, error text
);
create index if not exists notifications_due_idx on notifications (status, send_at);

alter table categories enable row level security;
alter table services enable row level security;
alter table staff enable row level security;
alter table opening_hours enable row level security;
alter table settings enable row level security;
alter table clients enable row level security;
alter table bookings enable row level security;
alter table notifications enable row level security;
-- Lecture publique du catalogue (affichage de la carte) : seulement les prestations actives.
create policy "carte publique" on services for select using (active);
create policy "catégories publiques" on categories for select using (true);
create policy "horaires publics" on opening_hours for select using (true);

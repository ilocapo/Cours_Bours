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
drop policy if exists "carte publique" on services;
drop policy if exists "catégories publiques" on categories;
drop policy if exists "horaires publics" on opening_hours;
create policy "carte publique" on services for select using (active);
create policy "catégories publiques" on categories for select using (true);
create policy "horaires publics" on opening_hours for select using (true);

-- ---------------------------------------------------------------------------
-- Données de départ (carte d'exemple, sans prix : à compléter dans /admin > Prestations).
-- Peut être relancé sans danger : les lignes existantes ne sont pas écrasées.
insert into categories (id, slug, name, tagline, position) values
  ('cat-coiffure', 'coiffure', 'Coiffure', 'Femme, homme, enfant', 1),
  ('cat-spa', 'spa', 'Spa', 'Massage · soins du corps', 2),
  ('cat-ongles', 'ongles', 'Ongles', 'Manucure · pédicure · gel', 3),
  ('cat-esthetique', 'esthetique', 'Esthétique', 'Visage · épilation · maquillage', 4)
on conflict (id) do nothing;

insert into services (id, category_id, name, duration_min, price_xof, active) values
  ('tresses-boheme', 'cat-coiffure', 'Tresses bohème', 240, null, true),
  ('knotless', 'cat-coiffure', 'Knotless braids', 300, null, true),
  ('nattes-collees', 'cat-coiffure', 'Nattes collées', 150, null, true),
  ('vanilles', 'cat-coiffure', 'Vanilles et twists', 180, null, true),
  ('tissage', 'cat-coiffure', 'Pose de tissage', 150, null, true),
  ('perruque', 'cat-coiffure', 'Pose de perruque', 60, null, true),
  ('brushing', 'cat-coiffure', 'Brushing', 45, null, true),
  ('boucles', 'cat-coiffure', 'Boucles définies', 90, null, true),
  ('soin-profond', 'cat-coiffure', 'Soin profond', 60, null, true),
  ('coupe-femme', 'cat-coiffure', 'Coupe femme', 60, null, true),
  ('coupe-homme', 'cat-coiffure', 'Coupe homme', 45, null, true),
  ('coiffure-enfant', 'cat-coiffure', 'Coiffure enfant', 90, null, true),
  ('massage-relaxant', 'cat-spa', 'Massage relaxant', 60, null, true),
  ('massage-galets', 'cat-spa', 'Massage aux galets', 75, null, true),
  ('massage-dos', 'cat-spa', 'Massage du dos', 30, null, true),
  ('gommage', 'cat-spa', 'Gommage corps', 45, null, true),
  ('enveloppement', 'cat-spa', 'Enveloppement hydratant', 60, null, true),
  ('soin-pieds', 'cat-spa', 'Soin des pieds', 45, null, true),
  ('manucure', 'cat-ongles', 'Manucure', 45, null, true),
  ('pedicure', 'cat-ongles', 'Pédicure', 60, null, true),
  ('vernis-semi', 'cat-ongles', 'Vernis semi-permanent', 60, null, true),
  ('french', 'cat-ongles', 'French', 75, null, true),
  ('pose-gel', 'cat-ongles', 'Pose gel', 90, null, true),
  ('capsules', 'cat-ongles', 'Pose de capsules', 90, null, true),
  ('nail-art', 'cat-ongles', 'Nail art', 30, null, true),
  ('depose', 'cat-ongles', 'Dépose', 30, null, true),
  ('soin-visage', 'cat-esthetique', 'Soin visage éclat', 60, null, true),
  ('nettoyage-peau', 'cat-esthetique', 'Nettoyage de peau', 75, null, true),
  ('epilation-sourcils', 'cat-esthetique', 'Épilation des sourcils', 20, null, true),
  ('epilation-corps', 'cat-esthetique', 'Épilation jambes et corps', 45, null, true),
  ('teinture-sourcils', 'cat-esthetique', 'Teinture des sourcils', 30, null, true),
  ('rehaussement-cils', 'cat-esthetique', 'Rehaussement de cils', 60, null, true),
  ('maquillage-jour', 'cat-esthetique', 'Maquillage de jour', 45, null, true),
  ('maquillage-soiree', 'cat-esthetique', 'Maquillage de soirée', 60, null, true),
  ('mise-en-beaute', 'cat-esthetique', 'Mise en beauté mariée', 120, null, true)
on conflict (id) do nothing;

insert into opening_hours (weekday, label, opens, closes) values
  (1, 'Lundi', '09:00', '20:00'),
  (2, 'Mardi', '09:00', '20:00'),
  (3, 'Mercredi', '09:00', '20:00'),
  (4, 'Jeudi', '09:00', '20:00'),
  (5, 'Vendredi', '09:00', '20:00'),
  (6, 'Samedi', '09:00', '20:00'),
  (7, 'Dimanche', '15:00', '20:00')
on conflict (weekday) do nothing;

insert into settings (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;

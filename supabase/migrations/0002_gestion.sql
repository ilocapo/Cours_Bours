-- ZST Beauty Center : gestion complète (utilisateurs et rôles, planning d'équipe, factures, canaux de réservation).
-- À exécuter dans Supabase > SQL Editor > Run, APRÈS 0001_init.sql. Relançable sans danger.

-- Équipe : prestations assignées, planning hebdomadaire, couleur
alter table staff add column if not exists service_ids text[] not null default '{}';
alter table staff add column if not exists schedule jsonb;
alter table staff add column if not exists color text not null default '#1C1013';

-- Réservations : canal d'origine (site, Instagram, WhatsApp, téléphone, au salon)
alter table bookings drop constraint if exists bookings_source_check;
alter table bookings add constraint bookings_source_check
  check (source in ('site','admin','instagram','whatsapp','telephone','comptoir'));

-- Utilisateurs de l'espace de gestion
create table if not exists users (
  id uuid primary key,
  email text unique not null,
  name text not null,
  role text not null check (role in ('super_admin','gerant','employe','comptable')),
  password_hash text not null,
  staff_id text references staff(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Factures
create table if not exists invoices (
  id uuid primary key,
  number text unique not null,
  token text unique not null,
  booking_id uuid references bookings(id) on delete set null,
  client_id uuid not null references clients(id) on delete cascade,
  staff_id text references staff(id) on delete set null,
  issued_at timestamptz not null default now(),
  lines jsonb not null default '[]'::jsonb,
  discount_xof int not null default 0,
  total_xof int not null default 0,
  paid_xof int not null default 0,
  method text check (method in ('especes','mtn_momo','moov_money','carte','virement','autre')),
  paid_at timestamptz,
  status text not null default 'due' check (status in ('due','partial','paid','void')),
  note text not null default '',
  sent_at timestamptz,
  created_by text
);
create index if not exists invoices_issued_idx on invoices (issued_at);
create index if not exists invoices_booking_idx on invoices (booking_id);

alter table users enable row level security;
alter table invoices enable row level security;

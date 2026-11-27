-- ZST Beauty Center : pointage des employées, absences, nouveaux e-mails.
-- À exécuter dans Supabase > SQL Editor > Run, APRÈS 0002. Relançable sans danger.

-- Pointage : code personnel haché + protection contre les essais répétés
alter table staff add column if not exists pin_hash text;
alter table staff add column if not exists pin_fails int not null default 0;
alter table staff add column if not exists pin_locked_until timestamptz;

create table if not exists time_entries (
  id uuid primary key,
  staff_id text not null references staff(id) on delete cascade,
  in_at timestamptz not null,
  out_at timestamptz,
  method text not null default 'pin' check (method in ('pin','manual')),
  note text not null default ''
);
create index if not exists time_entries_in_idx on time_entries (in_at);

create table if not exists absences (
  id uuid primary key,
  staff_id text not null references staff(id) on delete cascade,
  from_date text not null,
  to_date text not null,
  kind text not null default 'conge' check (kind in ('conge','maladie','autre')),
  status text not null default 'demande' check (status in ('demande','approuvee','refusee')),
  note text not null default '',
  created_at timestamptz not null default now()
);

-- Nouveaux e-mails : annulation envoyée à la cliente, suivi d'absence
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('confirmation','reminder_d1','reminder_h2','salon_new','salon_cancel','thanks','client_cancel','noshow'));

alter table time_entries enable row level security;
alter table absences enable row level security;

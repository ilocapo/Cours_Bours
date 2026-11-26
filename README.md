# ZST Beauty Center

Site vitrine (v1), réservation en ligne (v2) et espace de gestion (v3). Next.js (App Router, TypeScript), GSAP, Lenis.
Cahier des charges : `CLAUDE.md`.

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Réservation et gestion

- Données : `src/data/*.ts` (catalogue d'exemple) puis la base. Interface unique `src/lib/booking/store.ts`,
  deux implémentations : fichier local `.data/store.json` (développement, tests) et Supabase (production).
- Base : exécuter `supabase/migrations/0001_init.sql` dans un projet Supabase en région UE, puis renseigner
  `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`. La clé `service_role` reste côté serveur.
- E-mails : Resend (`RESEND_API_KEY`, `RESEND_FROM` sur un domaine vérifié). Sans clé en développement, les messages
  sont écrits dans `.data/outbox.json`.
- Activer la réservation sur le site : `NEXT_PUBLIC_BOOKING_INTERNAL=1`. Tant que ce n'est pas le cas, les boutons
  « Réserver » ouvrent WhatsApp.
- Gestion : `/admin` (mot de passe `ADMIN_PASSWORD`). Agenda, réservations, clients, prestations et tarifs, équipe,
  rappels, réglages (horaires, délais).
- Rappels : la tâche `GET /api/cron/reminders` (en-tête `Authorization: Bearer $CRON_SECRET`) envoie ce qui est dû.
  À appeler toutes les 15 minutes. Vercel Hobby n'autorise qu'une exécution par jour : utiliser Vercel Pro
  (`vercel.json` avec `"crons"`), ou un service gratuit comme cron-job.org, ou Supabase `pg_cron`.

## Tests

```bash
npm run test:e2e           # site vitrine (ancienne structure, à mettre à jour)
npm run test:e2e:booking   # réservation en ligne + gestion (isolés, base fichier)
```
